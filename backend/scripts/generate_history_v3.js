const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gmao',
    password: process.env.DB_PASSWORD || 'change_me',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('--- Iniciando generación V3 (Lavadora Exteriores) ---');

        const assetId = 26;

        // Borrar el historial incorrecto que pudiese haber en intervention_logs/intervention_tasks
        await client.query("DELETE FROM intervention_tasks WHERE intervention_id IN (SELECT id FROM intervention_logs WHERE asset_id = $1)", [assetId]);
        await client.query("DELETE FROM intervention_logs WHERE asset_id = $1", [assetId]);

        // Obtenemos los planes
        const plansRes = await client.query("SELECT * FROM maintenance_plans WHERE asset_id = $1", [assetId]);
        const allPlans = plansRes.rows;
        if (allPlans.length === 0) throw new Error("No se encontraron planes para el activo " + assetId);

        // Separar el de limpieza del resto
        const limpiezaPlan = allPlans.find(p => p.task_description.toLowerCase().includes('limpieza'));
        const regPlans = allPlans.filter(p => !p.task_description.toLowerCase().includes('limpieza') && p.frequency_days > 0);

        if (!limpiezaPlan) console.warn("Advertencia: No se encontró plan con la palabra 'limpieza'");

        const startDate = new Date('2025-05-01T08:00:00'); // 1 Mayo 2025
        const endDate = new Date(); // Hoy
        let currentDate = new Date(startDate);
        let entriesCreated = 0;

        // --- TRACKERS ---
        let nextCleaningDate = new Date(startDate);
        const planNextDates = {};
        for (const p of regPlans) {
            planNextDates[p.id] = new Date(startDate);
            planNextDates[p.id].setDate(planNextDates[p.id].getDate() + Math.floor(Math.random() * p.frequency_days)); // Desfase inicial 
        }

        while (currentDate <= endDate) {
            const currentStr = currentDate.toISOString().split('T')[0];
            const userId = 2; // Embotelladora.Care

            // 1. Limpieza
            if (limpiezaPlan && currentDate >= nextCleaningDate) {
                const rndClean = Math.random();
                if (rndClean < 0.15) {
                    // omitted
                } else if (rndClean < 0.85) {
                    // normal
                    await insertHistory(client, limpiezaPlan.id, assetId, userId, currentDate, "Limpieza completada según ciclo normal");
                    entriesCreated++;
                } else {
                    // doble
                    await insertHistory(client, limpiezaPlan.id, assetId, userId, currentDate, "Primera limpieza de la semana");
                    entriesCreated++;
                    const extraDate = new Date(currentDate);
                    extraDate.setDate(extraDate.getDate() + 3);
                    if (extraDate <= endDate) {
                        await insertHistory(client, limpiezaPlan.id, assetId, userId, extraDate, "Segunda limpieza de la semana");
                        entriesCreated++;
                    }
                }
                nextCleaningDate.setDate(nextCleaningDate.getDate() + 7);
            }

            // 2. Mantenimientos Preventivos Regulares
            for (const p of regPlans) {
                if (currentDate >= planNextDates[p.id]) {
                    const rnd = Math.random();
                    if (rnd < 0.70) {
                        await insertHistory(client, p.id, assetId, userId, currentDate, "Mantenimiento preventivo en fecha");
                        entriesCreated++;
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + p.frequency_days);
                    } else if (rnd < 0.90) {
                        const delay = Math.floor(Math.random() * 5) + 1;
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + delay);
                    } else {
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + p.frequency_days);
                    }
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 3. Dejar los planes listos para la app web con sus next_due_dates correctos hoy (reales)
        for (const p of regPlans) {
            const lastLogRes = await client.query(`
                SELECT performed_date 
                FROM maintenance_history 
                WHERE plan_id = $1 
                ORDER BY performed_date DESC LIMIT 1
            `, [p.id]);

            if (lastLogRes.rows.length > 0) {
                const lastDate = lastLogRes.rows[0].performed_date;
                const nextDate = new Date(lastDate);
                nextDate.setDate(nextDate.getDate() + p.frequency_days);

                await client.query(`UPDATE maintenance_plans SET last_performed = $1, next_due_date = $2 WHERE id = $3`, [lastDate, nextDate, p.id]);
                await client.query("DELETE FROM pending_alerts WHERE plan_id = $1", [p.id]);
            }
        }

        await client.query('COMMIT');
        console.log(`\n✅ ÉXITO V3: Se han generado ${entriesCreated} registros para Lavadora Exteriores.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}

async function insertHistory(client, planId, assetId, operatorId, date, baseNotes) {
    const execDate = new Date(date);
    execDate.setHours(7 + Math.floor(Math.random() * 10));
    execDate.setMinutes(Math.floor(Math.random() * 60));

    let extra = "Completado desde App";
    if (Math.random() > 0.90) {
        const notesVariations = ["Todo OK", "Revisado", "Limpio", "OK", "Sin incidencias", "Hecho", "Completado"];
        extra = notesVariations[Math.floor(Math.random() * notesVariations.length)];
    }
    const docs = [null, null, null, null, null, null, null, null, null, "/documents/certificado_revisado.pdf"];
    const doc = docs[Math.floor(Math.random() * docs.length)];

    await client.query(`
        INSERT INTO maintenance_history (plan_id, asset_id, operator_id, performed_date, notes, document_path, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [planId, assetId, operatorId, execDate, extra, doc, execDate]);
}

run();
