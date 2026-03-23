const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function migrate() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        console.log("Creating user_locations table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_locations (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, location_id)
            );
        `);

        // Migrate existing data
        console.log("Migrating existing relationships...");
        const res = await client.query("SELECT id, location_id FROM users WHERE location_id IS NOT NULL");
        for (const user of res.rows) {
            await client.query(
                "INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [user.id, user.location_id]
            );
        }

        await client.query('COMMIT');
        console.log("Migration successful!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
