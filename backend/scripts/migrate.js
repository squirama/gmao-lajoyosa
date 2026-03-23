const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../db');
const { runMigrations } = require('../db/migrationRunner');

async function main() {
    const client = await db.connect();
    try {
        const result = await runMigrations(client, { logger: console });
        console.log(`Migrations complete. Pending before run: ${result.pendingCount}`);
    } catch (error) {
        console.error('Migration execution failed:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
}

main();
