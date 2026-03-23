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

        console.log("Creating asset_spare_parts table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS asset_spare_parts (
                asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
                spare_part_id INTEGER REFERENCES spare_parts(id) ON DELETE CASCADE,
                PRIMARY KEY (asset_id, spare_part_id)
            );
        `);

        await client.query('COMMIT');
        console.log("✅ Tabla 'asset_spare_parts' creada.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating table:', e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
