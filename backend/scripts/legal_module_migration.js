const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db/index.js');

async function migrate() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        console.log("--> Adding 'is_legal' column to maintenance_plans...");
        await client.query(`
            ALTER TABLE maintenance_plans 
            ADD COLUMN IF NOT EXISTS is_legal BOOLEAN DEFAULT FALSE;
        `);

        console.log("--> Adding 'document_path' column to maintenance_history...");
        await client.query(`
            ALTER TABLE maintenance_history 
            ADD COLUMN IF NOT EXISTS document_path TEXT;
        `);

        // Optional: Add index for performance in filtering legal plans
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_plans_is_legal ON maintenance_plans(is_legal);
        `);

        await client.query('COMMIT');
        console.log("✅ Legal Module Migration Successful!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", e);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
