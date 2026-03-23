const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

async function migrate() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        console.log("Adding 'solution' column to intervention_logs...");
        await client.query(`
            ALTER TABLE intervention_logs 
            ADD COLUMN IF NOT EXISTS solution TEXT;
        `);

        await client.query('COMMIT');
        console.log("Migration successful!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
