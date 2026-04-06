const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const ProviderController = require('../controllers/ProviderController');
const { createFakeClient, createReply } = require('./helpers');

test('getProviders filtra proveedores por departamentos asignados al admin limitado', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 17,
                    role: 'ADMIN',
                    location_id: null,
                }],
            };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 17);
            return { rows: [{ department_id: 4 }] };
        }

        if (sql.startsWith('SELECT p.*, COALESCE(array_agg(DISTINCT pd.department_id)')) {
            assert.deepEqual(params[0], [4]);
            return {
                rows: [{
                    id: 9,
                    company_name: 'Frio Industrial',
                    service_type: 'Frio',
                    active: true,
                    department_ids: [4],
                    asset_ids: [12],
                    document_count: '2',
                    expired_documents: '1',
                    expiring_documents: '0',
                }],
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await ProviderController.getProviders({
            headers: { authorization: 'Bearer token-admin' },
        }, createReply());

        assert.equal(result.length, 1);
        assert.equal(result[0].company_name, 'Frio Industrial');
        assert.deepEqual(result[0].department_ids, [4]);
        assert.equal(result[0].expired_documents, 1);
    } finally {
        db.connect = originalConnect;
    }
});
