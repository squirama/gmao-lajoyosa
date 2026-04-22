const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const HistoryController = require('../controllers/HistoryController');
const { createFakeClient, createReply } = require('./helpers');

test('getMaintenanceHistory devuelve historial scopeado por sede admin y con filtros', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 4,
                    role: 'ADMIN',
                    location_id: 3,
                    full_name: 'Admin Sede',
                }],
            };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 4);
            return { rows: [] };
        }

        if (sql.includes('FROM maintenance_history h')) {
            assert.equal(params[0], 3);
            assert.equal(params[1], '2026-03-01');
            assert.equal(params[2], '2026-03-31');
            assert.equal(params[3], 9);
            assert.match(sql, /h\.document_path IS NOT NULL/);
            return {
                rows: [{
                    id: 99,
                    asset_name: 'Llenadora 1',
                    task_description: 'Revision mensual',
                    document_path: '["/documents/parte.pdf"]',
                    entry_type: 'preventive',
                }],
            };
        }

        if (sql.includes('FROM intervention_logs l')) {
            assert.equal(params[0], 3);
            assert.equal(params[1], '2026-03-01');
            assert.equal(params[2], '2026-03-31');
            assert.equal(params[3], 9);
            assert.match(sql, /l\.document_path IS NOT NULL/);
            return {
                rows: [{
                    id: 100,
                    asset_name: 'Llenadora 1',
                    task_description: 'Averia general',
                    document_path: '["/documents/correctivo.pdf"]',
                    entry_type: 'corrective',
                    created_at: '2026-03-20T08:30:00.000Z',
                }],
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await HistoryController.getMaintenanceHistory({
            headers: { authorization: 'Bearer token-admin' },
            query: {
                start: '2026-03-01',
                end: '2026-03-31',
                asset_id: '9',
                with_documents: 'true',
            },
        }, createReply());

        assert.equal(result.length, 2);
        assert.equal(result[0].entry_type, 'corrective');
        assert.equal(result[1].entry_type, 'preventive');
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('getMaintenanceHistory valida fechas invalidas', async () => {
    const reply = createReply();

    const response = await HistoryController.getMaintenanceHistory({
        headers: { authorization: 'Bearer token-admin' },
        query: { start: '2026/03/01' },
    }, reply);

    assert.deepEqual(response, { error: 'start debe tener formato YYYY-MM-DD' });
    assert.equal(reply.getStatusCode(), 400);
});

test('reviewHistoryEntry marca un preventivo como revisado por el admin autenticado', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 4,
                    role: 'ADMIN',
                    location_id: 3,
                    full_name: 'Admin Sede',
                }],
            };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 4);
            return { rows: [] };
        }

        if (sql.includes('UPDATE maintenance_history h')) {
            assert.equal(params[0], 4);
            assert.equal(params[1], 'Admin Sede');
            assert.equal(params[2], 3);
            assert.equal(params[3], 99);
            return {
                rows: [{
                    id: 99,
                    reviewed_by: 4,
                    reviewed_by_label: 'Admin Sede',
                    reviewed_at: '2026-04-20T10:00:00.000Z',
                }],
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await HistoryController.reviewHistoryEntry({
            headers: { authorization: 'Bearer token-admin' },
            params: {
                entry_type: 'preventive',
                id: '99',
            },
        }, createReply());

        assert.equal(result.id, 99);
        assert.equal(result.reviewed_by, 4);
        assert.equal(result.reviewed_by_label, 'Admin Sede');
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('reviewHistoryEntry marca un correctivo como revisado por departamento autorizado', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 12,
                    role: 'OPERATOR',
                    location_id: null,
                    full_name: 'Supervisor Calidad',
                }],
            };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 12);
            return { rows: [{ department_id: 8 }] };
        }

        if (sql.includes('UPDATE intervention_logs l')) {
            assert.equal(params[0], 12);
            assert.equal(params[1], 'Supervisor Calidad');
            assert.deepEqual(params[2], [8]);
            assert.equal(params[3], 41);
            return {
                rows: [{
                    id: 41,
                    reviewed_by: 12,
                    reviewed_by_label: 'Supervisor Calidad',
                    reviewed_at: '2026-04-20T10:30:00.000Z',
                }],
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await HistoryController.reviewHistoryEntry({
            headers: { authorization: 'Bearer token-dept' },
            params: {
                entry_type: 'corrective',
                id: '41',
            },
        }, createReply());

        assert.equal(result.id, 41);
        assert.equal(result.reviewed_by, 12);
        assert.equal(result.reviewed_by_label, 'Supervisor Calidad');
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('reviewHistoryEntry permite firmar como Admin cuando entra por acceso basico', async () => {
    const originalConnect = db.connect;
    const originalAdminUser = process.env.ADMIN_USER;
    const originalAdminPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';

    const basicAuth = `Basic ${Buffer.from('admin:secret').toString('base64')}`;

    const client = createFakeClient(async (sql, params) => {
        if (sql.includes('UPDATE maintenance_history h')) {
            assert.equal(params[0], null);
            assert.equal(params[1], 'Admin');
            assert.equal(params[2], 15);
            return {
                rows: [{
                    id: 15,
                    reviewed_by: null,
                    reviewed_by_label: 'Admin',
                    reviewed_at: '2026-04-20T11:00:00.000Z',
                }],
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await HistoryController.reviewHistoryEntry({
            headers: { authorization: basicAuth },
            params: {
                entry_type: 'preventive',
                id: '15',
            },
        }, createReply());

        assert.equal(result.id, 15);
        assert.equal(result.reviewed_by, null);
        assert.equal(result.reviewed_by_label, 'Admin');
    } finally {
        db.connect = originalConnect;
        process.env.ADMIN_USER = originalAdminUser;
        process.env.ADMIN_PASSWORD = originalAdminPassword;
    }
});
