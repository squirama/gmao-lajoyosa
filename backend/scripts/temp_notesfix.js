const { Pool } = require('pg');
const pool = new Pool({ user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao' });

async function run() {
    try {
        // The user wants 90% of the historical generated records to have the default notes.
        // The default note in the App is 'Completado desde App'
        // Let's randomize it: if random() < 0.9, use 'Completado desde App'

        // We only update records that were part of our generation script (so asset_id 1 and 26)
        // and exclude those that are specifically marked as "SEMANA SALTADA" if we want to preserve that context?
        // Actually the user probably wants ALL generated history to look organic, even the skipped/moved ones.
        // Let's preserve "SEMANA SALTADA" (since it denotes it wasn't done), but replace others.

        const res = await pool.query(`
      UPDATE maintenance_history 
      SET notes = 'Completado desde App'
      WHERE asset_id IN (1, 26) 
        AND random() < 0.9 
        AND notes NOT ILIKE '%SALTADA%'
    `);

        console.log('Fixed notes for rows:', res.rowCount);

        const count = await pool.query("SELECT count(*) FROM maintenance_history WHERE asset_id IN (1, 26) AND notes = 'Completado desde App'");
        console.log("Total rows with default message:", count.rows[0].count);

    } catch (e) { console.error(e) } finally { pool.end() }
}
run();
