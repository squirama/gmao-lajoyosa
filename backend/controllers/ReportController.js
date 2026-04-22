const db = require('../db');

// Helper to convert array of objects to CSV
const toCSV = (data) => {
    if (!data || data.length === 0) return '';
    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data.map(row => {
        return Object.values(row).map(val => {
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""'); // Escape quotes
            return `"${str}"`; // Wrap in quotes
        }).join(',');
    }).join('\n');
    return header + rows;
};

// 1. PREVENTIVOS REALIZADOS (Compliance)
exports.exportHistory = async (req, reply) => {
    const { start, end, asset_id } = req.query;
    const client = await db.connect();

    try {
        let query = `
            SELECT 
                TO_CHAR(h.created_at, 'DD/MM/YYYY HH24:MI') as "FechaHora",
                a.name as "Maquina",
                p.task_description as "Tarea",
                u.full_name as "Operario",
                h.notes as "Notas"
            FROM maintenance_history h
            JOIN assets a ON h.asset_id = a.id
            LEFT JOIN maintenance_plans p ON h.plan_id = p.id
            LEFT JOIN users u ON h.operator_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (start) { query += ` AND h.performed_date >= $${idx++}`; params.push(start); }
        if (end) { query += ` AND h.performed_date <= $${idx++}`; params.push(end); }
        if (asset_id) { query += ` AND h.asset_id = $${idx++}`; params.push(asset_id); }

        query += ` ORDER BY h.performed_date DESC`;

        const res = await client.query(query, params);

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="preventivos.csv"');
        return toCSV(res.rows);
    } catch (e) {
        console.error("Export Error:", e);
        reply.code(500).send({ error: e.message });
    } finally {
        client.release();
    }
};

// 2. INTERVENCIONES Y AVERÍAS (Correctivo)
exports.exportInterventions = async (req, reply) => {
    const { start, end, asset_id } = req.query;
    const client = await db.connect();

    try {
        let query = `
            SELECT 
                TO_CHAR(l.created_at, 'DD/MM/YYYY HH24:MI') as "FechaHora",
                a.name as "Maquina",
                u.full_name as "Operario",
                l.duration_minutes as "Duracion_Min",
                COALESCE(l.failure_cause, l.global_comment) as "Causa_Averia",
                l.solution as "Solucion_Aplicada"
            FROM intervention_logs l
            JOIN assets a ON l.asset_id = a.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (start) { query += ` AND l.created_at >= $${idx++}`; params.push(start); }
        // FIX: Append time to the parameter, NOT the query string
        if (end) { query += ` AND l.created_at <= $${idx++}`; params.push(end + ' 23:59:59'); }
        if (asset_id) { query += ` AND l.asset_id = $${idx++}`; params.push(asset_id); }

        query += ` ORDER BY l.created_at DESC`;

        const res = await client.query(query, params);

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="intervenciones.csv"');
        return toCSV(res.rows);
    } catch (e) {
        console.error("Export Error:", e);
        reply.code(500).send({ error: e.message });
    } finally {
        client.release();
    }
};

// 3. SOLICITUDES DE PLANTA
exports.exportRequests = async (req, reply) => {
    const { start, end } = req.query;
    const client = await db.connect();

    try {
        let query = `
            SELECT 
                TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as "FechaHora",
                operator_name as "Solicitante",
                reason as "Motivo",
                urgency as "Urgencia"
            FROM maintenance_requests
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (start) { query += ` AND created_at >= $${idx++}`; params.push(start); }
        // FIX: Append time to the parameter
        if (end) { query += ` AND created_at <= $${idx++}`; params.push(end + ' 23:59:59'); }

        query += ` ORDER BY created_at DESC`;

        const res = await client.query(query, params);

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="solicitudes.csv"');
        return toCSV(res.rows);
    } catch (e) {
        console.error("Export Error:", e);
        reply.code(500).send({ error: e.message });
    } finally {
        client.release();
    }
};

// 4. AUDITORIA / MEJORAS Y CORRECTIVAS
exports.exportAuditCorrectives = async (req, reply) => {
    const { start, end, asset_id } = req.query;
    const client = await db.connect();

    try {
        let query = `
            SELECT
                TO_CHAR(l.created_at, 'DD/MM/YYYY HH24:MI') as "FechaHora",
                loc.name as "Sede",
                d.name as "Area",
                a.name as "Maquina",
                u.full_name as "Operario",
                COALESCE(l.failure_cause, l.global_comment) as "Causa_Averia",
                l.solution as "Solucion_Aplicada",
                l.classification as "Clasificacion",
                l.impact_level as "Impacto_Inocuidad_Calidad",
                l.probable_cause as "Causa_Detectada",
                l.preventive_action as "Accion_Preventiva_Mejora",
                CASE WHEN l.follow_up_required THEN 'SI' ELSE 'NO' END as "Requiere_Seguimiento",
                l.follow_up_status as "Estado_Seguimiento",
                l.follow_up_notes as "Notas_Seguimiento"
            FROM intervention_logs l
            JOIN assets a ON l.asset_id = a.id
            LEFT JOIN departments d ON a.dept_id = d.id
            LEFT JOIN locations loc ON d.location_id = loc.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (start) { query += ` AND l.created_at >= $${idx++}`; params.push(start); }
        if (end) { query += ` AND l.created_at <= $${idx++}`; params.push(end + ' 23:59:59'); }
        if (asset_id) { query += ` AND l.asset_id = $${idx++}`; params.push(asset_id); }

        query += ` ORDER BY l.created_at DESC`;

        const res = await client.query(query, params);

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="auditoria_correctivas_mejoras.csv"');
        return toCSV(res.rows);
    } catch (e) {
        console.error("Export Error:", e);
        reply.code(500).send({ error: e.message });
    } finally {
        client.release();
    }
};
