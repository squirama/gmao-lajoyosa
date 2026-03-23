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
