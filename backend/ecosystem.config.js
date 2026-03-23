module.exports = {
    apps: [{
        name: 'gmao-backend',
        script: './server.js',
        cwd: __dirname,
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env_file: './.env',
        env: {
            NODE_ENV: 'production',
        },
    }],
};
