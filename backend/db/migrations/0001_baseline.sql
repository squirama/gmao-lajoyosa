CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(255),
    email VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    UNIQUE(location_id, name)
);

CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    dept_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    manual_filename VARCHAR(255),
    qr_code VARCHAR(255) UNIQUE,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'OPERATOR',
    active BOOLEAN DEFAULT TRUE,
    username VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    session_token VARCHAR(255),
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_departments (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, department_id)
);

CREATE TABLE IF NOT EXISTS user_locations (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, location_id)
);

CREATE TABLE IF NOT EXISTS maintenance_plans (
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
    force_dow BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pending_alerts (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    postpone_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, scheduled_date)
);

CREATE TABLE IF NOT EXISTS plan_exceptions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    original_date DATE NOT NULL,
    new_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_history (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE SET NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    performed_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    document_path TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id SERIAL PRIMARY KEY,
    operator_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    urgency VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intervention_logs (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    global_comment TEXT,
    duration_minutes INTEGER DEFAULT 0,
    solution TEXT
);

CREATE TABLE IF NOT EXISTS intervention_tasks (
    id SERIAL PRIMARY KEY,
    intervention_id INTEGER REFERENCES intervention_logs(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'DONE',
    comments TEXT,
    alert_manager BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS spare_parts (
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

CREATE TABLE IF NOT EXISTS asset_spare_parts (
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, spare_part_id)
);

CREATE TABLE IF NOT EXISTS part_consumptions (
    id SERIAL PRIMARY KEY,
    history_id INTEGER REFERENCES maintenance_history(id) ON DELETE CASCADE,
    spare_part_id INTEGER REFERENCES spare_parts(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost_at_time DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS postponement_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES pending_alerts(id) ON DELETE SET NULL,
    previous_date DATE,
    new_date DATE,
    user_id INTEGER,
    reason TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE locations ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE departments ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id INTEGER;

ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS notify_external BOOLEAN DEFAULT FALSE;
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255);
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS is_legal BOOLEAN DEFAULT FALSE;
ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS force_dow BOOLEAN DEFAULT FALSE;

ALTER TABLE pending_alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS solution TEXT;

ALTER TABLE maintenance_history ADD COLUMN IF NOT EXISTS document_path TEXT;

ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_username_key'
          AND connamespace = 'public'::regnamespace
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plans_is_legal ON maintenance_plans(is_legal);
