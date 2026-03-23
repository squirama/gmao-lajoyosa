ALTER TABLE intervention_logs
ADD COLUMN IF NOT EXISTS document_path TEXT;
