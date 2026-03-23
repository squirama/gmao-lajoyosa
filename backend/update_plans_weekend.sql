-- Mover mantenimientos futuros reales (next_due_date) que caen en fin de semana al Viernes anterior
UPDATE maintenance_plans
SET next_due_date = CASE 
    -- Si cae en Domingo (DOW 0), restar 2 días para mover al Viernes
    WHEN EXTRACT(DOW FROM next_due_date) = 0 THEN next_due_date - INTERVAL '2 days'
    -- Si cae en Sábado (DOW 6), restar 1 día para mover al Viernes
    WHEN EXTRACT(DOW FROM next_due_date) = 6 THEN next_due_date - INTERVAL '1 day'
    ELSE next_due_date
END
WHERE EXTRACT(DOW FROM next_due_date) IN (0, 6) AND active = true;
