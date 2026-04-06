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
const {
    ensureBoolean,
    ensureEmail,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

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

async function requireSuperAdmin(req, reply) {
    const client = await db.connect();
    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            reply.code(401).send({ error: 'Autenticacion requerida' });
            return null;
        }
        if (!access.isSuperAdmin) {
            reply.code(403).send({ error: 'Solo un super admin puede gestionar sedes' });
            return null;
        }
        return access;
    } finally {
        client.release();
    }
}

async function requireScopedAccess(req, reply) {
    const client = await db.connect();
    try {
        const access = await getScopedAccess(client, req.headers.authorization);
        if (!access) {
            reply.code(401).send({ error: 'Autenticacion requerida' });
            return null;
        }
        return access;
    } finally {
        client.release();
    }
}

async function canManageLocationId(access, locationId) {
    if (!access) return false;
    if (access.isSuperAdmin) return true;
    if (access.allowedDeptIds.length > 0) {
        const res = await db.query(
            'SELECT 1 FROM departments WHERE location_id = $1 AND id = ANY($2::int[]) LIMIT 1',
            [locationId, access.allowedDeptIds]
        );
        return res.rows.length > 0;
    }
    if (access.isAdmin && access.locationId) {
        return Number(access.locationId) === Number(locationId);
    }
    return false;
}

async function canManageDepartmentId(access, departmentId) {
    if (!access) return false;
    if (access.isSuperAdmin) return true;
    if (access.allowedDeptIds.length > 0) {
        return access.allowedDeptIds.includes(Number(departmentId));
    }
    if (access.isAdmin && access.locationId) {
        const res = await db.query(
            'SELECT 1 FROM departments WHERE id = $1 AND location_id = $2 LIMIT 1',
            [departmentId, access.locationId]
        );
        return res.rows.length > 0;
    }
    return false;
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
    let locationId;
    let name;
    let email;
    let weeklyReminderEnabled;
    let weeklyReminderEmail;
    try {
        const body = ensureObject(req.body, 'department');
        locationId = ensurePositiveInteger(body.location_id, 'location_id');
        name = ensureString(body.name, 'name', { maxLength: 160 });
        email = body.email === '' || body.email === undefined || body.email === null
            ? null
            : ensureEmail(body.email, 'email', { required: false });
        weeklyReminderEnabled = ensureBoolean(body.weekly_reminder_enabled, 'weekly_reminder_enabled', { defaultValue: false });
        weeklyReminderEmail = body.weekly_reminder_email === '' || body.weekly_reminder_email === undefined || body.weekly_reminder_email === null
            ? null
            : ensureEmail(body.weekly_reminder_email, 'weekly_reminder_email', { required: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const access = await requireScopedAccess(req, reply);
    if (!access) return reply;
    if (!(await canManageLocationId(access, locationId))) {
        return reply.code(403).send({ error: 'No autorizado para crear areas en esa sede' });
    }

    try {
        const res = await db.query(
            `INSERT INTO departments (
                location_id,
                name,
                email,
                weekly_reminder_enabled,
                weekly_reminder_email
            ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [locationId, name, email || null, weeklyReminderEnabled, weeklyReminderEmail]
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
    let id;
    let name;
    let locationId;
    let email;
    let weeklyReminderEnabled;
    let weeklyReminderEmail;
    try {
        const body = ensureObject(req.body, 'department');
        id = ensurePositiveInteger(req.params.id, 'id');
        name = ensureString(body.name, 'name', { maxLength: 160 });
        locationId = ensurePositiveInteger(body.location_id, 'location_id');
        email = body.email === '' || body.email === undefined || body.email === null
            ? null
            : ensureEmail(body.email, 'email', { required: false });
        weeklyReminderEnabled = ensureBoolean(body.weekly_reminder_enabled, 'weekly_reminder_enabled', { defaultValue: false });
        weeklyReminderEmail = body.weekly_reminder_email === '' || body.weekly_reminder_email === undefined || body.weekly_reminder_email === null
            ? null
            : ensureEmail(body.weekly_reminder_email, 'weekly_reminder_email', { required: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const access = await requireScopedAccess(req, reply);
    if (!access) return reply;
    if (!(await canManageDepartmentId(access, id)) || !(await canManageLocationId(access, locationId))) {
        return reply.code(403).send({ error: 'No autorizado para editar esta area' });
    }

    try {
        const res = await db.query(
            `UPDATE departments
             SET name = $1,
                 location_id = $2,
                 email = $3,
                 weekly_reminder_enabled = $4,
                 weekly_reminder_email = $5
             WHERE id = $6
             RETURNING *`,
            [name, locationId, email || null, weeklyReminderEnabled, weeklyReminderEmail, id]
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
    let id;
    try {
        id = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const access = await requireScopedAccess(req, reply);
    if (!access) return reply;
    if (!(await canManageDepartmentId(access, id))) {
        return reply.code(403).send({ error: 'No autorizado para borrar esta area' });
    }

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
    let name;
    let address;
    let email;
    try {
        const body = ensureObject(req.body, 'location');
        name = ensureString(body.name, 'name', { maxLength: 160 });
        address = ensureString(body.address, 'address', { required: false, allowEmpty: true, maxLength: 255 });
        email = ensureEmail(body.email, 'email', { required: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const access = await requireSuperAdmin(req, reply);
    if (!access) return reply;

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
    let id;
    let name;
    let address;
    let email;
    try {
        const body = ensureObject(req.body, 'location');
        id = ensurePositiveInteger(req.params.id, 'id');
        name = ensureString(body.name, 'name', { maxLength: 160 });
        address = ensureString(body.address, 'address', { required: false, allowEmpty: true, maxLength: 255 });
        email = ensureEmail(body.email, 'email', { required: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const access = await requireSuperAdmin(req, reply);
    if (!access) return reply;

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
    let id;
    try {
        id = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const access = await requireSuperAdmin(req, reply);
    if (!access) return reply;

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
    let departmentId = null;
    let locationId = null;
    let assetId = null;
    try {
        departmentId = ensurePositiveInteger(req.query.department_id, 'department_id', { required: false });
        locationId = ensurePositiveInteger(req.query.location_id, 'location_id', { required: false });
        assetId = ensurePositiveInteger(req.query.asset_id, 'asset_id', { required: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }
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

        if (!isSuperAdmin && !isAdmin && departmentId && !allowedDeptIds.includes(Number(departmentId))) {
            return [];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [historyRes, plansRes, exceptionsRes] = await Promise.all([
            fetchCalendarHistory(client, access, {
                departmentId,
                locationId,
                assetId,
            }),
            fetchCalendarPlans(client, access, {
                departmentId,
                locationId,
                assetId,
            }),
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
