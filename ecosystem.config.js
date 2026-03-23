module.exports = {
    apps: [{
        name: "gmao-backend",
        script: "./backend/server.js",
        instances: 1,
        exec_mode: "fork",
        env: {
            NODE_ENV: "production",
            PORT: 3000,
            MANUALS_PATH: "C:/Manuals", // Example default, user should override or ensure this exists
            // ADMIN_PASSWORD should be set in the machine's environment buffer or .env file
        },
        watch: false,
        max_memory_restart: '1G'
    }]
};
