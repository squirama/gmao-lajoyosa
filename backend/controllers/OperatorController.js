const db = require('../db');
const { hashPassword } = require('../utils/passwords');

exports.getAllOperators = async (req, reply) => {
    const res = await db.query("SELECT * FROM users WHERE role = 'operator' ORDER BY full_name");
    return res.rows;
};

exports.createOperator = async (req, reply) => {
    const { full_name, username, password, department_ids, role, location_ids } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const safeRole = role === 'admin' ? 'ADMIN' : 'operator';
        const pwdHash = password ? hashPassword(password) : null;

        const res = await client.query(
            "INSERT INTO users (full_name, username, password_hash, role, active) VALUES ($1, $2, $3, $4, true) RETURNING *",
            [full_name, username, pwdHash, safeRole]
        );
        const newUser = res.rows[0];

        if (safeRole === 'ADMIN' && location_ids && location_ids.length > 0) {
            for (const locId of location_ids) {
                await client.query("INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2)", [newUser.id, locId]);
            }
        }

        if (safeRole === 'operator' && department_ids && department_ids.length > 0) {
            for (const deptId of department_ids) {
                await client.query("INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2)", [newUser.id, deptId]);
            }
        }

        await client.query('COMMIT');
        return newUser;
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        reply.code(500).send({ error: e.message });
    } finally {
        client.release();
    }
};

exports.updateOperator = async (req, reply) => {
    const { id } = req.params;
    const { full_name } = req.body;
    await db.query("UPDATE users SET full_name = $1 WHERE id = $2", [full_name, id]);
    return { success: true };
};

exports.deleteOperator = async (req, reply) => {
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    return { success: true };
};
