function applyHistoryScope(filters, params, access) {
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

async function fetchMaintenanceHistory(client, access, historyFilters = {}) {
    const maintenanceParams = [];
    const maintenanceFilters = [];

    const hasScope = applyHistoryScope(maintenanceFilters, maintenanceParams, access);
    if (!access.isSuperAdmin && !hasScope) {
        return [];
    }

    if (historyFilters.startDate) {
        maintenanceParams.push(historyFilters.startDate);
        maintenanceFilters.push(`h.performed_date >= $${maintenanceParams.length}`);
    }

    if (historyFilters.endDate) {
        maintenanceParams.push(historyFilters.endDate);
        maintenanceFilters.push(`h.performed_date <= $${maintenanceParams.length}`);
    }

    if (historyFilters.locationId) {
        maintenanceParams.push(historyFilters.locationId);
        maintenanceFilters.push(`d.location_id = $${maintenanceParams.length}`);
    }

    if (historyFilters.departmentId) {
        maintenanceParams.push(historyFilters.departmentId);
        maintenanceFilters.push(`a.dept_id = $${maintenanceParams.length}`);
    }

    if (historyFilters.assetId) {
        maintenanceParams.push(historyFilters.assetId);
        maintenanceFilters.push(`h.asset_id = $${maintenanceParams.length}`);
    }

    if (historyFilters.operatorId) {
        maintenanceParams.push(historyFilters.operatorId);
        maintenanceFilters.push(`h.operator_id = $${maintenanceParams.length}`);
    }

    if (historyFilters.withDocuments) {
        maintenanceFilters.push(`h.document_path IS NOT NULL AND BTRIM(h.document_path) <> ''`);
    }

    const maintenanceWhereClause = maintenanceFilters.length > 0 ? `WHERE ${maintenanceFilters.join(' AND ')}` : '';
    const maintenanceRes = await client.query(
        `SELECT
            h.id,
            h.plan_id,
            h.asset_id,
            h.operator_id,
            h.scheduled_date,
            h.performed_date,
            h.created_at,
            h.notes,
            h.document_path,
            h.reviewed_at,
            h.reviewed_by,
            h.reviewed_by_label,
            COALESCE(p.task_description, 'Mantenimiento realizado') AS task_description,
            a.name AS asset_name,
            d.id AS department_id,
            d.name AS department_name,
            l.id AS location_id,
            l.name AS location_name,
            u.full_name AS operator_name,
            COALESCE(reviewer.full_name, h.reviewed_by_label) AS reviewed_by_name,
            NULL::TEXT AS solution,
            NULL::INTEGER AS duration_minutes,
            NULL::TEXT AS classification,
            NULL::TEXT AS impact_level,
            NULL::TEXT AS probable_cause,
            NULL::TEXT AS preventive_action,
            NULL::BOOLEAN AS follow_up_required,
            NULL::TEXT AS follow_up_status,
            NULL::TEXT AS follow_up_notes,
            'preventive' AS entry_type
         FROM maintenance_history h
         JOIN assets a ON h.asset_id = a.id
         LEFT JOIN maintenance_plans p ON h.plan_id = p.id
         LEFT JOIN departments d ON a.dept_id = d.id
         LEFT JOIN locations l ON d.location_id = l.id
         LEFT JOIN users u ON h.operator_id = u.id
         LEFT JOIN users reviewer ON h.reviewed_by = reviewer.id
         ${maintenanceWhereClause}`,
        maintenanceParams
    );

    const interventionParams = [];
    const interventionFilters = [];
    applyHistoryScope(interventionFilters, interventionParams, access);

    if (historyFilters.startDate) {
        interventionParams.push(historyFilters.startDate);
        interventionFilters.push(`l.created_at::date >= $${interventionParams.length}`);
    }

    if (historyFilters.endDate) {
        interventionParams.push(historyFilters.endDate);
        interventionFilters.push(`l.created_at::date <= $${interventionParams.length}`);
    }

    if (historyFilters.locationId) {
        interventionParams.push(historyFilters.locationId);
        interventionFilters.push(`d.location_id = $${interventionParams.length}`);
    }

    if (historyFilters.departmentId) {
        interventionParams.push(historyFilters.departmentId);
        interventionFilters.push(`a.dept_id = $${interventionParams.length}`);
    }

    if (historyFilters.assetId) {
        interventionParams.push(historyFilters.assetId);
        interventionFilters.push(`l.asset_id = $${interventionParams.length}`);
    }

    if (historyFilters.operatorId) {
        interventionParams.push(historyFilters.operatorId);
        interventionFilters.push(`l.user_id = $${interventionParams.length}`);
    }

    if (historyFilters.withDocuments) {
        interventionFilters.push(`l.document_path IS NOT NULL AND BTRIM(l.document_path) <> ''`);
    }

    const interventionWhereClause = interventionFilters.length > 0 ? `WHERE ${interventionFilters.join(' AND ')}` : '';
    const interventionRes = await client.query(
        `SELECT
            l.id,
            NULL::INTEGER AS plan_id,
            l.asset_id,
            l.user_id AS operator_id,
            l.created_at::date AS performed_date,
            l.created_at,
            COALESCE(l.failure_cause, l.global_comment) AS notes,
            l.document_path,
            l.reviewed_at,
            l.reviewed_by,
            l.reviewed_by_label,
            COALESCE(NULLIF(STRING_AGG(DISTINCT it.description, ' | '), ''), 'Averia / Correctivo') AS task_description,
            a.name AS asset_name,
            d.id AS department_id,
            d.name AS department_name,
            loc.id AS location_id,
            loc.name AS location_name,
            u.full_name AS operator_name,
            COALESCE(reviewer.full_name, l.reviewed_by_label) AS reviewed_by_name,
            l.solution,
            l.duration_minutes,
            l.classification,
            l.impact_level,
            l.probable_cause,
            l.preventive_action,
            l.follow_up_required,
            l.follow_up_status,
            l.follow_up_notes,
            'corrective' AS entry_type
         FROM intervention_logs l
         JOIN assets a ON l.asset_id = a.id
         LEFT JOIN intervention_tasks it ON it.intervention_id = l.id
         LEFT JOIN departments d ON a.dept_id = d.id
         LEFT JOIN locations loc ON d.location_id = loc.id
         LEFT JOIN users u ON l.user_id = u.id
         LEFT JOIN users reviewer ON reviewer.id = l.reviewed_by
         ${interventionWhereClause}
         GROUP BY
            l.id,
            l.asset_id,
            l.user_id,
            l.created_at,
            l.global_comment,
            l.failure_cause,
            l.document_path,
            l.reviewed_at,
            l.reviewed_by,
            l.reviewed_by_label,
            l.solution,
            l.duration_minutes,
            l.classification,
            l.impact_level,
            l.probable_cause,
            l.preventive_action,
            l.follow_up_required,
            l.follow_up_status,
            l.follow_up_notes,
            a.name,
            d.id,
            d.name,
            loc.id,
            loc.name,
            u.full_name,
            reviewer.full_name,
            l.reviewed_by_label`,
        interventionParams
    );

    return [...maintenanceRes.rows, ...interventionRes.rows].sort((left, right) => {
        const leftDate = new Date(left.created_at || left.performed_date);
        const rightDate = new Date(right.created_at || right.performed_date);
        return rightDate - leftDate || right.id - left.id;
    });
}

async function markHistoryEntryReviewed(client, access, entryType, entryId, reviewerId, reviewerLabel) {
    const filters = [];
    const params = [reviewerId, reviewerLabel];
    const hasScope = applyHistoryScope(filters, params, access);
    if (!access.isSuperAdmin && !hasScope) {
        return null;
    }

    if (entryType === 'preventive') {
        params.push(entryId);
        filters.push(`h.id = $${params.length}`);

        const result = await client.query(
            `UPDATE maintenance_history h
             SET reviewed_at = CURRENT_TIMESTAMP,
                 reviewed_by = $1,
                 reviewed_by_label = $2
             FROM assets a
             LEFT JOIN departments d ON a.dept_id = d.id
             WHERE h.asset_id = a.id
               AND ${filters.join(' AND ')}
             RETURNING
                h.id,
                h.reviewed_at,
                h.reviewed_by,
                h.reviewed_by_label`,
            params
        );

        return result.rows[0] || null;
    }

    params.push(entryId);
    filters.push(`l.id = $${params.length}`);

    const result = await client.query(
        `UPDATE intervention_logs l
         SET reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by = $1,
             reviewed_by_label = $2
         FROM assets a
         LEFT JOIN departments d ON a.dept_id = d.id
         WHERE l.asset_id = a.id
           AND ${filters.join(' AND ')}
         RETURNING
            l.id,
            l.reviewed_at,
            l.reviewed_by,
            l.reviewed_by_label`,
        params
    );

    return result.rows[0] || null;
}

module.exports = {
    fetchMaintenanceHistory,
    markHistoryEntryReviewed,
};
