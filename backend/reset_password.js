const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

async function run() {
    await client.connect();
    try {
        console.log('--- RESETTING ADMIN PASSWORD ---');
        const newPass = '1234';
        const hash = hashPassword(newPass);

        // Ensure user is active and role is correct
        const res = await client.query(
            "UPDATE users SET password_hash = $1, active = true, role = 'SUPER_ADMIN' WHERE username = 'admin'",
            [hash]
        );

        if (res.rowCount > 0) {
            console.log(`✅ Success: Password for 'admin' set to '${newPass}'. Role is SUPER_ADMIN.`);
        } else {
            console.error('❌ Error: User admin not found.');
        }

    } catch (err) {
        console.error('Reset failed:', err);
    } finally {
        await client.end();
    }
}

run();
