const db = require('../db');
const nodemailer = require('nodemailer');

// Configure Transporter (Reuse this or import from a shared module if available)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'alerts@example.com',
        pass: process.env.SMTP_PASS
    }
});

exports.createRequest = async (req, reply) => {
    const { operator_name, reason, urgency } = req.body;
    try {
        const res = await db.query(
            "INSERT INTO maintenance_requests (operator_name, reason, urgency) VALUES ($1, $2, $3) RETURNING *",
            [operator_name, reason, urgency]
        );

        // Send Email
        try {
            await transporter.sendMail({
                from: '"GMAO System" <' + (process.env.SMTP_USER || 'alerts@example.com') + '>',
                to: process.env.REQUEST_NOTIFICATION_EMAIL || process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
                subject: `🚨 SOLICITUD MANTENIMIENTO: ${urgency.toUpperCase()}`,
                text: `Operario: ${operator_name}\nMotivo: ${reason}\nUrgencia: ${urgency}\n\nRevisar Panel de Administración.`
            });
            console.log('✅ Email sent for request.');
        } catch (emailErr) {
            console.error('❌ Email failed:', emailErr);
            // Don't fail the request if email fails, just log it.
        }

        return res.rows[0];
    } catch (e) {
        reply.code(500).send({ error: e.message });
    }
};

exports.getAllRequests = async (req, reply) => {
    const res = await db.query("SELECT * FROM maintenance_requests ORDER BY created_at DESC");
    return res.rows;
};
