const { Pool } = require('pg');
require('dotenv').config(); // Defaults to .env in CWD

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("Applying V3.2 Schema Changes...");

        // 1. Check if column is generated
        // PostgreSQL doesn't easily allow dropping GENERATED property, usually easier to drop column and re-add.
        // But we want to keep data.
        // Strategy: Add temp column, copy data, drop old, rename temp.

        console.log("1. Creating temporary column...");
        await client.query('ALTER TABLE maintenance_plans ADD COLUMN next_due_date_static DATE');

        console.log("2. Copying calculated values...");
        // If last_performed is null, maybe defaults to now? Or keep null?
        // Logic: next_due_date WAS (last_performed + interval).
        // If last_performed is NULL, next_due_date was NULL?
        // Let's assume we populate based on existing logic.
        await client.query(`
            UPDATE maintenance_plans 
            SET next_due_date_static = 
                CASE 
                    WHEN last_performed IS NOT NULL THEN (last_performed + make_interval(days => frequency_days))::date
                    ELSE CURRENT_DATE
                END
        `);

        console.log("3. Dropping old generated column...");
        await client.query('ALTER TABLE maintenance_plans DROP COLUMN next_due_date');

        console.log("4. Renaming new column...");
        await client.query('ALTER TABLE maintenance_plans RENAME COLUMN next_due_date_static TO next_due_date');

        // Verify Structure
        console.log("5. Verifying...");
        const res = await client.query("SELECT column_name, is_generated FROM information_schema.columns WHERE table_name = 'maintenance_plans' AND column_name = 'next_due_date'");
        console.log("Column Info:", res.rows[0]);

        await client.query('COMMIT');
        console.log("✅ Migration V3.2 Successful");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
