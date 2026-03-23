const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../db');
const { ensureMigrationsTable, getAppliedMigrations, getMigrationFiles } = require('../db/migrationRunner');

async function main() {
    const client = await db.connect();
    try {
        await ensureMigrationsTable(client);
        const files = getMigrationFiles();
        const applied = await getAppliedMigrations(client);
        const appliedMap = new Map(applied.map((row) => [row.name, row.applied_at]));

        for (const file of files) {
            const appliedAt = appliedMap.get(file.name);
            console.log(`${appliedAt ? 'APPLIED ' : 'PENDING '} ${file.name}${appliedAt ? ` @ ${appliedAt.toISOString()}` : ''}`);
        }
    } catch (error) {
        console.error('Unable to read migration status:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
}

main();
