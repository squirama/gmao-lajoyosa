const db = require('../db');
const { hashPassword } = require('../utils/passwords');
const {
    ensureEnum,
    ensureIntegerArray,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'admin', 'OPERATOR', 'operator'];

exports.getUsers = async (req, reply) => {
    const client = await db.connect();
    try {
        const res = await client.query(`
            SELECT u.id, u.full_name, u.role, u.username, 
                   COALESCE(json_agg(ud.department_id) FILTER (WHERE ud.department_id IS NOT NULL), '[]') as department_ids
            FROM users u
            LEFT JOIN user_departments ud ON u.id = ud.user_id
            WHERE u.active = true AND u.role != 'ADMIN' AND u.role != 'admin'
            GROUP BY u.id
            ORDER BY u.full_name
        `);
        return res.rows;
    } finally {
        client.release();
    }
};

exports.getAllUsers = async (req, reply) => {
    const client = await db.connect();
    try {
        const res = await client.query(`
            SELECT u.*, 
                   COALESCE(json_agg(ud.department_id) FILTER (WHERE ud.department_id IS NOT NULL), '[]') as department_ids
            FROM users u
            LEFT JOIN user_departments ud ON u.id = ud.user_id
            GROUP BY u.id
            ORDER BY u.id DESC
        `);
        return res.rows;
    } finally {
        client.release();
    }
};

exports.createUser = async (req, reply) => {
    let fullName;
    let role;
    let username;
    let passwordHash = null;
    let departmentIds;
    try {
        const body = ensureObject(req.body, 'user');
        fullName = ensureString(body.full_name, 'full_name', { maxLength: 160 });
        role = ensureEnum(body.role, 'role', ALLOWED_ROLES, { required: false, defaultValue: 'OPERATOR' });
        username = ensureString(body.username, 'username', { maxLength: 80, pattern: /^[A-Za-z0-9._-]+$/ });
        const password = ensureString(body.password, 'password', { required: false, allowEmpty: true, minLength: 6, maxLength: 200 });
        passwordHash = password ? hashPassword(password) : null;
        departmentIds = ensureIntegerArray(body.department_ids, 'department_ids');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');
        const res = await client.query(
            "INSERT INTO users (full_name, role, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
            [fullName, role, username, passwordHash]
        );
        const user = res.rows[0];

        for (const deptId of departmentIds) {
            await client.query(
                "INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2)",
                [user.id, deptId]
            );
        }

        await client.query('COMMIT');
        return user;
    } catch (e) {
        await client.query('ROLLBACK');
        if (e.code === '23505') return reply.code(409).send({ error: 'Usuario ya existente' });
        throw e;
    } finally {
        client.release();
    }
};

exports.updateUser = async (req, reply) => {
    let id;
    let fullName;
    let role;
    let username;
    let passwordHash = null;
    let departmentIds;
    try {
        const body = ensureObject(req.body, 'user');
        id = ensurePositiveInteger(req.params.id, 'id');
        fullName = ensureString(body.full_name, 'full_name', { maxLength: 160 });
        role = ensureEnum(body.role, 'role', ALLOWED_ROLES);
        username = ensureString(body.username, 'username', { maxLength: 80, pattern: /^[A-Za-z0-9._-]+$/ });
        const password = ensureString(body.password, 'password', { required: false, allowEmpty: true, minLength: 6, maxLength: 200 });
        passwordHash = password ? hashPassword(password) : null;
        departmentIds = ensureIntegerArray(body.department_ids, 'department_ids');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        let query = "UPDATE users SET full_name = $1, role = $2, username = $3";
        const params = [fullName, role, username];
        let idx = 4;

        if (passwordHash) {
            query += `, password_hash = $${idx}`;
            params.push(passwordHash);
            idx++;
        }

        query += ` WHERE id = $${idx} RETURNING *`;
        params.push(id);

        const res = await client.query(query, params);
        const user = res.rows[0];

        await client.query("DELETE FROM user_departments WHERE user_id = $1", [id]);
        for (const deptId of departmentIds) {
            await client.query(
                "INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2)",
                [id, deptId]
            );
        }

        await client.query('COMMIT');
        return user;
    } catch (e) {
        await client.query('ROLLBACK');
        if (e.code === '23505') return reply.code(409).send({ error: 'Usuario ya existente' });
        throw e;
    } finally {
        client.release();
    }
};

exports.deleteUser = async (req, reply) => {
    try {
        const userId = ensurePositiveInteger(req.params.id, 'id');
        const res = await db.query("UPDATE users SET active = false WHERE id = $1 RETURNING *", [userId]);
        return res.rows[0];
    } catch (error) {
        return sendValidationError(reply, error);
    }
};
