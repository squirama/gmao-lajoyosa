const test = require('node:test');
const assert = require('node:assert/strict');

const {
    fetchCalendarHistory,
    fetchCalendarPlans,
} = require('../repositories/configRepository');
const { createFakeClient } = require('./helpers');

test('fetchCalendarHistory parametriza el alcance por location admin', async () => {
    const client = createFakeClient(async (sql, params) => {
        assert.match(sql, /a\.dept_id IN \(SELECT id FROM departments WHERE location_id = \$1\)/);
        assert.match(sql, /a\.dept_id = \$2/);
        assert.deepEqual(params, [5, 12]);
        return { rows: [] };
    });

    await fetchCalendarHistory(client, {
        isSuperAdmin: false,
        isAdmin: true,
        locationId: 5,
        allowedDeptIds: [],
    }, {
        departmentId: '12',
    });
});

test('fetchCalendarPlans usa ANY parametrizado para operarios', async () => {
    const client = createFakeClient(async (sql, params) => {
        assert.match(sql, /a\.dept_id = ANY\(\$1::int\[\]\)/);
        assert.ok(!sql.includes('3,7,9'));
        assert.deepEqual(params, [[3, 7, 9]]);
        return { rows: [] };
    });

    await fetchCalendarPlans(client, {
        isSuperAdmin: false,
        isAdmin: false,
        locationId: null,
        allowedDeptIds: [3, 7, 9],
    });
});

test('fetchCalendarHistory acepta filtro por sede y activo', async () => {
    const client = createFakeClient(async (sql, params) => {
        assert.match(sql, /d\.location_id = \$2/);
        assert.match(sql, /h\.asset_id = \$3/);
        assert.deepEqual(params, [[3, 7, 9], 5, 44]);
        return { rows: [] };
    });

    await fetchCalendarHistory(client, {
        isSuperAdmin: false,
        isAdmin: false,
        locationId: null,
        allowedDeptIds: [3, 7, 9],
    }, {
        locationId: '5',
        assetId: '44',
    });
});

test('fetchCalendarPlans acepta filtro por sede y activo para admin limitado', async () => {
    const client = createFakeClient(async (sql, params) => {
        assert.match(sql, /a\.dept_id = ANY\(\$1::int\[\]\)/);
        assert.match(sql, /d\.location_id = \$2/);
        assert.match(sql, /p\.asset_id = \$3/);
        assert.deepEqual(params, [[11, 12], 8, 77]);
        return { rows: [] };
    });

    await fetchCalendarPlans(client, {
        isSuperAdmin: false,
        isAdmin: false,
        locationId: null,
        allowedDeptIds: [11, 12],
    }, {
        locationId: '8',
        assetId: '77',
    });
});
