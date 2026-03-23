const db = require('../db');
const { getScopedAccess } = require('../services/accessService');
const { fetchMaintenanceHistory } = require('../repositories/historyRepository');
const {
    ensureBoolean,
    ensureDateOnlyString,
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
