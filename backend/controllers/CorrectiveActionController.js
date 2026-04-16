const db = require('../db');
const { getScopedAccess } = require('../services/accessService');
const {
    ensureBoolean,
    ensureEnum,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

const CLASSIFICATIONS = ['CORRECTION', 'CORRECTIVE_ACTION', 'IMPROVEMENT_OPPORTUNITY', 'TECHNICAL_CHANGE'];
const IMPACT_LEVELS = ['NONE', 'POTENTIAL', 'CONFIRMED'];
const FOLLOW_UP_STATUSES = ['NOT_REQUIRED', 'OPEN', 'CLOSED'];

function applyScope(filters, params, access) {
    if (access.isSuperAdmin) {
        return true;
    }

    if (access.allowedDeptIds.length > 0) {
        params.push(access.allowedDeptIds);
        filters.push(`a.dept_id = ANY($${params.length}::int[])`);
        return true;
    }

    if (access.isAdmin && access.locationId) {
        params.push(access.locationId);
        filters.push(`d.location_id = $${params.length}`);
        return true;
    }

    return false;
}

exports.getCorrectiveActions = async (req, reply) => {
    let locationId;
    let departmentId;
    let assetId;
    let status;
    let classification;
    let followUpRequired;

    try {
        locationId = ensurePositiveInteger(req.query.location_id, 'location_id', { required: false });
        departmentId = ensurePositiveInteger(req.query.department_id, 'department_id', { required: false });
        assetId = ensurePositiveInteger(req.query.asset_id, 'asset_id', { required: false });
        status = ensureEnum(req.query.status, 'status', FOLLOW_UP_STATUSES, { required: false });
        classification = ensureEnum(req.query.classification, 'classification', CLASSIFICATIONS, { required: false });
        followUpRequired = ensureBoolean(req.query.follow_up_required, 'follow_up_required', { defaultValue: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            return reply.code(401).send({ error: 'Autenticacion requerida' });
        }

        const filters = [];
        const params = [];
        const hasScope = applyScope(filters, params, access);
        if (!access.isSuperAdmin && !hasScope) {
            return [];
        }

        if (locationId) {
            params.push(locationId);
            filters.push(`d.location_id = $${params.length}`);
        }

        if (departmentId) {
            params.push(departmentId);
            filters.push(`a.dept_id = $${params.length}`);
        }

        if (assetId) {
            params.push(assetId);
            filters.push(`l.asset_id = $${params.length}`);
        }

        if (status) {
            params.push(status);
            filters.push(`l.follow_up_status = $${params.length}`);
        }

        if (classification) {
            params.push(classification);
            filters.push(`l.classification = $${params.length}`);
        }

        if (followUpRequired) {
            filters.push('l.follow_up_required = TRUE');
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
        const result = await client.query(
            `SELECT
                l.id,
                l.asset_id,
                l.user_id,
                l.created_at,
                l.global_comment,
                l.duration_minutes,
                l.solution,
                l.document_path,
                l.classification,
                l.impact_level,
                l.probable_cause,
                l.preventive_action,
                l.follow_up_required,
                l.follow_up_status,
                l.follow_up_notes,
                l.reviewed_at,
                l.reviewed_by,
                a.name AS asset_name,
                d.id AS department_id,
                d.name AS department_name,
                loc.id AS location_id,
                loc.name AS location_name,
                u.full_name AS operator_name,
                reviewer.full_name AS reviewed_by_name,
                COALESCE(NULLIF(STRING_AGG(DISTINCT it.description, ' | '), ''), 'Averia / Correctivo') AS task_description
             FROM intervention_logs l
             JOIN assets a ON l.asset_id = a.id
             LEFT JOIN intervention_tasks it ON it.intervention_id = l.id
             LEFT JOIN departments d ON a.dept_id = d.id
             LEFT JOIN locations loc ON d.location_id = loc.id
             LEFT JOIN users u ON l.user_id = u.id
             LEFT JOIN users reviewer ON reviewer.id = l.reviewed_by
             ${whereClause}
             GROUP BY
                l.id,
                l.asset_id,
                l.user_id,
                l.created_at,
                l.global_comment,
                l.duration_minutes,
                l.solution,
                l.document_path,
                l.classification,
                l.impact_level,
                l.probable_cause,
                l.preventive_action,
                l.follow_up_required,
                l.follow_up_status,
                l.follow_up_notes,
                l.reviewed_at,
                l.reviewed_by,
                a.name,
                d.id,
                d.name,
                loc.id,
                loc.name,
                u.full_name,
                reviewer.full_name
             ORDER BY
                CASE l.follow_up_status WHEN 'OPEN' THEN 0 WHEN 'NOT_REQUIRED' THEN 1 ELSE 2 END,
                l.created_at DESC`
        , params);

        return result.rows;
    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.updateCorrectiveAction = async (req, reply) => {
    let id;
    let body;
    try {
        id = ensurePositiveInteger(req.params.id, 'id');
        body = ensureObject(req.body, 'correctiveAction');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            return reply.code(401).send({ error: 'Autenticacion requerida' });
        }

        const filters = ['l.id = $1'];
        const params = [id];
        const hasScope = applyScope(filters, params, access);
        if (!access.isSuperAdmin && !hasScope) {
            return reply.code(403).send({ error: 'No autorizado' });
        }

        const existing = await client.query(
            `SELECT l.id
             FROM intervention_logs l
             JOIN assets a ON l.asset_id = a.id
             LEFT JOIN departments d ON a.dept_id = d.id
             WHERE ${filters.join(' AND ')}
             LIMIT 1`,
            params
        );

        if (existing.rows.length === 0) {
            return reply.code(404).send({ error: 'Registro no encontrado' });
        }

        let classification;
        let impactLevel;
        let solution;
        let probableCause;
        let preventiveAction;
        let followUpRequired;
        let followUpStatus;
        let followUpNotes;

        try {
            classification = ensureEnum(body.classification, 'classification', CLASSIFICATIONS, { required: false });
            impactLevel = ensureEnum(body.impact_level, 'impact_level', IMPACT_LEVELS, { required: false });
            solution = ensureString(body.solution, 'solution', { required: false, allowEmpty: true, maxLength: 4000 });
            probableCause = ensureString(body.probable_cause, 'probable_cause', { required: false, allowEmpty: true, maxLength: 4000 });
            preventiveAction = ensureString(body.preventive_action, 'preventive_action', { required: false, allowEmpty: true, maxLength: 4000 });
            followUpRequired = ensureBoolean(body.follow_up_required, 'follow_up_required', { defaultValue: false });
            followUpStatus = ensureEnum(body.follow_up_status, 'follow_up_status', FOLLOW_UP_STATUSES, { required: false, defaultValue: null });
            followUpNotes = ensureString(body.follow_up_notes, 'follow_up_notes', { required: false, allowEmpty: true, maxLength: 4000 });
        } catch (error) {
            return sendValidationError(reply, error);
        }

        const resolvedStatus = followUpRequired
            ? (followUpStatus && followUpStatus !== 'NOT_REQUIRED' ? followUpStatus : 'OPEN')
            : 'NOT_REQUIRED';

        const reviewedBy = access.user?.id || null;

        const result = await client.query(
            `UPDATE intervention_logs
             SET classification = COALESCE($1, classification),
                 impact_level = COALESCE($2, impact_level),
                 solution = COALESCE($3, solution),
                 probable_cause = COALESCE($4, probable_cause),
                 preventive_action = COALESCE($5, preventive_action),
                 follow_up_required = $6,
                 follow_up_status = $7,
                 follow_up_notes = $8,
                 reviewed_at = CURRENT_TIMESTAMP,
                 reviewed_by = $9
             WHERE id = $10
             RETURNING *`,
            [
                classification,
                impactLevel,
                solution,
                probableCause,
                preventiveAction,
                followUpRequired,
                resolvedStatus,
                followUpNotes,
                reviewedBy,
                id,
            ]
        );

        return result.rows[0];
    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};
