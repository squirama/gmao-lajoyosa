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

// POST /admin/plans
exports.createPlan = async (request, reply) => {
    return insertPlan(db, normalizePlanPayload(request.body));
};

// PUT /admin/plans/:id
exports.updatePlan = async (request, reply) => {
    const normalizedPlan = normalizePlanPayload(request.body);
    return updatePlanRecord(db, request.params.id, normalizedPlan);
};

// DELETE /admin/plans/:id
exports.deletePlan = async (request, reply) => {
    await deactivatePlan(db, request.params.id);
    await deletePendingAlertsByPlanId(db, request.params.id);
    return { success: true };
};

// PUT /admin/maintenance-plans/:id/reschedule
exports.reschedulePlan = async (request, reply) => {
    const { new_date } = request.body;
    const { id } = request.params;

    if (!new_date) return reply.code(400).send({ error: 'Missing new_date' });

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await updatePlanDueDate(client, id, new_date);
        await updatePendingAlertsSchedule(client, id, new_date);
        await client.query('COMMIT');
        return { success: true, new_date };
    } catch (error) {
        await client.query('ROLLBACK');
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

// POST /admin/maintenance-plans/:id/exception
exports.createException = async (request, reply) => {
    const { id } = request.params;
    const { original_date, new_date } = request.body;

    if (!original_date || !new_date) {
        return reply.code(400).send({ error: 'Faltan fechas original_date y new_date' });
    }

    try {
        await upsertPlanException(db, id, original_date, new_date);
        return { success: true, original_date, new_date };
    } catch (error) {
        console.error('Error creating exception:', error);
        return reply.code(500).send({ error: error.message });
    }
};

// POST /admin/maintenance-plans/:id/skip
exports.skipPlan = async (request, reply) => {
    const { id } = request.params;
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
    const { id } = request.params;
    const { operator_id, notes, alert, document_path, consumed_parts } = request.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const plan = await getPlanWithAssetName(client, id);
        if (!plan) throw new Error('Plan Not Found');

        const historyId = await insertHistory(client, {
            planId: id,
            assetId: plan.asset_id,
            operatorId: operator_id || null,
            notes: notes || 'Completado desde App',
            documentPath: document_path || null,
        });

        if (consumed_parts && consumed_parts.length > 0) {
            await processPartConsumptions(client, consumed_parts, { history_id: historyId });
        }

        if (alert) {
            try {
                const operatorName = operator_id ? await getUserFullName(client, operator_id) : null;
                await sendPreventiveAlert(plan, operator_id, {
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
    return getPlanHistoryByPlanId(db, request.params.id);
};

// POST /admin/plans/:id/upload
exports.uploadDocument = async (request, reply) => {
    const { id } = request.params;
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
