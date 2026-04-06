ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS weekly_reminder_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS weekly_reminder_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS weekly_reminder_last_sent_date DATE;
