const db = require('../db');
const ical = require('ical-generator').default;

const { getScopedAccess } = require('../services/accessService');
const { buildCalendarEvents } = require('../services/calendarService');
const {
    fetchAssets,
    fetchCalendarHistory,
    fetchCalendarPlans,
    fetchDepartments,
    fetchLocations,
    fetchPlanExceptions,
    fetchPlans,
    fetchStats,
} = require('../repositories/configRepository');

async function withScopedAccess(reply, authorizationHeader, handler) {
    const client = await db.connect();

    try {
        const access = await getScopedAccess(client, authorizationHeader);
        if (!access) {
            return reply.code(401).send({ error: 'Autenticacion requerida' });
        }

        return await handler(client, access);
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
}

exports.getConfig = async (req, reply) => {
    const client = await db.connect();

    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            return reply.code(401).send({ error: 'Autenticacion requerida' });
        }

        if (!access.isSuperAdmin && !access.isAdmin && access.allowedDeptIds.length === 0 && access.user) {
            return { locations: [], departments: [], assets: [], plans: [], stats: [] };
        }

        const [locations, departments, assets, plans, planExceptions] = await Promise.all([
            fetchLocations(client, access),
            fetchDepartments(client, access),
            fetchAssets(client, access),
            fetchPlans(client, access),
            fetchPlanExceptions(client),
        ]);
        const stats = await fetchStats(client, access);

        return {
            locations,
            departments,
            assets,
            plans,
            plan_exceptions: planExceptions,
            stats,
            user: access.user ? {
                id: access.user.id,
                full_name: access.user.full_name,
                role: access.user.role,
                location_id: access.user.location_id,
            } : null,
        };
    } catch (error) {
        console.error('ERROR in getConfig:', error);
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.createDepartment = async (req, reply) => {
    const { location_id, name, email } = req.body;
    try {
        const res = await db.query(
            'INSERT INTO departments (location_id, name, email) VALUES ($1, $2, $3) RETURNING *',
            [location_id, name, email || null]
        );
        return res.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            return reply.code(409).send({ error: 'Duplicate department' });
        }
        return reply.code(500).send({ error: error.message });
    }
};

exports.updateDepartment = async (req, reply) => {
    const { id } = req.params;
    const { name, location_id, email } = req.body;
    try {
        const res = await db.query(
            'UPDATE departments SET name = $1, location_id = $2, email = $3 WHERE id = $4 RETURNING *',
            [name, location_id, email || null, id]
        );
        return res.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            return reply.code(409).send({ error: 'Nombre duplicado' });
        }
        return reply.code(500).send({ error: error.message });
    }
};

exports.deleteDepartment = async (req, reply) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM departments WHERE id = $1', [id]);
        return { success: true };
    } catch (error) {
        if (error.code === '23503') {
            return reply.code(409).send({ error: 'No se puede borrar: tiene maquinas asociadas' });
        }
        return reply.code(500).send({ error: error.message });
    }
};

exports.createLocation = async (req, reply) => {
    const { name, address, email } = req.body;
    try {
        const res = await db.query(
            'INSERT INTO locations (name, address, email) VALUES ($1, $2, $3) RETURNING *',
            [name, address, email || null]
        );
        return res.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            return reply.code(409).send({ error: 'Duplicate location' });
        }
        return reply.code(500).send({ error: error.message });
    }
};

exports.updateLocation = async (req, reply) => {
    const { id } = req.params;
    const { name, address, email } = req.body;
    try {
        const res = await db.query(
            'UPDATE locations SET name = $1, address = $2, email = $3 WHERE id = $4 RETURNING *',
            [name, address, email || null, id]
        );
        return res.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            return reply.code(409).send({ error: 'Nombre duplicado' });
        }
        return reply.code(500).send({ error: error.message });
    }
};

exports.deleteLocation = async (req, reply) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM locations WHERE id = $1', [id]);
        return { success: true };
    } catch (error) {
        if (error.code === '23503') {
            return reply.code(409).send({ error: 'No se puede borrar: tiene departamentos asociados' });
        }
        return reply.code(500).send({ error: error.message });
    }
};

exports.getCalendarEvents = async (req, reply) => {
    const { department_id } = req.query;
    const client = await db.connect();

    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            const errorMessage = req.headers.authorization
                ? 'Token invalido o sesion expirada'
                : 'Autenticacion requerida';
            return reply.code(401).send({ error: errorMessage });
        }

        const {
            allowedDeptIds,
            isSuperAdmin,
            isAdmin,
            locationId,
        } = access;

        if (!isSuperAdmin && !isAdmin && allowedDeptIds.length === 0) {
            return [];
        }

        if (!isSuperAdmin && !isAdmin && department_id && !allowedDeptIds.includes(parseInt(department_id, 10))) {
            return [];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [historyRes, plansRes, exceptionsRes] = await Promise.all([
            fetchCalendarHistory(client, access, { departmentId: department_id }),
            fetchCalendarPlans(client, access, { departmentId: department_id }),
            client.query('SELECT * FROM plan_exceptions'),
        ]);

        return buildCalendarEvents({
            historyRows: historyRes,
            plans: plansRes,
            planExceptions: exceptionsRes.rows,
            today,
        });
    } finally {
        client.release();
    }
};

exports.exportCalendar = async (req, reply) => {
    const res = await db.query(
        'SELECT p.*, a.name as asset_name FROM maintenance_plans p JOIN assets a ON p.asset_id = a.id'
    );
    const calendar = ical({ name: 'GMAO Preventivos' });

    res.rows.forEach((plan) => {
        if (plan.next_due_date) {
            calendar.createEvent({
                start: plan.next_due_date,
                allDay: true,
                summary: `MTO: ${plan.asset_name}`,
                description: `Tarea: ${plan.task_description}\nFrecuencia: ${plan.frequency_days} dias.`,
            });
        }
    });

    reply.header('Content-Type', 'text/calendar; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="mantenimiento.ics"');
    return calendar.toString();
};

exports.getLocations = async (req, reply) => {
    return withScopedAccess(reply, req.headers.authorization, (client, access) => (
        fetchLocations(client, access)
    ));
};

exports.getDepartments = async (req, reply) => {
    return withScopedAccess(reply, req.headers.authorization, (client, access) => (
        fetchDepartments(client, access, { locationId: req.query.location_id })
    ));
};

exports.getAssets = async (req, reply) => {
    return withScopedAccess(reply, req.headers.authorization, (client, access) => (
        fetchAssets(client, access, {
            departmentId: req.query.department_id,
            locationId: req.query.location_id,
        })
    ));
};

exports.getPlans = async (req, reply) => {
    return withScopedAccess(reply, req.headers.authorization, (client, access) => (
        fetchPlans(client, access, {
            assetId: req.query.asset_id,
            departmentId: req.query.department_id,
            locationId: req.query.location_id,
        })
    ));
};
