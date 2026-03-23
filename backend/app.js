const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fs = require('fs');
const fastifyFactory = require('fastify');
const nodemailer = require('nodemailer');

const { resolveAuthContext, sendUnauthorized } = require('./utils/auth');
const { validateEnv } = require('./utils/env');

function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function createMailer() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_SECURE !== 'false',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
    });
}

async function buildApp(options = {}) {
    validateEnv();

    const fastify = fastifyFactory({ logger: options.logger ?? true });
    fastify.decorate('mailer', createMailer());

    await fastify.register(require('@fastify/cors'), { origin: true });
    await fastify.register(require('@fastify/multipart'), {
        limits: {
            fileSize: 50 * 1024 * 1024,
        },
    });

    const manualsPath = process.env.MANUALS_PATH || path.join(__dirname, 'manuals');
    const documentsPath = process.env.DOCUMENTS_PATH || path.join(__dirname, 'uploads', 'documents');
    const distPath = path.join(__dirname, 'dist');

    ensureDirectory(manualsPath);
    ensureDirectory(documentsPath);

    await fastify.register(require('@fastify/static'), {
        root: manualsPath,
        prefix: '/manuals/',
        decorateReply: false,
    });

    await fastify.register(require('@fastify/static'), {
        root: documentsPath,
        prefix: '/documents/',
        decorateReply: false,
    });

    fastify.get('/health', async () => ({ status: 'ok' }));

    fastify.addHook('onRequest', async (request, reply) => {
        const protectedRoute = (
            request.url.startsWith('/api/admin') ||
            request.url.startsWith('/api/config') ||
            request.url.startsWith('/api/calendar/events')
        );

        if (!protectedRoute) {
            return;
        }

        try {
            const authContext = await resolveAuthContext(request.headers.authorization);
            request.auth = authContext;

            if (!authContext.isAuthenticated) {
                fastify.log.warn(`Blocked unauthenticated admin request. IP: ${request.ip}`);
                return sendUnauthorized(reply);
            }

            if (!request.url.startsWith('/api/admin')) {
                return;
            }

            if (authContext.authType === 'basic' || authContext.isAdmin) {
                return;
            }

            const isOperatorTask = request.url.includes('/complete') || request.url.includes('/upload');
            if (isOperatorTask) {
                return;
            }

            fastify.log.warn(`Blocked unauthorized admin request. IP: ${request.ip}`);
            return sendUnauthorized(reply);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Authentication failed' });
        }
    });

    await fastify.register(require('@fastify/static'), {
        root: path.join(distPath, 'assets'),
        prefix: '/assets/',
        decorateReply: false,
    });

    await fastify.register(require('@fastify/static'), {
        root: distPath,
        prefix: '/',
        wildcard: true,
    });

    fastify.get('/admin', async (request, reply) => {
        const indexPath = path.join(distPath, 'index.html');
        try {
            const html = await fs.promises.readFile(indexPath, 'utf8');
            reply.type('text/html').send(html);
        } catch (error) {
            reply.code(404).send('Panel de administracion no encontrado');
        }
    });

    try {
        await fastify.register(require('./routes'), { prefix: '/api' });
    } catch (error) {
        console.error("ERROR FATAL: No se encuentra './routes/index.js'");
        throw error;
    }

    fastify.setNotFoundHandler(async (request, reply) => {
        if (request.url.startsWith('/api')) {
            reply.code(404).send({ error: 'Endpoint API no encontrado' });
            return;
        }

        const indexPath = path.join(distPath, 'index.html');
        try {
            const html = await fs.promises.readFile(indexPath, 'utf8');
            reply.type('text/html').send(html);
        } catch (error) {
            fastify.log.error(error);
            reply.code(500).send('Error critico: dist/index.html no encontrado');
        }
    });

    return fastify;
}

module.exports = {
    buildApp,
};
