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
        console.log('--- Iniciando generaciÃ³n V2 (maintenance_history) para Llenadora CariÃ±ena ---');

        const assetId = 1; // Llenadora CariÃ±ena

        // Borrar el historial incorrecto que puse antes en intervention_logs/intervention_tasks
        // (ya que no era el correcto pero no quiero dejar basura)
        await client.query("DELETE FROM intervention_tasks WHERE intervention_id IN (SELECT id FROM intervention_logs WHERE asset_id = $1)", [assetId]);
        await client.query("DELETE FROM intervention_logs WHERE asset_id = $1", [assetId]);
        console.log('--- Datos de prueba de logs anteriores borrados ---');

        // Obtener los 4 planes de la BD
        const plansRes = await client.query("SELECT * FROM maintenance_plans WHERE asset_id = $1", [assetId]);
        const allPlans = plansRes.rows;
        if (allPlans.length === 0) throw new Error("No se encontraron planes para el activo " + assetId);

        // Separar el de limpieza del resto
        const limpiezaPlan = allPlans.find(p => p.task_description.toLowerCase().includes('limpieza'));
        const regPlans = allPlans.filter(p => !p.task_description.toLowerCase().includes('limpieza') && p.frequency_days > 0);

        if (!limpiezaPlan) throw new Error("No se encontrÃ³ el plan de 'Limpieza'");
        if (regPlans.length !== 3) console.warn("Advertencia: No hay exactamente 3 planes con fecha (hay " + regPlans.length + "). Continuando de todos modos...");

        // Obtener usuarios 
        const usersRes = await client.query("SELECT id FROM users WHERE active = true");
        const userIds = usersRes.rows.map(u => u.id);

        const startDate = new Date('2025-05-01T08:00:00'); // 1 Mayo 2025
        const endDate = new Date(); // Hoy
        let currentDate = new Date(startDate);
        let entriesCreated = 0;

        // --- TRACKERS ---
        // Para la limpieza
        let nextCleaningDate = new Date(startDate);
        // Para los planes regulares
        const planNextDates = {};
        for (const p of regPlans) {
            planNextDates[p.id] = new Date(startDate);
            planNextDates[p.id].setDate(planNextDates[p.id].getDate() + Math.floor(Math.random() * p.frequency_days)); // Desfase inicial 
        }

        while (currentDate <= endDate) {
            const currentStr = currentDate.toISOString().split('T')[0];
            const userId = userIds[Math.floor(Math.random() * userIds.length)];

            // 1. Verificar Limpieza Semanal (con lÃ³gica de doble/saltado)
            if (currentDate >= nextCleaningDate) {
                const rndClean = Math.random();
                if (rndClean < 0.15) {
                    // 15%: Saltarse la semana (Olvido)
                    console.log(`[!] Limpieza omitida en la semana del ${currentStr}`);
                } else if (rndClean < 0.85) {
                    // 70%: Normal (1 limpieza)
                    await insertHistory(client, limpiezaPlan.id, assetId, userId, currentDate, "Limpieza completada segÃºn ciclo normal");
                    entriesCreated++;
                } else {
                    // 15%: Doble limpieza (Hizo una hoy y otra a los 3 dÃ­as)
                    await insertHistory(client, limpiezaPlan.id, assetId, userId, currentDate, "Primera limpieza de la semana completada");
                    entriesCreated++;
                    const extraDate = new Date(currentDate);
                    extraDate.setDate(extraDate.getDate() + 3);
                    if (extraDate <= endDate) {
                        const extraUserId = userIds[Math.floor(Math.random() * userIds.length)];
                        await insertHistory(client, limpiezaPlan.id, assetId, extraUserId, extraDate, "Segunda limpieza de la semana completada");
                        entriesCreated++;
                    }
                }
                nextCleaningDate.setDate(nextCleaningDate.getDate() + 7); // Siguiente semana
            }

            // 2. Verificar Mantenimientos Preventivos Regulares
            for (const p of regPlans) {
                if (currentDate >= planNextDates[p.id]) {
                    const rnd = Math.random();

                    if (rnd < 0.70) {
                        // 70%: Se hace hoy a tiempo
                        await insertHistory(client, p.id, assetId, userId, currentDate, "Mantenimiento preventivo en fecha");
                        entriesCreated++;
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + p.frequency_days);
                    } else if (rnd < 0.90) {
                        // 20%: Se retrasa 1 a 5 dÃ­as
                        const delay = Math.floor(Math.random() * 5) + 1;
                        console.log(`[~] Mantenimiento '${p.task_description}' retrasado ${delay} dÃ­as desde ${currentStr}`);
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + delay);
                    } else {
                        // 10%: Se saltÃ³ completamente este ciclo
                        console.log(`[!] Mantenimiento '${p.task_description}' SALTADO en el ciclo de ${currentStr}`);
                        // En lugar de planNextDates[p.id].setDate, hacemos new Date para no mutarlo si ya pasÃ³
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + p.frequency_days); // Pasa al siguiente ciclo sin hacerse
                    }
                }
            }

            // Avanzar un dÃ­a
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 3. Dejar los planes listos para la app web con sus next_due_dates correctos hoy (reales)
        for (const p of regPlans) {
            // Ãšltima vez que de verdad se hizo en history
            const lastLogRes = await client.query(`
                SELECT performed_date 
                FROM maintenance_history 
                WHERE plan_id = $1 
                ORDER BY performed_date DESC LIMIT 1
            `, [p.id]);

            if (lastLogRes.rows.length > 0) {
                // Hay historial. Setear el next para dentro de (frecuencia) dÃ­as.
                const lastDate = lastLogRes.rows[0].performed_date;
                const nextDate = new Date(lastDate);
                nextDate.setDate(nextDate.getDate() + p.frequency_days);

                await client.query(`UPDATE maintenance_plans SET last_performed = $1, next_due_date = $2 WHERE id = $3`, [lastDate, nextDate, p.id]);
                // Las alertas viejas
                await client.query("DELETE FROM pending_alerts WHERE plan_id = $1", [p.id]);
            }
        }

        await client.query('COMMIT');
        console.log(`\nâœ… Ã‰XITO V2: Se han generado ${entriesCreated} registros en maintenance_history.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('âŒ Error de base de datos:', e);
    } finally {
        client.release();
        pool.end();
    }
}

async function insertHistory(client, planId, assetId, operatorId, date, baseNotes) {
    // Randomizar hora un poco
    const execDate = new Date(date);
    execDate.setHours(7 + Math.floor(Math.random() * 8)); // Entre 7am y 2pm
    execDate.setMinutes(Math.floor(Math.random() * 60));

    // Variar un poco las notas
    let extra = "Completado desde App";
    if (Math.random() > 0.90) {
        const notesVariations = ["Todo OK", "Revisado", "Limpio", "OK", "Sin incidencias", "Hecho", "Completado"];
        extra = notesVariations[Math.floor(Math.random() * notesVariations.length)];
    }

    // Generar documentos (certificados de broma) el 10% de las veces
    const docs = [null, null, null, null, null, null, null, null, null, "/documents/certificado_revisado.pdf"];
    const doc = docs[Math.floor(Math.random() * docs.length)];

    await client.query(`
        INSERT INTO maintenance_history (plan_id, asset_id, operator_id, performed_date, notes, document_path)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [planId, assetId, operatorId, execDate, extra, doc]);
}

run();

