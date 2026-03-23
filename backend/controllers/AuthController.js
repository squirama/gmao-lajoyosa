const db = require('../db');
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('../utils/passwords');
const { getBearerToken } = require('../utils/auth');
const { ensureObject, ensureString, sendValidationError } = require('../utils/validation');

exports.login = async (req, reply) => {
    let username;
    let password;
    try {
        const body = ensureObject(req.body, 'credenciales');
        username = ensureString(body.username, 'username', { maxLength: 80 });
        password = ensureString(body.password, 'password', { maxLength: 200 });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    try {
        const res = await db.query(
            "SELECT * FROM users WHERE username = $1 AND active = true",
            [username]
        );

        if (res.rows.length === 0) {
            return reply.code(401).send({ error: 'Credenciales invalidas' });
        }

        const user = res.rows[0];
        const { valid, needsRehash } = verifyPassword(password, user.password_hash);

        if (!valid) {
            return reply.code(401).send({ error: 'Credenciales invalidas' });
        }

        const token = crypto.randomBytes(32).toString('hex');

        if (needsRehash) {
            await db.query(
                "UPDATE users SET session_token = $1, password_hash = $2 WHERE id = $3",
                [token, hashPassword(password), user.id]
            );
        } else {
            await db.query("UPDATE users SET session_token = $1 WHERE id = $2", [token, user.id]);
        }

        return {
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                location_id: user.location_id,
                username: user.username,
            }
        };
    } catch (e) {
        console.error(e);
        return reply.code(500).send({ error: 'Error en el servidor' });
    }
};

exports.logout = async (req, reply) => {
    let token = null;
    try {
        const body = ensureObject(req.body, 'logout');
        token = ensureString(body.token, 'token', { required: false, maxLength: 255 });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    if (token) {
        await db.query("UPDATE users SET session_token = NULL WHERE session_token = $1", [token]);
    }
    return { success: true };
};

exports.me = async (req, reply) => {
    const token = getBearerToken(req.headers.authorization);
    if (!token) return reply.code(401).send({ error: 'No token' });

    const res = await db.query(
        "SELECT id, full_name, role, location_id, username FROM users WHERE session_token = $1 AND active = true",
        [token]
    );

    if (res.rows.length === 0) return reply.code(401).send({ error: 'Invalid token' });

    return res.rows[0];
};
