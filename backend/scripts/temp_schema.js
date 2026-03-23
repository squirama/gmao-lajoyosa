const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao'
});

async function run() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'maintenance_history'
    `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e) } finally { pool.end() }
}
run();
