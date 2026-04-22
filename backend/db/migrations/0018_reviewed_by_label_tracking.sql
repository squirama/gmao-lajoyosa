ALTER TABLE maintenance_history
    ADD COLUMN IF NOT EXISTS reviewed_by_label VARCHAR(100);

ALTER TABLE intervention_logs
    ADD COLUMN IF NOT EXISTS reviewed_by_label VARCHAR(100);
