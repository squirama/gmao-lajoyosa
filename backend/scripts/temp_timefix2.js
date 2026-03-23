const { Pool } = require('pg');
const pool = new Pool({ user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao' });

async function run() {
    try {
        // The user wants the hours to be strictly between 07:00 and 14:00.
        // That means the hour should be 7 + a random number from 0 to 7 (to get up to 14).

        // date_trunc('day', performed_date) sets the time to 00:00:00.
        // + (floor(random() * 8) + 7) * interval '1 hour' -> randomizes between 7 and 14 inclusive.
        // + floor(random() * 60) * interval '1 minute' -> randomizes minutes.

        const res = await pool.query(`
      UPDATE maintenance_history 
      SET created_at = date_trunc('day', performed_date) 
                       + (floor(random() * 8) + 7) * interval '1 hour' 
                       + floor(random() * 60) * interval '1 minute'
      WHERE asset_id IN (1, 26)
    `);

        console.log('Fixed time for rows:', res.rowCount);

        // Let's verify
        const verify = await pool.query("SELECT id, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted FROM maintenance_history WHERE asset_id IN (1, 26) LIMIT 10");
        console.log("Samples after fix:", JSON.stringify(verify.rows, null, 2));

    } catch (e) { console.error(e) } finally { pool.end() }
}
run();
