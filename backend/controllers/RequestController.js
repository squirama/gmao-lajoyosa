const db = require('../db');
const nodemailer = require('nodemailer');
const {
    ensureEnum,
    ensureObject,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.dondominio.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || 'mantenimiento@bodegascare.com',
        pass: process.env.SMTP_PASS,
    },
});

exports.createRequest = async (req, reply) => {
    let operatorName;
    let reason;
    let urgency;

    try {
        const body = ensureObject(req.body, 'request');
        operatorName = ensureString(body.operator_name, 'operator_name', { maxLength: 120 });
        reason = ensureString(body.reason, 'reason', { maxLength: 2000 });
        urgency = ensureEnum(body.urgency, 'urgency', ['Baja', 'Media', 'Alta'], {
            required: false,
            defaultValue: 'Baja',
        });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    try {
        const res = await db.query(
            'INSERT INTO maintenance_requests (operator_name, reason, urgency) VALUES ($1, $2, $3) RETURNING *',
            [operatorName, reason, urgency]
        );

        try {
            await transporter.sendMail({
                from: `"GMAO System" <${process.env.SMTP_USER || 'mantenimiento@bodegascare.com'}>`,
                to: 'mantenimiento@bodegascare.com',
                subject: `Solicitud mantenimiento: ${urgency.toUpperCase()}`,
                text: `Operario: ${operatorName}\nMotivo: ${reason}\nUrgencia: ${urgency}\n\nRevisar panel de administracion.`,
            });
            console.log('Request email sent.');
        } catch (emailErr) {
            console.error('Request email failed:', emailErr);
        }

        return res.rows[0];
    } catch (e) {
        reply.code(500).send({ error: e.message });
    }
};

exports.getAllRequests = async () => {
    const res = await db.query('SELECT * FROM maintenance_requests ORDER BY created_at DESC');
    return res.rows;
};
