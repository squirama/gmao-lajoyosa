const { resolveAuthContext } = require('../utils/auth');

async function getScopedAccess(client, authHeader) {
    const auth = await resolveAuthContext(authHeader, client);
    if (!auth.isAuthenticated) return null;

    const user = auth.user;
    let allowedDeptIds = [];
    const locationId = user?.location_id || null;
    const isSuperAdmin = auth.authType === 'basic' || user?.role === 'SUPER_ADMIN';
    const isAdmin = user ? ['ADMIN', 'admin'].includes(user.role) : false;

    if (user && !isSuperAdmin && !isAdmin) {
        const deptRes = await client.query(
            "SELECT department_id FROM user_departments WHERE user_id = $1",
            [user.id]
        );
        allowedDeptIds = deptRes.rows.map((row) => row.department_id);
    }

    return { user, isSuperAdmin, isAdmin, allowedDeptIds, locationId };
}

module.exports = {
    getScopedAccess,
};
