const { sendEmail } = require('../services/emailService');

/**
 * Deducts stock and logs consumption for a given history/intervention record.
 *
 * @param {pg.Client} client
 * @param {Array} consumedParts
 * @param {Object} references
 */
async function processPartConsumptions(client, consumedParts, references) {
    if (!consumedParts || !Array.isArray(consumedParts) || consumedParts.length === 0) {
        return;
    }

    const { history_id, intervention_id } = references;
    const lowStockAlerts = [];

    for (const part of consumedParts) {
        const qty = parseInt(part.quantity, 10);
        if (Number.isNaN(qty) || qty <= 0) continue;

        const partRes = await client.query(
            'SELECT stock_current, stock_min, cost_price, name, part_number FROM spare_parts WHERE id = $1 FOR UPDATE',
            [part.spare_part_id]
        );
        if (partRes.rows.length === 0) continue;

        const partData = partRes.rows[0];
        const newStock = partData.stock_current - qty;

        await client.query(
            'UPDATE spare_parts SET stock_current = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newStock, part.spare_part_id]
        );

        await client.query(
            `INSERT INTO part_consumptions (history_id, intervention_id, spare_part_id, quantity, unit_cost_at_time)
             VALUES ($1, $2, $3, $4, $5)`,
            [history_id || null, intervention_id || null, part.spare_part_id, qty, partData.cost_price]
        );

        if (partData.stock_current > partData.stock_min && newStock <= partData.stock_min) {
            lowStockAlerts.push({
                ...partData,
                newStock,
            });
        }
    }

    if (lowStockAlerts.length > 0) {
        sendLowStockEmails(lowStockAlerts).catch(console.error);
    }
}

async function sendLowStockEmails(alerts) {
    const notifyEmail = process.env.INVENTORY_ALERT_EMAIL || process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;

    for (const alert of alerts) {
        try {
            await sendEmail({
                senderName: 'GMAO Inventario',
                to: notifyEmail,
                subject: `Aviso de stock: ${alert.name} (${alert.part_number})`,
                html: `
                    <h2>Alerta de stock minimo alcanzado</h2>
                    <p>El uso reciente ha reducido el stock del siguiente repuesto por debajo de su umbral de seguridad.</p>
                    <ul>
                        <li><strong>Repuesto:</strong> ${alert.name}</li>
                        <li><strong>Referencia:</strong> ${alert.part_number}</li>
                        <li><strong>Stock actual:</strong> <span style="color:red; font-weight:bold">${alert.newStock} uds</span></li>
                        <li><strong>Stock de seguridad:</strong> ${alert.stock_min} uds</li>
                    </ul>
                    <p>Por favor, tramite un nuevo pedido con compras o el proveedor habitual.</p>
                `,
            });
            console.log(`Low stock alert email sent for ${alert.part_number} to ${notifyEmail}`);
        } catch (emailError) {
            console.error('Failed to send low stock alert:', emailError);
        }
    }
}

module.exports = {
    processPartConsumptions,
};
