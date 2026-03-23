const path = require('path');
const dotenv = require('dotenv');

// Load env
const result = dotenv.config({ path: path.join(__dirname, '../.env') });
if (result.error) console.error('Error loading .env:', result.error);

const { Pool } = require('pg');

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
        console.log('🔄 Running V3 Migration (Alerts & Postponement)...');
        await client.query('BEGIN');

        // 1. Alter maintenance_plans
        console.log('   - Adding notify_external to maintenance_plans...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_plans' AND column_name = 'notify_external') THEN
                    ALTER TABLE maintenance_plans ADD COLUMN notify_external BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);

        // 2. Create pending_alerts
        console.log('   - Creating pending_alerts table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS pending_alerts (
                id SERIAL PRIMARY KEY,
                plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
                asset_id INTEGER REFERENCES assets(id),
                scheduled_date DATE NOT NULL,
                postpone_count INTEGER DEFAULT 0,
                email_sent BOOLEAN DEFAULT FALSE,
                UNIQUE(plan_id, scheduled_date)
            );
        `);

        // 3. Create postponement_history
        console.log('   - Creating postponement_history table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS postponement_history (
                id SERIAL PRIMARY KEY,
                alert_id INTEGER,
                previous_date DATE,
                new_date DATE,
                user_id INTEGER REFERENCES users(id),
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query('COMMIT');
        console.log('✅ Migration V3 Complete!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
