const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gmao',
    password: process.env.DB_PASSWORD || 'change_me',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Creating spare_parts table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS spare_parts (
                id SERIAL PRIMARY KEY,
                part_number VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                stock_current INTEGER NOT NULL DEFAULT 0,
                stock_min INTEGER NOT NULL DEFAULT 0,
                cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                location VARCHAR(255),
                supplier_name VARCHAR(255),
                supplier_contact VARCHAR(255),
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Creating part_consumptions table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS part_consumptions (
                id SERIAL PRIMARY KEY,
                history_id INTEGER REFERENCES maintenance_history(id) ON DELETE CASCADE,
                intervention_id INTEGER REFERENCES intervention_logs(id) ON DELETE CASCADE,
                spare_part_id INTEGER REFERENCES spare_parts(id) ON DELETE RESTRICT,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_cost_at_time DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log("✅ Tablas 'spare_parts' y 'part_consumptions' creadas correctamente.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating tables:', e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
