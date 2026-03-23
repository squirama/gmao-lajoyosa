const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao'
});

async function run() {
    try {
        const res = await pool.query(`
      SELECT mp.id, mp.task_description, mp.frequency_days, mp.start_date, mp.next_due_date 
      FROM maintenance_plans mp 
      WHERE mp.asset_id = 26
    `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e) } finally { pool.end() }
}
run();
