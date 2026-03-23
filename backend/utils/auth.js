const crypto = require('crypto');
const db = require('../db');

function getBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7).trim() || null;
}

function getBasicHeader() {
    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) return null;
    const credentials = Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).toString('base64');
    return `Basic ${credentials}`;
}

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isBasicAdminAuth(authHeader) {
    const expectedHeader = getBasicHeader();
    if (!expectedHeader || !authHeader || !authHeader.startsWith('Basic ')) return false;
    return safeEqual(authHeader, expectedHeader);
}

function isAdminRole(role) {
    return ['admin', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

async function getUserBySessionToken(token, client = db) {
    if (!token) return null;

    const res = await client.query(
        "SELECT * FROM users WHERE session_token = $1 AND active = true",
        [token]
    );

    return res.rows[0] || null;
}

async function resolveAuthContext(authHeader, client = db) {
    if (isBasicAdminAuth(authHeader)) {
        return {
            authType: 'basic',
            isAuthenticated: true,
            isSuperAdmin: true,
            isAdmin: true,
            user: null,
            token: null,
        };
    }

    const token = getBearerToken(authHeader);
    if (!token) {
        return {
            authType: null,
            isAuthenticated: false,
            isSuperAdmin: false,
            isAdmin: false,
            user: null,
            token: null,
        };
    }

    const user = await getUserBySessionToken(token, client);
    if (!user) {
        return {
            authType: 'bearer',
            isAuthenticated: false,
            isSuperAdmin: false,
            isAdmin: false,
            user: null,
            token,
        };
    }

    return {
        authType: 'bearer',
        isAuthenticated: true,
        isSuperAdmin: user.role === 'SUPER_ADMIN',
        isAdmin: isAdminRole(user.role),
        user,
        token,
    };
}

function sendUnauthorized(reply) {
    return reply
        .code(401)
        .header('WWW-Authenticate', 'Basic realm="Admin Access", Bearer')
        .send({ error: 'Unauthorized Access' });
}

module.exports = {
    getBearerToken,
    getUserBySessionToken,
    isAdminRole,
    isBasicAdminAuth,
    resolveAuthContext,
    sendUnauthorized,
};
