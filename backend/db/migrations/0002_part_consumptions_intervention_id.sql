ALTER TABLE part_consumptions
ADD COLUMN IF NOT EXISTS intervention_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'part_consumptions_intervention_id_fkey'
          AND connamespace = 'public'::regnamespace
    ) THEN
        ALTER TABLE part_consumptions
        ADD CONSTRAINT part_consumptions_intervention_id_fkey
        FOREIGN KEY (intervention_id) REFERENCES intervention_logs(id) ON DELETE CASCADE;
    END IF;
END $$;
