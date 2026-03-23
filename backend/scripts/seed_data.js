const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../db');

async function ensureLocation(client, name) {
    const existing = await client.query('SELECT id FROM locations WHERE name = $1 LIMIT 1', [name]);
    if (existing.rows[0]) return existing.rows[0].id;

    const inserted = await client.query(
        'INSERT INTO locations (name) VALUES ($1) RETURNING id',
        [name]
    );
    return inserted.rows[0].id;
}

async function ensureDepartment(client, locationId, name) {
    const existing = await client.query(
        'SELECT id FROM departments WHERE location_id = $1 AND name = $2 LIMIT 1',
        [locationId, name]
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const inserted = await client.query(
        'INSERT INTO departments (location_id, name) VALUES ($1, $2) RETURNING id',
        [locationId, name]
    );
    return inserted.rows[0].id;
}

async function ensureAsset(client, deptId, name, brand, model) {
    const existing = await client.query(
        'SELECT id FROM assets WHERE dept_id = $1 AND name = $2 LIMIT 1',
        [deptId, name]
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const inserted = await client.query(
        `INSERT INTO assets (dept_id, name, brand, model)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [deptId, name, brand, model]
    );
    return inserted.rows[0].id;
}

async function ensurePlan(client, assetId, taskDescription, frequencyDays) {
    const existing = await client.query(
        `SELECT id FROM maintenance_plans
         WHERE asset_id = $1 AND task_description = $2 AND frequency_days = $3
         LIMIT 1`,
        [assetId, taskDescription, frequencyDays]
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const inserted = await client.query(
        `INSERT INTO maintenance_plans (asset_id, task_description, frequency_days, start_date, next_due_date)
         VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE)
         RETURNING id`,
        [assetId, taskDescription, frequencyDays]
    );
    return inserted.rows[0].id;
}

async function seed() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const locationId = await ensureLocation(client, 'Demo Site');
        const deptId = await ensureDepartment(client, locationId, 'Maintenance');
        const assetId = await ensureAsset(client, deptId, 'Demo Asset', 'Generic', 'Model X');

        await ensurePlan(client, assetId, 'General Lubrication', 7);
        await ensurePlan(client, assetId, 'Head Cleaning', 1);
        await ensurePlan(client, assetId, 'Bearing Inspection', 30);

        await client.query('COMMIT');
        console.log('Seed data ensured successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
}

seed();
