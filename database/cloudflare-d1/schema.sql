-- Cloudflare D1 schema (modelo unificado por módulo)
-- Observação: os dados dos módulos do CRM ficam em module_records (JSON por módulo),
-- não em uma tabela física por módulo.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'USER',
  company_id TEXT,
  active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS module_records (
  module TEXT NOT NULL,
  id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module, company_id, id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  app_name TEXT,
  logo_url TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  company_id TEXT,
  region_id TEXT,
  quota REAL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS binary_blobs (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  company_id TEXT,
  parent_id TEXT,
  original_name TEXT,
  mime_type TEXT,
  size INTEGER,
  data_base64 TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_module_records_module ON module_records(module);
CREATE INDEX IF NOT EXISTS idx_module_records_company ON module_records(company_id);
CREATE INDEX IF NOT EXISTS idx_binary_blobs_company ON binary_blobs(company_id);
CREATE INDEX IF NOT EXISTS idx_binary_blobs_module_parent ON binary_blobs(module, parent_id);

INSERT OR IGNORE INTO app_settings (id, app_name, logo_url, updated_at)
VALUES (1, 'CRM Automatizado B2G', NULL, CURRENT_TIMESTAMP);
