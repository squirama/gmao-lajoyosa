const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao'
});

async function run() {
    try {
        const res1 = await pool.query('UPDATE maintenance_history SET created_at = performed_date WHERE asset_id = 1');
        console.log('Updated Llenadora created_at rows:', res1.rowCount);

        const res2 = await pool.query(`
      SELECT a.id, a.name, l.name as loc 
      FROM assets a 
      LEFT JOIN departments d ON a.dept_id = d.id 
      LEFT JOIN locations l ON d.location_id = l.id 
      WHERE a.name ILIKE '%lavadora%'
    `);
        console.log('Lavadora assets:', JSON.stringify(res2.rows, null, 2));
    } catch (e) { console.error(e) } finally { pool.end() }
}
run();
