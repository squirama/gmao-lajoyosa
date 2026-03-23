CREATE INDEX IF NOT EXISTS idx_users_session_token_active
ON users(session_token)
WHERE active = true AND session_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_location_id
ON users(location_id);

CREATE INDEX IF NOT EXISTS idx_departments_location_id
ON departments(location_id);

CREATE INDEX IF NOT EXISTS idx_assets_dept_id_active
ON assets(dept_id, active);

CREATE INDEX IF NOT EXISTS idx_maintenance_plans_asset_active
ON maintenance_plans(asset_id, active);

CREATE INDEX IF NOT EXISTS idx_maintenance_plans_next_due_date
ON maintenance_plans(next_due_date);

CREATE INDEX IF NOT EXISTS idx_pending_alerts_plan_id
ON pending_alerts(plan_id);

CREATE INDEX IF NOT EXISTS idx_pending_alerts_asset_id
ON pending_alerts(asset_id);

CREATE INDEX IF NOT EXISTS idx_pending_alerts_email_sent_date
ON pending_alerts(email_sent, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_history_plan_id
ON maintenance_history(plan_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_history_asset_id
ON maintenance_history(asset_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_history_performed_date
ON maintenance_history(performed_date);

CREATE INDEX IF NOT EXISTS idx_plan_exceptions_plan_original
ON plan_exceptions(plan_id, original_date);

CREATE INDEX IF NOT EXISTS idx_user_departments_department_id
ON user_departments(department_id);

CREATE INDEX IF NOT EXISTS idx_asset_spare_parts_spare_part_id
ON asset_spare_parts(spare_part_id);

CREATE INDEX IF NOT EXISTS idx_spare_parts_active_name
ON spare_parts(active, name);
