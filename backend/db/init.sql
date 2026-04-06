DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(255),
    email VARCHAR(255)
);

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    weekly_reminder_enabled BOOLEAN DEFAULT FALSE,
    weekly_reminder_email VARCHAR(255),
    weekly_reminder_last_sent_date DATE,
    UNIQUE(location_id, name)
);

CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    dept_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    manual_filename VARCHAR(255),
    qr_code VARCHAR(255) UNIQUE,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(160) NOT NULL,
    service_type VARCHAR(160),
    contact_name VARCHAR(160),
    phone VARCHAR(80),
    email VARCHAR(160),
    notes TEXT,
    contract_expires_on DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE provider_departments (
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (provider_id, department_id)
);

CREATE TABLE provider_assets (
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (provider_id, asset_id)
);

CREATE TABLE provider_documents (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    document_type VARCHAR(120) NOT NULL,
    document_name VARCHAR(160),
    document_path TEXT NOT NULL,
    expires_on DATE,
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'OPERATOR',
    active BOOLEAN DEFAULT TRUE,
    username VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    session_token VARCHAR(255),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_login_at TIMESTAMP,
    last_seen_at TIMESTAMP
);

CREATE TABLE user_departments (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, department_id)
);

CREATE TABLE user_locations (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, location_id)
);

CREATE TABLE maintenance_plans (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    task_description VARCHAR(255) NOT NULL,
    frequency_days INTEGER NOT NULL,
    last_performed DATE,
    notify_external BOOLEAN DEFAULT FALSE,
    next_due_date DATE,
    start_date DATE,
    active BOOLEAN DEFAULT TRUE,
    notification_email VARCHAR(255),
    is_legal BOOLEAN DEFAULT FALSE,
    force_dow BOOLEAN DEFAULT FALSE,
    missed_threshold_email_sent_at TIMESTAMP
);

CREATE TABLE pending_alerts (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    postpone_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, scheduled_date)
);

CREATE TABLE postponement_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES pending_alerts(id) ON DELETE SET NULL,
    previous_date DATE,
    new_date DATE,
    user_id INTEGER,
    reason TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_exceptions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    original_date DATE NOT NULL,
    new_date DATE NOT NULL
);

CREATE TABLE maintenance_history (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE SET NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date DATE,
    performed_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    document_path TEXT
);

CREATE TABLE maintenance_requests (
    id SERIAL PRIMARY KEY,
    operator_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    urgency VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE intervention_logs (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    global_comment TEXT,
    duration_minutes INTEGER DEFAULT 0,
    solution TEXT,
    document_path TEXT
);

CREATE TABLE intervention_tasks (
    id SERIAL PRIMARY KEY,
    intervention_id INTEGER REFERENCES intervention_logs(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'DONE',
    comments TEXT,
    alert_manager BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_login_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username_attempt VARCHAR(255),
    event_type VARCHAR(40) NOT NULL,
    ip_address VARCHAR(120),
    user_agent TEXT,
    meta_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(40),
    action VARCHAR(120) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    entity_type VARCHAR(80),
    entity_id INTEGER,
    status_code INTEGER,
    ip_address VARCHAR(120),
    user_agent TEXT,
    meta_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spare_parts (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stock_current INTEGER NOT NULL DEFAULT 0,
    stock_min INTEGER NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    location VARCHAR(255),
    supplier_name VARCHAR(255),
    supplier_contact VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_spare_parts (
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, spare_part_id)
);

CREATE TABLE part_consumptions (
    id SERIAL PRIMARY KEY,
    history_id INTEGER REFERENCES maintenance_history(id) ON DELETE CASCADE,
    intervention_id INTEGER REFERENCES intervention_logs(id) ON DELETE CASCADE,
    spare_part_id INTEGER REFERENCES spare_parts(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost_at_time DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spare_part_stocks (
    id SERIAL PRIMARY KEY,
    spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    physical_location VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (spare_part_id, location_id, physical_location)
);

CREATE TABLE spare_part_movements (
    id SERIAL PRIMARY KEY,
    spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    source_stock_id INTEGER REFERENCES spare_part_stocks(id) ON DELETE SET NULL,
    destination_stock_id INTEGER REFERENCES spare_part_stocks(id) ON DELETE SET NULL,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plans_is_legal ON maintenance_plans(is_legal);
CREATE INDEX idx_maintenance_history_plan_scheduled ON maintenance_history(plan_id, scheduled_date);
CREATE INDEX idx_spare_part_stocks_part_id ON spare_part_stocks(spare_part_id);
CREATE INDEX idx_spare_part_stocks_location_id ON spare_part_stocks(location_id);
CREATE INDEX idx_spare_part_movements_part_id ON spare_part_movements(spare_part_id);
CREATE INDEX idx_spare_part_movements_created_at ON spare_part_movements(created_at DESC);
CREATE INDEX idx_users_last_login_at ON users(last_login_at DESC);
CREATE INDEX idx_users_last_seen_at ON users(last_seen_at DESC);
CREATE INDEX idx_user_login_events_user_id_created ON user_login_events(user_id, created_at DESC);
CREATE INDEX idx_user_login_events_event_type_created ON user_login_events(event_type, created_at DESC);
CREATE INDEX idx_user_activity_log_user_id_created ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_user_activity_log_created ON user_activity_log(created_at DESC);
