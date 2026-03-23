require('dotenv').config({ path: '../.env' }); // Adjust path if needed
const db = require('../db');

async function migrate() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        console.log('🔄 Starting Migration: Hierarchical Emails...');

        // 1. Locations
        console.log('Adding email to locations...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='email') THEN 
                    ALTER TABLE locations ADD COLUMN email VARCHAR(255); 
                END IF; 
            END $$;
        `);

        // 2. Departments
        console.log('Adding email to departments...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='email') THEN 
                    ALTER TABLE departments ADD COLUMN email VARCHAR(255); 
                END IF; 
            END $$;
        `);

        // 3. Maintenance Plans
        console.log('Adding notification_email to maintenance_plans...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maintenance_plans' AND column_name='notification_email') THEN 
                    ALTER TABLE maintenance_plans ADD COLUMN notification_email VARCHAR(255); 
                END IF; 
            END $$;
        `);

        await client.query('COMMIT');
        console.log('✅ Migration Confirmed: Email columns added.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
