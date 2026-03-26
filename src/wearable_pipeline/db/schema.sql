-- Wearable Data Pipeline: Core Schema
-- Raw JSONB approach: store complete API responses / parsed files as-is

-- Devices registry (wearables + FHIR hospitals are registered dynamically)
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_type VARCHAR(100) NOT NULL UNIQUE,
    ingestion_method VARCHAR(20) NOT NULL,  -- 'oauth', 'file', 'webhook', 'fhir'
    display_name VARCHAR(200),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed devices
INSERT INTO devices (device_type, ingestion_method, display_name) VALUES
    ('fitbit',         'oauth',   'Fitbit'),
    ('oura',           'oauth',   'Oura Ring'),
    ('whoop',          'oauth',   'WHOOP'),
    ('google_fit',     'oauth',   'Google Fit'),
    ('apple_health',   'file',    'Apple Health'),
    ('garmin',         'file',    'Garmin'),
    ('samsung',        'file',    'Samsung Health'),
    ('health_connect', 'file',    'Health Connect'),
    ('xiaomi',         'file',    'Xiaomi Mi Fitness'),
    ('polar_suunto',   'file',    'Polar / Suunto')
    -- ('terra',          'webhook', 'Terra')  -- Terra disabled
ON CONFLICT (device_type) DO NOTHING;

-- OAuth tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL DEFAULT 'default',
    device_type VARCHAR(100) NOT NULL REFERENCES devices(device_type),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ,
    scope TEXT,
    raw_token_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_type)
);

-- Core table: raw payloads (JSONB stores everything)
CREATE TABLE IF NOT EXISTS raw_payloads (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL DEFAULT 'default',
    device_type VARCHAR(100) NOT NULL,
    data_category VARCHAR(100) NOT NULL,       -- 'sleep', 'heart_rate', 'Observation_lab', etc.
    payload JSONB NOT NULL,                     -- complete raw data, no field loss
    content_hash VARCHAR(64) NOT NULL,          -- SHA-256 for dedup
    data_start_time TIMESTAMPTZ,                -- data time range (for queries)
    data_end_time TIMESTAMPTZ,
    api_endpoint VARCHAR(500),                  -- which API endpoint / file path
    ingestion_method VARCHAR(20) NOT NULL,      -- 'api_pull', 'file_upload', 'webhook', 'fhir_pull'
    source_file_name VARCHAR(255),              -- original filename if from file upload
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_type, data_category, content_hash)
);

-- File uploads dedup
CREATE TABLE IF NOT EXISTS file_uploads (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL DEFAULT 'default',
    device_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_hash VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT,
    status VARCHAR(20) DEFAULT 'pending',       -- pending/processing/done/error
    records_inserted INTEGER DEFAULT 0,
    records_duplicated INTEGER DEFAULT 0,
    error_message TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE(user_id, device_type, file_hash)
);

-- Ingestion logs
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) DEFAULT 'default',
    device_type VARCHAR(100),
    job_type VARCHAR(20),                       -- 'cron', 'manual', 'file_upload', 'webhook', 'fhir_sync'
    status VARCHAR(20),                         -- 'success', 'error', 'partial'
    records_total INTEGER DEFAULT 0,
    records_new INTEGER DEFAULT 0,
    records_duplicate INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ─── FHIR Hospital Endpoints ──────────────────────────────────
-- Each row = one hospital's FHIR server (discovered via .well-known/smart-configuration)
CREATE TABLE IF NOT EXISTS fhir_endpoints (
    id VARCHAR(100) PRIMARY KEY,              -- slug: "epic_nyp", "cerner_jhu"
    display_name VARCHAR(255) NOT NULL,       -- "NewYork-Presbyterian / Columbia"
    fhir_base_url VARCHAR(500) NOT NULL,      -- "https://fhir.nyp.org/api/FHIR/R4"
    ehr_vendor VARCHAR(50),                   -- "epic", "cerner", "meditech"
    authorize_url VARCHAR(500),               -- from .well-known/smart-configuration
    token_url VARCHAR(500),                   -- from .well-known/smart-configuration
    smart_config JSONB,                       -- full .well-known response cached
    last_discovery_at TIMESTAMPTZ,            -- when we last fetched .well-known
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user hospital connections (tracks which hospitals each user has connected)
CREATE TABLE IF NOT EXISTS fhir_user_connections (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL DEFAULT 'default',
    endpoint_id VARCHAR(100) NOT NULL REFERENCES fhir_endpoints(id),
    fhir_patient_id VARCHAR(255),             -- "Patient/abc123" from token response
    status VARCHAR(20) DEFAULT 'active',      -- active, disconnected, error
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_user_device ON raw_payloads(user_id, device_type);
CREATE INDEX IF NOT EXISTS idx_raw_category ON raw_payloads(data_category);
CREATE INDEX IF NOT EXISTS idx_raw_time ON raw_payloads(data_start_time);
CREATE INDEX IF NOT EXISTS idx_raw_ingested ON raw_payloads(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_gin ON raw_payloads USING GIN(payload);
CREATE INDEX IF NOT EXISTS idx_fhir_conn_user ON fhir_user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_fhir_conn_status ON fhir_user_connections(status);
