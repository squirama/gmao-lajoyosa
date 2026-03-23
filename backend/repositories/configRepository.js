async function fetchLocations(client, access) {
    if (access.isSuperAdmin) {
        const res = await client.query('SELECT * FROM locations ORDER BY id');
        return res.rows;
    }

    if (access.isAdmin && access.locationId) {
        const res = await client.query(
            'SELECT * FROM locations WHERE id = $1 ORDER BY id',
            [access.locationId]
        );
        return res.rows;
    }

    if (access.allowedDeptIds.length === 0) return [];

    const res = await client.query(`
        SELECT DISTINCT l.*
        FROM locations l
        JOIN departments d ON l.id = d.location_id
        JOIN user_departments ud ON ud.department_id = d.id
        WHERE ud.user_id = $1
        ORDER BY l.id
    `, [access.user.id]);
    return res.rows;
}

function applyScopedDepartmentFilters(filters, params, access, columnName, { departmentId = null, locationId = null } = {}) {
    if (access.isAdmin && access.locationId) {
        params.push(access.locationId);
        filters.push(`${columnName} IN (SELECT id FROM departments WHERE location_id = $${params.length})`);
    } else if (!access.isSuperAdmin) {
        if (access.allowedDeptIds.length === 0) return false;
        params.push(access.allowedDeptIds);
        filters.push(`${columnName} = ANY($${params.length}::int[])`);
    }

    if (departmentId) {
        params.push(Number(departmentId));
        filters.push(`${columnName} = $${params.length}`);
    }

    if (locationId) {
        params.push(Number(locationId));
        filters.push(`d.location_id = $${params.length}`);
    }

    return true;
}

async function fetchDepartments(client, access, { locationId = null } = {}) {
    const params = [];
    const filters = [];

    if (access.isAdmin && access.locationId) {
        params.push(access.locationId);
        filters.push(`location_id = $${params.length}`);
    } else if (!access.isSuperAdmin) {
        if (access.allowedDeptIds.length === 0) return [];
        params.push(access.allowedDeptIds);
        filters.push(`id = ANY($${params.length}::int[])`);
    }

    if (locationId) {
        params.push(Number(locationId));
        filters.push(`location_id = $${params.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const res = await client.query(
        `SELECT * FROM departments ${whereClause} ORDER BY name`,
        params
    );
    return res.rows;
}

async function fetchAssets(client, access, { departmentId = null, locationId = null } = {}) {
    const params = [];
    const filters = ['a.active = true'];

    if (access.isAdmin && access.locationId) {
        params.push(access.locationId);
        filters.push(`d.location_id = $${params.length}`);
    } else if (!access.isSuperAdmin) {
        if (access.allowedDeptIds.length === 0) return [];
        params.push(access.allowedDeptIds);
        filters.push(`a.dept_id = ANY($${params.length}::int[])`);
    }

    if (departmentId) {
        params.push(Number(departmentId));
        filters.push(`a.dept_id = $${params.length}`);
    }

    if (locationId) {
        params.push(Number(locationId));
        filters.push(`d.location_id = $${params.length}`);
    }

    const res = await client.query(`
        SELECT a.*, l.name as loc_name
        FROM assets a
        LEFT JOIN departments d ON a.dept_id = d.id
        LEFT JOIN locations l ON d.location_id = l.id
        WHERE ${filters.join(' AND ')}
        ORDER BY a.name
    `, params);
    return res.rows;
}

async function fetchPlans(client, access, { assetId = null, departmentId = null, locationId = null } = {}) {
    const params = [];
    const filters = ['p.active = true'];

    if (access.isAdmin && access.locationId) {
        params.push(access.locationId);
        filters.push(`d.location_id = $${params.length}`);
    } else if (!access.isSuperAdmin) {
        if (access.allowedDeptIds.length === 0) return [];
        params.push(access.allowedDeptIds);
        filters.push(`a.dept_id = ANY($${params.length}::int[])`);
    }

    if (assetId) {
        params.push(Number(assetId));
        filters.push(`p.asset_id = $${params.length}`);
    }

    if (departmentId) {
        params.push(Number(departmentId));
        filters.push(`a.dept_id = $${params.length}`);
    }

    if (locationId) {
        params.push(Number(locationId));
        filters.push(`d.location_id = $${params.length}`);
    }

    const res = await client.query(`
        SELECT p.*, a.name as asset_name, a.dept_id
        FROM maintenance_plans p
        JOIN assets a ON p.asset_id = a.id
        LEFT JOIN departments d ON a.dept_id = d.id
        WHERE ${filters.join(' AND ')}
        ORDER BY p.id
    `, params);
    return res.rows;
}

async function fetchStats(client, access) {
    if (access.isAdmin && access.locationId) {
        const res = await client.query(`
            SELECT l.name, COUNT(a.id) as total_assets
            FROM locations l
            LEFT JOIN departments d ON l.id = d.location_id
            LEFT JOIN assets a ON d.id = a.dept_id
            WHERE l.id = $1
            GROUP BY l.id, l.name
            ORDER BY l.id
        `, [access.locationId]);
        return res.rows;
    }

    const res = await client.query(`
        SELECT l.name, COUNT(a.id) as total_assets
        FROM locations l
        LEFT JOIN departments d ON l.id = d.location_id
        LEFT JOIN assets a ON d.id = a.dept_id
        GROUP BY l.id, l.name
        ORDER BY l.id
    `);
    return res.rows;
}

async function fetchPlanExceptions(client) {
    const res = await client.query('SELECT * FROM plan_exceptions');
    return res.rows;
}

async function fetchCalendarHistory(client, access, { departmentId = null } = {}) {
    const params = [];
    const filters = [];

    const hasScope = applyScopedDepartmentFilters(filters, params, access, 'a.dept_id', { departmentId });
    if (!access.isSuperAdmin && !hasScope) return [];

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const res = await client.query(
        `SELECT h.*, p.task_description, a.name as asset_name, a.dept_id
         FROM maintenance_history h
         LEFT JOIN maintenance_plans p ON h.plan_id = p.id
         LEFT JOIN assets a ON h.asset_id = a.id
         ${whereClause}`,
        params
    );
    return res.rows;
}

async function fetchCalendarPlans(client, access, { departmentId = null } = {}) {
    const params = [];
    const filters = ['p.active = true'];

    const hasScope = applyScopedDepartmentFilters(filters, params, access, 'a.dept_id', { departmentId });
    if (!access.isSuperAdmin && !hasScope) return [];

    const res = await client.query(
        `SELECT p.*, a.name as asset_name, a.dept_id
         FROM maintenance_plans p
         JOIN assets a ON p.asset_id = a.id
         LEFT JOIN departments d ON a.dept_id = d.id
         WHERE ${filters.join(' AND ')}`,
        params
    );
    return res.rows;
}

module.exports = {
    fetchAssets,
    fetchCalendarHistory,
    fetchCalendarPlans,
    fetchDepartments,
    fetchLocations,
    fetchPlanExceptions,
    fetchPlans,
    fetchStats,
};
