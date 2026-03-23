-- SCRIPT DE LIMPIEZA DE DATOS DE PRUEBA
-- BORRA todo el historial pero MANTIENE la configuración (Sedes, Deptos, Usuarios, Activos)

BEGIN;

-- 1. Borrar Historial de Intervenciones (Averías)
TRUNCATE TABLE intervention_tasks CASCADE;
TRUNCATE TABLE intervention_logs CASCADE;

-- 2. Borrar Alertas Pendientes y Planes completados
TRUNCATE TABLE pending_alerts CASCADE;

-- 3. Resetear contadores de secuencias (Opcional, para empezar IDs desde 1)
ALTER SEQUENCE intervention_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE intervention_tasks_id_seq RESTART WITH 1;
ALTER SEQUENCE pending_alerts_id_seq RESTART WITH 1;

-- 4. Actualizar Planes de Mantenimiento (Resetear fechas de última ejecución)
UPDATE maintenance_plans SET last_performed = NULL;

COMMIT;

-- SI TAMBIÉN QUIERES BORRAR LAS MÁQUINAS (ACTIVOS) Y PLANES, DESCOMENTA ESTO:
-- TRUNCATE TABLE maintenance_plans CASCADE;
-- TRUNCATE TABLE assets CASCADE;
-- ALTER SEQUENCE maintenance_plans_id_seq RESTART WITH 1;
-- ALTER SEQUENCE assets_id_seq RESTART WITH 1;
