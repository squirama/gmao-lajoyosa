const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function getMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];

    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((file) => file.endsWith('.sql'))
        .sort()
        .map((file) => ({
            name: file,
            fullPath: path.join(MIGRATIONS_DIR, file),
            sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'),
        }));
}

async function ensureMigrationsTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

async function getAppliedMigrations(client) {
    await ensureMigrationsTable(client);
    const res = await client.query('SELECT name, applied_at FROM schema_migrations ORDER BY name');
    return res.rows;
}

async function runMigrations(client, { logger = console } = {}) {
    await ensureMigrationsTable(client);

    const appliedRows = await getAppliedMigrations(client);
    const applied = new Set(appliedRows.map((row) => row.name));
    const pending = getMigrationFiles().filter((migration) => !applied.has(migration.name));

    for (const migration of pending) {
        logger.log(`Applying migration ${migration.name}...`);
        await client.query('BEGIN');
        try {
            await client.query(migration.sql);
            await client.query(
                'INSERT INTO schema_migrations (name) VALUES ($1)',
                [migration.name]
            );
            await client.query('COMMIT');
            logger.log(`Applied migration ${migration.name}`);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Migration failed: ${migration.name}`);
            throw error;
        }
    }

    return {
        applied: appliedRows,
        pendingCount: pending.length,
    };
}

module.exports = {
    MIGRATIONS_DIR,
    ensureMigrationsTable,
    getAppliedMigrations,
    getMigrationFiles,
    runMigrations,
};
