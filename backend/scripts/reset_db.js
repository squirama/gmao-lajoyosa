const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../db');
const { runMigrations } = require('../db/migrationRunner');

async function resetDb() {
    const client = await db.connect();
    try {
        console.log('Resetting public schema...');
        await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
        await client.query('CREATE SCHEMA public;');

        await runMigrations(client, { logger: console });
        console.log('Database reset completed.');
    } catch (error) {
        console.error('Database reset failed:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
}

resetDb();
