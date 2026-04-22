const db = require('../db');
const { getScopedAccess } = require('../services/accessService');
const { fetchMaintenanceHistory, markHistoryEntryReviewed } = require('../repositories/historyRepository');
const {
    ensureBoolean,
    ensureDateOnlyString,
    ensureEnum,
    ensurePositiveInteger,
    sendValidationError,
} = require('../utils/validation');

exports.getMaintenanceHistory = async (req, reply) => {
    let startDate;
    let endDate;
    let locationId;
    let departmentId;
    let assetId;
    let operatorId;
    let withDocuments;

    try {
        startDate = ensureDateOnlyString(req.query.start, 'start', { required: false });
        endDate = ensureDateOnlyString(req.query.end, 'end', { required: false });
        locationId = ensurePositiveInteger(req.query.location_id, 'location_id', { required: false });
        departmentId = ensurePositiveInteger(req.query.department_id, 'department_id', { required: false });
        assetId = ensurePositiveInteger(req.query.asset_id, 'asset_id', { required: false });
        operatorId = ensurePositiveInteger(req.query.operator_id, 'operator_id', { required: false });
        withDocuments = ensureBoolean(req.query.with_documents, 'with_documents', { defaultValue: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            return reply.code(401).send({ error: 'Autenticacion requerida' });
        }

        return fetchMaintenanceHistory(client, access, {
            assetId,
            departmentId,
            endDate,
            locationId,
            operatorId,
            startDate,
            withDocuments,
        });
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.reviewHistoryEntry = async (req, reply) => {
    let entryType;
    let entryId;

    try {
        entryType = ensureEnum(req.params.entry_type, 'entry_type', ['preventive', 'corrective']);
        entryId = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            return reply.code(401).send({ error: 'Autenticacion requerida' });
        }

        const reviewerId = access.user?.id || null;
        const reviewerLabel = access.user?.full_name
            || access.user?.username
            || (access.isAdmin || access.isSuperAdmin ? 'Admin' : null);
        if (!reviewerId && !reviewerLabel) {
            return reply.code(403).send({ error: 'Usuario sin permisos de revision' });
        }

        const updated = await markHistoryEntryReviewed(client, access, entryType, entryId, reviewerId, reviewerLabel);
        if (!updated) {
            return reply.code(404).send({ error: 'Registro no encontrado' });
        }

        return updated;
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};
