const fs = require('fs');
const path = require('path');
const util = require('util');
const { pipeline } = require('stream');

const db = require('../db');
const {
    calculateNextPlanDate,
    calculateSkippedPlanDate,
    clearPlanRuntimeState,
    normalizePlanPayload,
} = require('../services/planService');
const { sendEmail } = require('../services/emailService');
const {
    deactivatePlan,
    deletePendingAlertsByPlanId,
    getPlanById,
    getPlanHistory: getPlanHistoryByPlanId,
    getPlanWithAssetName,
    getUserFullName,
    insertHistory,
    insertPlan,
    updatePendingAlertsSchedule,
    updatePlan: updatePlanRecord,
    updatePlanCompletion,
    updatePlanDueDate,
    upsertPlanException,
} = require('../repositories/planRepository');
const { processPartConsumptions } = require('../utils/inventory_helper');
const {
    ensureBoolean,
    ensureConsumedParts,
    ensureDateOnlyString,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

// POST /admin/plans
exports.createPlan = async (request, reply) => {
    try {
        ensureObject(request.body, 'plan');
        return insertPlan(db, normalizePlanPayload(request.body));
    } catch (error) {
        return sendValidationError(reply, error);
    }
};

// PUT /admin/plans/:id
exports.updatePlan = async (request, reply) => {
    try {
        const planId = ensurePositiveInteger(request.params.id, 'id');
        ensureObject(request.body, 'plan');
        const normalizedPlan = normalizePlanPayload(request.body);
        return updatePlanRecord(db, planId, normalizedPlan);
    } catch (error) {
        return sendValidationError(reply, error);
    }
};

// DELETE /admin/plans/:id
exports.deletePlan = async (request, reply) => {
    try {
        const planId = ensurePositiveInteger(request.params.id, 'id');
        await deactivatePlan(db, planId);
        await deletePendingAlertsByPlanId(db, planId);
        return { success: true };
    } catch (error) {
        return sendValidationError(reply, error);
    }
};

// PUT /admin/maintenance-plans/:id/reschedule
exports.reschedulePlan = async (request, reply) => {
    let newDate;
    let id;
    try {
        const body = ensureObject(request.body, 'reprogramacion');
        newDate = ensureDateOnlyString(body.new_date, 'new_date');
        id = ensurePositiveInteger(request.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await updatePlanDueDate(client, id, newDate);
        await updatePendingAlertsSchedule(client, id, newDate);
        await client.query('COMMIT');
        return { success: true, new_date: newDate };
    } catch (error) {
        await client.query('ROLLBACK');
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

// POST /admin/maintenance-plans/:id/exception
exports.createException = async (request, reply) => {
    let id;
    let originalDate;
    let newDate;
    try {
        const body = ensureObject(request.body, 'exception');
        id = ensurePositiveInteger(request.params.id, 'id');
        originalDate = ensureDateOnlyString(body.original_date, 'original_date');
        newDate = ensureDateOnlyString(body.new_date, 'new_date');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    try {
        await upsertPlanException(db, id, originalDate, newDate);
        return { success: true, original_date: originalDate, new_date: newDate };
    } catch (error) {
        console.error('Error creating exception:', error);
        return reply.code(500).send({ error: error.message });
    }
};

// POST /admin/maintenance-plans/:id/skip
exports.skipPlan = async (request, reply) => {
    let id;
    try {
        id = ensurePositiveInteger(request.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const plan = await getPlanById(client, id);
        if (!plan) throw new Error('Plan Not Found');

        const newDate = calculateSkippedPlanDate(plan);
        await updatePlanDueDate(client, id, newDate);
        await deletePendingAlertsByPlanId(client, id);

        await client.query('COMMIT');
        return { success: true, new_date: newDate };
    } catch (error) {
        await client.query('ROLLBACK');
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

async function sendPreventiveAlert(plan, operatorId, alertContext) {
    const operatorLabel = operatorId ? `${alertContext.operatorName || 'Desconocido'} (ID: ${operatorId})` : 'Desconocido';

    await sendEmail({
        senderName: 'GMAO Alert',
        subject: `Alerta - Activo: ${plan.asset_name}`,
        html: `
            <h3>Incidencia durante mantenimiento preventivo</h3>
            <p><strong>Plan:</strong> ${plan.task_description}</p>
            <p><strong>Operario:</strong> ${operatorLabel}</p>
            <p><strong>Notas:</strong> ${alertContext.text}</p>
            <hr>
            <p>Se ha marcado la campana de alerta durante la ejecucion.</p>
        `,
    });
}

// POST /admin/maintenance-plans/:id/complete
exports.completePlan = async (request, reply) => {
    let id;
    let operatorId;
    let notes;
    let alert;
    let documentPath;
    let consumedParts;
    try {
        const body = ensureObject(request.body, 'completePlan');
        id = ensurePositiveInteger(request.params.id, 'id');
        operatorId = ensurePositiveInteger(body.operator_id, 'operator_id', { required: false });
        notes = ensureString(body.notes, 'notes', { required: false, allowEmpty: true, maxLength: 4000 });
        alert = ensureBoolean(body.alert, 'alert', { defaultValue: false });
        documentPath = ensureString(body.document_path, 'document_path', { required: false, allowEmpty: true, maxLength: 2000 });
        consumedParts = ensureConsumedParts(body.consumed_parts);
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const plan = await getPlanWithAssetName(client, id);
        if (!plan) throw new Error('Plan Not Found');

        const historyId = await insertHistory(client, {
            planId: id,
            assetId: plan.asset_id,
            operatorId: operatorId || null,
            notes: notes || 'Completado desde App',
            documentPath: documentPath || null,
        });

        if (consumedParts.length > 0) {
            await processPartConsumptions(client, consumedParts, { history_id: historyId });
        }

        if (alert) {
            try {
                const operatorName = operatorId ? await getUserFullName(client, operatorId) : null;
                await sendPreventiveAlert(plan, operatorId, {
                    operatorName,
                    text: notes || '',
                });
                console.log('Preventive alert email sent.');
            } catch (emailError) {
                console.error('Preventive alert email failed:', emailError);
            }
        }

        const nextDate = calculateNextPlanDate(plan);
        await updatePlanCompletion(client, id, nextDate);
        await clearPlanRuntimeState(client, id, plan.next_due_date);

        await client.query('COMMIT');
        return { success: true, next_due_date: nextDate };
    } catch (error) {
        await client.query('ROLLBACK');
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

// GET /admin/plans/:id/history
exports.getPlanHistory = async (request, reply) => {
    try {
        const planId = ensurePositiveInteger(request.params.id, 'id');
        return getPlanHistoryByPlanId(db, planId);
    } catch (error) {
        return sendValidationError(reply, error);
    }
};

// POST /admin/plans/:id/upload
exports.uploadDocument = async (request, reply) => {
    let id;
    try {
        id = ensurePositiveInteger(request.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }
    const parts = request.parts();
    const files = [];
    const documentsPath = process.env.DOCUMENTS_PATH || path.join(__dirname, '..', 'uploads', 'documents');

    if (!fs.existsSync(documentsPath)) {
        fs.mkdirSync(documentsPath, { recursive: true });
    }

    for await (const part of parts) {
        if (!part.file) continue;

        const safeFilename = `plan_${id}_${Date.now()}_${part.filename.replace(/[^a-zA-Z0-9._-]/g, '')}`;
        const targetPath = path.join(documentsPath, safeFilename);
        await util.promisify(pipeline)(part.file, fs.createWriteStream(targetPath));

        files.push({
            filename: safeFilename,
            url: `/documents/${safeFilename}`,
        });
    }

    return { success: true, files };
};
