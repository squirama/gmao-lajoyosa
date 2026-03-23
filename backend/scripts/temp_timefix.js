const { Pool } = require('pg');
const pool = new Pool({ user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao' });

async function run() {
    try {
        // Both Llenadora (1) and Lavadora (26) have records where created_at time is basically 00:00.
        // They are missing the randomized hours. 
        // We will update the created_at column by taking its date, and adding a random time between 07:00 and 17:00.

        // In PostgreSQL, you can do this by date_trunc('day', created_at) + interval 'X hours' + interval 'Y minutes'

        const res = await pool.query(`
      UPDATE maintenance_history 
      SET created_at = date_trunc('day', performed_date) 
                       + (floor(random() * 10) + 7) * interval '1 hour' 
                       + floor(random() * 60) * interval '1 minute'
      WHERE asset_id IN (1, 26)
    `);

        console.log('Fixed time for rows:', res.rowCount);

        // Let's verify
        const verify = await pool.query("SELECT id, created_at, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted FROM maintenance_history WHERE asset_id IN (1, 26) LIMIT 5");
        console.log("Samples after fix:", JSON.stringify(verify.rows, null, 2));

    } catch (e) { console.error(e) } finally { pool.end() }
}
run();
