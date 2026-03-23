const { buildApp } = require('./app');

const start = async () => {
    try {
        const fastify = await buildApp({ logger: true });
        await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
        const address = fastify.server.address();
        console.log(`
        #################################################
          SISTEMA GMAO CENTRALIZADO Y OPERATIVO
        -------------------------------------------------
          Puerto: ${address.port}
        #################################################
        `);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
