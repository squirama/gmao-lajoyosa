function applyHistoryScope(filters, params, access) {
    if (access.isAdmin && access.locationId) {
        params.push(access.locationId);
        filters.push(`d.location_id = $${params.length}`);
        return true;
    }

    if (access.isSuperAdmin) {
        return true;
    }

    if (access.allowedDeptIds.length === 0) {
        return false;
    }

    params.push(access.allowedDeptIds);
    filters.push(`a.dept_id = ANY($${params.length}::int[])`);
    return true;
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
            h.performed_date,
            h.created_at,
            h.notes,
            h.document_path,
            COALESCE(p.task_description, 'Mantenimiento realizado') AS task_description,
            a.name AS asset_name,
            d.id AS department_id,
            d.name AS department_name,
            l.id AS location_id,
            l.name AS location_name,
            u.full_name AS operator_name,
            NULL::TEXT AS solution,
            NULL::INTEGER AS duration_minutes,
            'preventive' AS entry_type
         FROM maintenance_history h
         JOIN assets a ON h.asset_id = a.id
         LEFT JOIN maintenance_plans p ON h.plan_id = p.id
         LEFT JOIN departments d ON a.dept_id = d.id
         LEFT JOIN locations l ON d.location_id = l.id
         LEFT JOIN users u ON h.operator_id = u.id
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
            l.global_comment AS notes,
            l.document_path,
            COALESCE(NULLIF(STRING_AGG(DISTINCT it.description, ' | '), ''), 'Averia / Correctivo') AS task_description,
            a.name AS asset_name,
            d.id AS department_id,
            d.name AS department_name,
            loc.id AS location_id,
            loc.name AS location_name,
            u.full_name AS operator_name,
            l.solution,
            l.duration_minutes,
            'corrective' AS entry_type
         FROM intervention_logs l
         JOIN assets a ON l.asset_id = a.id
         LEFT JOIN intervention_tasks it ON it.intervention_id = l.id
         LEFT JOIN departments d ON a.dept_id = d.id
         LEFT JOIN locations loc ON d.location_id = loc.id
         LEFT JOIN users u ON l.user_id = u.id
         ${interventionWhereClause}
         GROUP BY
            l.id,
            l.asset_id,
            l.user_id,
            l.created_at,
            l.global_comment,
            l.document_path,
            l.solution,
            l.duration_minutes,
            a.name,
            d.id,
            d.name,
            loc.id,
            loc.name,
            u.full_name`,
        interventionParams
    );

    return [...maintenanceRes.rows, ...interventionRes.rows].sort((left, right) => {
        const leftDate = new Date(left.created_at || left.performed_date);
        const rightDate = new Date(right.created_at || right.performed_date);
        return rightDate - leftDate || right.id - left.id;
    });
}

module.exports = {
    fetchMaintenanceHistory,
};
