ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS is_documentary BOOLEAN DEFAULT FALSE;
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS document_steps JSONB DEFAULT '[]';
