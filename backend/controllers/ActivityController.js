const db = require('../db');
const { resolveAuthContext, sendUnauthorized } = require('../utils/auth');

exports.getOverview = async (req, reply) => {
    const ctx = resolveAuthContext(req);
    if (!ctx || ctx.role !== 'ADMIN') return sendUnauthorized(reply);

    try {
        const [interventions, plans, assets, users] = await Promise.all([
            db.query(`SELECT COUNT(*) AS count FROM intervention_logs WHERE created_at >= NOW() - INTERVAL '30 days'`),
            db.query(`SELECT COUNT(*) AS count FROM maintenance_plans WHERE active = true`),
            db.query(`SELECT COUNT(*) AS count FROM assets WHERE active = true`),
            db.query(`SELECT COUNT(*) AS count FROM users WHERE active = true`),
        ]);

        const recent = await db.query(`
            SELECT il.id, il.created_at, il.global_comment, u.full_name AS user_name, a.name AS asset_name
            FROM intervention_logs il
            LEFT JOIN users u ON u.id = il.user_id
            LEFT JOIN assets a ON a.id = il.asset_id
            ORDER BY il.created_at DESC
            LIMIT 20
        `);

        return reply.send({
            summary: {
                'Intervenciones (30d)': parseInt(interventions.rows[0].count),
                'Planes activos': parseInt(plans.rows[0].count),
                'Activos': parseInt(assets.rows[0].count),
                'Usuarios': parseInt(users.rows[0].count),
            },
            recentActivity: recent.rows,
            activityUsers: [],
            recentLogins: [],
        });
    } catch (err) {
        req.log.error(err);
        return reply.code(500).send({ error: 'Error al obtener actividad' });
    }
};
