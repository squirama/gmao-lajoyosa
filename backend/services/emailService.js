const nodemailer = require('nodemailer');

const DEFAULT_SMTP_HOST = 'smtp.example.com';
const DEFAULT_SMTP_PORT = 465;
const DEFAULT_SMTP_USER = 'alerts@example.com';

function createTransport() {
    const port = parseInt(process.env.SMTP_PORT || DEFAULT_SMTP_PORT, 10);

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || DEFAULT_SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER || DEFAULT_SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
    });
}

function normalizeRecipients(target) {
    if (!target) return [];
    if (Array.isArray(target)) return target.flatMap((value) => normalizeRecipients(value));
    return String(target)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

async function sendEmail({ subject, text, html, to, fallbackRecipient = process.env.NOTIFICATION_EMAIL, senderName = 'GMAO' }) {
    const recipients = normalizeRecipients(to || fallbackRecipient);
    if (recipients.length === 0) return false;

    const fromAddress = process.env.SMTP_USER || DEFAULT_SMTP_USER;
    const transporter = createTransport();

    await transporter.sendMail({
        from: `"${senderName}" <${fromAddress}>`,
        to: recipients,
        subject,
        text,
        html: html || (text ? `<p>${text}</p>` : undefined),
    });

    return true;
}

module.exports = {
    sendEmail,
};
