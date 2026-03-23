const { Pool } = require('pg');
const pool = new Pool({ user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao' });

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // We want to find the ~10% of generated records (asset 1, 26) 
        // that DO NOT have "Completado desde App".
        // 
        // And for those, we will scatter basic comments like:
        // "Todo OK", "Revisado", "Limpio", "OK", "Sin incidencias"

        const basicNotes = [
            "Todo OK",
            "Revisado",
            "Limpio",
            "OK",
            "Sin incidencias",
            "Hecho",
            "Completado"
        ];

        const records = await client.query(`
      SELECT id 
      FROM maintenance_history 
      WHERE asset_id IN (1, 26) 
        AND notes != 'Completado desde App'
    `);

        console.log(`Found ${records.rowCount} custom notes to replace with basic ones.`);

        let updated = 0;
        for (const row of records.rows) {
            const rndNote = basicNotes[Math.floor(Math.random() * basicNotes.length)];
            await client.query(`UPDATE maintenance_history SET notes = $1 WHERE id = $2`, [rndNote, row.id]);
            updated++;
        }

        await client.query('COMMIT');
        console.log(`Successfully randomized basic comments for ${updated} rows.`);

        // Verificamos
        const res = await client.query(`
      SELECT TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha, notes 
      FROM maintenance_history 
      WHERE asset_id IN (1, 26) AND notes != 'Completado desde App'
      LIMIT 10
    `);

        console.log("Samples of the customized notes (the 10%):", res.rows);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
