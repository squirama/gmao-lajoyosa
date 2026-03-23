const REQUIRED_ENV_VARS = [
    'DB_USER',
    'DB_HOST',
    'DB_NAME',
    'DB_PASSWORD',
    'DB_PORT',
];

function validateEnv() {
    const missingVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const hasAdminUser = Boolean(process.env.ADMIN_USER);
    const hasAdminPassword = Boolean(process.env.ADMIN_PASSWORD);
    if (hasAdminUser !== hasAdminPassword) {
        throw new Error('ADMIN_USER and ADMIN_PASSWORD must be defined together.');
    }
}

module.exports = {
    validateEnv,
};
