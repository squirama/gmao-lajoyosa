const db = require('../db');
const { hashPassword } = require('../utils/passwords');

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
    const { full_name, role, username, password, department_ids } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        let password_hash = null;
        if (password) password_hash = hashPassword(password);

        const res = await client.query(
            "INSERT INTO users (full_name, role, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
            [full_name, role || 'operator', username, password_hash]
        );
        const user = res.rows[0];

        if (department_ids && Array.isArray(department_ids)) {
            for (const deptId of department_ids) {
                await client.query(
                    "INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2)",
                    [user.id, deptId]
                );
            }
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
    const { id } = req.params;
    const { full_name, role, username, password, department_ids } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        let query = "UPDATE users SET full_name = $1, role = $2, username = $3";
        const params = [full_name, role, username];
        let idx = 4;

        if (password) {
            query += `, password_hash = $${idx}`;
            params.push(hashPassword(password));
            idx++;
        }

        query += ` WHERE id = $${idx} RETURNING *`;
        params.push(id);

        const res = await client.query(query, params);
        const user = res.rows[0];

        if (department_ids && Array.isArray(department_ids)) {
            await client.query("DELETE FROM user_departments WHERE user_id = $1", [id]);
            for (const deptId of department_ids) {
                await client.query(
                    "INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2)",
                    [id, deptId]
                );
            }
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
    const res = await db.query("UPDATE users SET active = false WHERE id = $1 RETURNING *", [req.params.id]);
    return res.rows[0];
};
