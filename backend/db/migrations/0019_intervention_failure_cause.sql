ALTER TABLE intervention_logs
    ADD COLUMN IF NOT EXISTS failure_cause TEXT;
