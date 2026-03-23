const { Pool } = require('pg');
const pool = new Pool({ user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'change_me', host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: process.env.DB_NAME || 'gmao' });

async function run() {
    try {
        const res = await pool.query("SELECT id, performed_date, created_at FROM maintenance_history LIMIT 5");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e) } finally { pool.end() }
}
run();
