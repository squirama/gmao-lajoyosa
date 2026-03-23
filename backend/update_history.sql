-- Actualizar fechas de mantenimiento para evitar fines de semana mayoritariamente
UPDATE maintenance_history
SET performed_date = CASE 
    -- Si es Domingo (DOW 0)
    WHEN EXTRACT(DOW FROM performed_date) = 0 THEN 
        CASE 
            WHEN random() > 0.9 THEN performed_date -- dejar el 10% en domingo
            WHEN random() > 0.5 THEN performed_date - INTERVAL '2 days' -- mover al viernes
            ELSE performed_date + INTERVAL '1 day' -- mover al lunes
        END
    -- Si es Sábado (DOW 6)
    WHEN EXTRACT(DOW FROM performed_date) = 6 THEN
        CASE 
            WHEN random() > 0.9 THEN performed_date -- dejar el 10% en sábado
            WHEN random() > 0.5 THEN performed_date - INTERVAL '1 day' -- mover al viernes
            ELSE performed_date + INTERVAL '2 days' -- mover al lunes
        END
    ELSE performed_date
END;
