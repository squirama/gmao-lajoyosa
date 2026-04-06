CREATE TABLE IF NOT EXISTS providers (
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

CREATE TABLE IF NOT EXISTS provider_departments (
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (provider_id, department_id)
);

CREATE TABLE IF NOT EXISTS provider_assets (
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (provider_id, asset_id)
);

CREATE TABLE IF NOT EXISTS provider_documents (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    document_type VARCHAR(120) NOT NULL,
    document_name VARCHAR(160),
    document_path TEXT NOT NULL,
    expires_on DATE,
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_departments_department ON provider_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_provider_assets_asset ON provider_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_provider_documents_provider ON provider_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_documents_expires_on ON provider_documents(expires_on);
