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
        console.log('--- Iniciando generaciÃ³n de datos histÃ³ricos para Llenadora CariÃ±ena ---');

        // ConfiguraciÃ³n inicial
        const assetId = 1; // Llenadora CariÃ±ena
        const plans = [
            { id: 1, freq: 30, desc: 'RevisiÃ³n mensual (Filtros y presiones)' },
            { id: 2, freq: 7, desc: 'Engrase semanal (Partes mÃ³viles)' },
            { id: 3, freq: 180, desc: 'CalibraciÃ³n semestral de vÃ¡lvulas' }
        ];

        // Obtener un operario y un administrador para asignar tareas aleatoriamente
        const usersRes = await client.query("SELECT id FROM users WHERE active = true LIMIT 5");
        const userIds = usersRes.rows.map(u => u.id);
        if (userIds.length === 0) throw new Error("No hay usuarios activos en la base de datos");

        const startDate = new Date('2025-07-01T08:00:00');
        const endDate = new Date(); // Hoy

        let currentDate = new Date(startDate);
        let entriesCreated = 0;

        // Limpieza semanal (No estÃ¡ en maintenance_plans, es tarea ad-hoc simulada)
        let nextCleaningDate = new Date(startDate);

        // Inicializar prÃ³ximas fechas para los planes
        const planNextDates = {};
        for (const p of plans) {
            planNextDates[p.id] = new Date(startDate);
            planNextDates[p.id].setDate(planNextDates[p.id].getDate() + Math.floor(Math.random() * p.freq)); // Desfase inicial
        }

        while (currentDate <= endDate) {
            const currentStr = currentDate.toISOString().split('T')[0];
            const userId = userIds[Math.floor(Math.random() * userIds.length)];

            // 1. Verificar Limpieza Semanal
            if (currentDate >= nextCleaningDate) {
                // 80% de probabilidad de hacerla, 20% de saltarla (simula olvido/falta de tiempo)
                if (Math.random() > 0.20) {
                    await insertIntervention(client, assetId, userId, currentDate, "Limpieza programada completada", ["Limpieza integral de mÃ¡quina"]);
                    entriesCreated++;
                } else {
                    console.log(`[!] Limpieza omitida en la semana del ${currentStr}`);
                }
                nextCleaningDate.setDate(nextCleaningDate.getDate() + 7); // Siguiente semana
            }

            // 2. Verificar Mantenimientos Preventivos
            for (const p of plans) {
                if (currentDate >= planNextDates[p.id]) {
                    const rnd = Math.random();

                    if (rnd < 0.70) {
                        // 70%: Se hace hoy a tiempo
                        await insertIntervention(client, assetId, userId, currentDate, "Mantenimiento preventivo completado", [p.desc]);
                        entriesCreated++;
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + p.freq);
                    } else if (rnd < 0.90) {
                        // 20%: Se retrasa 1 a 5 dÃ­as
                        const delay = Math.floor(Math.random() * 5) + 1;
                        console.log(`[~] Mantenimiento '${p.desc}' retrasado ${delay} dÃ­as desde ${currentStr}`);
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + delay);
                    } else {
                        // 10%: Se saltÃ³ completamente este ciclo
                        console.log(`[!] Mantenimiento '${p.desc}' SALTADO en el ciclo de ${currentStr}`);
                        planNextDates[p.id] = new Date(currentDate);
                        planNextDates[p.id].setDate(planNextDates[p.id].getDate() + p.freq); // Pasa al siguiente ciclo sin hacerse
                    }
                }
            }

            // Avanzar un dÃ­a
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 3. Actualizar la fecha 'last_performed' y 'next_due_date' reales en los planes para que cuadre con hoy
        for (const p of plans) {
            // Buscar la Ãºltima vez que realmente se hizo
            const lastLogRes = await client.query(`
                SELECT il.created_at 
                FROM intervention_logs il
                JOIN intervention_tasks it ON il.id = it.intervention_id
                WHERE il.asset_id = $1 AND it.description = $2
                ORDER BY il.created_at DESC LIMIT 1
            `, [assetId, p.desc]);

            if (lastLogRes.rows.length > 0) {
                const lastDate = lastLogRes.rows[0].created_at;
                const nextDate = new Date(lastDate);
                nextDate.setDate(nextDate.getDate() + p.freq);

                await client.query(`
                    UPDATE maintenance_plans 
                    SET last_performed = $1, next_due_date = $2 
                    WHERE id = $3
                `, [lastDate, nextDate, p.id]);

                // Limpiar alertas viejas de este plan y dejar que el cron / app cree las nuevas si es necesario
                await client.query("DELETE FROM pending_alerts WHERE plan_id = $1", [p.id]);
            }
        }

        await client.query('COMMIT');
        console.log(`\nâœ… Ã‰XITO: Se han generado ${entriesCreated} intervenciones histÃ³ricas.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('âŒ Error de base de datos:', e);
    } finally {
        client.release();
        pool.end();
    }
}

async function insertIntervention(client, assetId, userId, date, globalComment, tasks) {
    // Para dar realismo a la hora (entre 7 AM y 5 PM)
    const execDate = new Date(date);
    execDate.setHours(7 + Math.floor(Math.random() * 10));
    execDate.setMinutes(Math.floor(Math.random() * 60));

    const resLog = await client.query(`
        INSERT INTO intervention_logs (asset_id, user_id, created_at, global_comment)
        VALUES ($1, $2, $3, $4) RETURNING id
    `, [assetId, userId, execDate, globalComment]);

    const logId = resLog.rows[0].id;

    for (const taskDesc of tasks) {
        // Notas aleatorias a veces
        let comments = null;
        if (Math.random() > 0.8) {
            const possibleNotes = ["Todo OK", "Pieza algo desgastada pero aguanta", "Revisar en la prÃ³xima con mÃ¡s detalle", "Engrasado extra porque sonaba"];
            comments = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
        }

        await client.query(`
            INSERT INTO intervention_tasks (intervention_id, description, status, comments)
            VALUES ($1, $2, 'DONE', $3)
        `, [logId, taskDesc, comments]);
    }
}

run();

