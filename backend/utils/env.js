function validateEnv() {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
    const hasIndividualVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT']
        .every((name) => process.env[name]);

    if (!hasDatabaseUrl && !hasIndividualVars) {
        throw new Error(
            'Se requiere DATABASE_URL o las variables DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT'
        );
    }

    const hasAdminUser = Boolean(process.env.ADMIN_USER);
    const hasAdminPassword = Boolean(process.env.ADMIN_PASSWORD);
    if (hasAdminUser !== hasAdminPassword) {
        throw new Error('ADMIN_USER and ADMIN_PASSWORD must be defined together.');
    }
}

module.exports = { validateEnv };
