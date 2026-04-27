-- ============================================
-- SETUP COMPLETO DO BANCO D1 NEXOS
-- UUID: fc912a7b-5564-403c-9d78-146fb0999ae2
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- TABELA: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'SELLER',
  company_id TEXT,
  region_id TEXT,
  quota REAL,
  accessB2B INTEGER DEFAULT 1,
  accessB2G INTEGER DEFAULT 1,
  accessPreSales INTEGER DEFAULT 0,
  permissionOverrides TEXT DEFAULT '{}',
  isCompanyOwner INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- TABELA: companies
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  segment TEXT,
  clientType TEXT DEFAULT 'B2B',
  size TEXT,
  website TEXT,
  logo TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Brasil',
  region_id TEXT,
  status TEXT DEFAULT 'ACTIVE',
  leadScore INTEGER DEFAULT 0,
  churnRisk REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- ============================================
-- TABELA: contacts
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  isPrimary INTEGER DEFAULT 0,
  company_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

-- ============================================
-- TABELA: products
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price REAL NOT NULL,
  margin REAL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================
-- TABELA: opportunities
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  projectName TEXT,
  projectClientType TEXT,
  description TEXT,
  value REAL NOT NULL,
  probability INTEGER DEFAULT 50,
  stage TEXT NOT NULL,
  b2gStage TEXT,
  source TEXT,
  expectedCloseDate TEXT,
  actualCloseDate TEXT,
  lossReason TEXT,
  company_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_b2gStage ON opportunities(b2gStage);

-- ============================================
-- TABELA: opportunity_products
-- ============================================
CREATE TABLE IF NOT EXISTS opportunity_products (
  id TEXT PRIMARY KEY,
  quantity INTEGER DEFAULT 1,
  unitPrice REAL NOT NULL,
  discount REAL DEFAULT 0,
  opportunity_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE(opportunity_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_products_opportunity ON opportunity_products(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_products_product ON opportunity_products(product_id);

-- ============================================
-- TABELA: activities
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'PENDING',
  priority TEXT DEFAULT 'MEDIUM',
  dueDate TEXT,
  completedAt TEXT,
  company_id TEXT,
  opportunity_id TEXT,
  assignedTo_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
  FOREIGN KEY (assignedTo_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_activities_company ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity ON activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activities_assignedTo ON activities(assignedTo_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

-- ============================================
-- TABELA: proposals
-- ============================================
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'COMMERCIAL',
  title TEXT NOT NULL,
  description TEXT,
  sectionsData TEXT DEFAULT '{}',
  totalValue REAL NOT NULL,
  discount REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  validUntil TEXT,
  version INTEGER DEFAULT 1,
  opportunity_id TEXT NOT NULL,
  priceTable_id TEXT,
  template_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_opportunity ON proposals(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- ============================================
-- TABELA: proposal_items
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_items (
  id TEXT PRIMARY KEY,
  quantity INTEGER DEFAULT 1,
  unitPrice REAL NOT NULL,
  discount REAL DEFAULT 0,
  totalPrice REAL NOT NULL,
  proposal_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_product ON proposal_items(product_id);

-- ============================================
-- TABELA: commissions
-- ============================================
CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  percentage REAL NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'PENDING',
  paidAt TEXT,
  opportunity_id TEXT UNIQUE NOT NULL,
  seller_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
  FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_commissions_seller ON commissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

-- ============================================
-- TABELA: contracts
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  value REAL NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  slaResponseTime INTEGER,
  slaResolutionTime INTEGER,
  slaAvailability REAL,
  slaDescription TEXT,
  company_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- ============================================
-- TABELA: regions
-- ============================================
CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  country TEXT DEFAULT 'Brasil',
  state TEXT,
  city TEXT,
  isActive INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(isActive);

-- ============================================
-- TABELA: tenant_companies (Licenciamento)
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legalName TEXT,
  cnpj TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'PROSPECT',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_companies_status ON tenant_companies(status);
CREATE INDEX IF NOT EXISTS idx_tenant_companies_cnpj ON tenant_companies(cnpj);

-- ============================================
-- TABELA: license_plans
-- ============================================
CREATE TABLE IF NOT EXISTS license_plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  billingCycle TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'BRL',
  seatsIncluded INTEGER DEFAULT 1,
  isActive INTEGER DEFAULT 1,
  sortOrder INTEGER DEFAULT 0,
  features TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_license_plans_active ON license_plans(isActive, sortOrder);

-- ============================================
-- TABELA: company_licenses
-- ============================================
CREATE TABLE IF NOT EXISTS company_licenses (
  id TEXT PRIMARY KEY,
  tenantCompany_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  seats INTEGER DEFAULT 1,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  priceAtPurchase REAL NOT NULL,
  notes TEXT,
  paymentReference TEXT UNIQUE,
  paymentStatus TEXT DEFAULT 'PENDING',
  paymentConfirmedAt TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantCompany_id) REFERENCES tenant_companies(id),
  FOREIGN KEY (plan_id) REFERENCES license_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_company_licenses_tenant ON company_licenses(tenantCompany_id);
CREATE INDEX IF NOT EXISTS idx_company_licenses_status ON company_licenses(status);
CREATE INDEX IF NOT EXISTS idx_company_licenses_payment ON company_licenses(paymentStatus);

-- ============================================
-- TABELA: support_tickets
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'MEDIUM',
  category TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',
  company_id TEXT,
  assignedTo_id TEXT,
  slaDeadline TEXT,
  resolvedAt TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (assignedTo_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignedTo ON support_tickets(assignedTo_id);

-- ============================================
-- TABELA: ticket_responses
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_responses (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  message TEXT NOT NULL,
  isInternal INTEGER DEFAULT 0,
  author_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_author ON ticket_responses(author_id);

-- ============================================
-- TABELA: nps_surveys
-- ============================================
CREATE TABLE IF NOT EXISTS nps_surveys (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  score INTEGER,
  feedback TEXT,
  status TEXT DEFAULT 'PENDING',
  sentAt TEXT,
  respondedAt TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_nps_surveys_company ON nps_surveys(company_id);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_status ON nps_surveys(status);

-- ============================================
-- TABELA: churn_alerts
-- ============================================
CREATE TABLE IF NOT EXISTS churn_alerts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  riskLevel TEXT NOT NULL,
  score REAL NOT NULL,
  reasons TEXT NOT NULL,
  assignedTo_id TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (assignedTo_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_churn_alerts_company ON churn_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_churn_alerts_status ON churn_alerts(status);

-- ============================================
-- TABELA: pre_sales_requests (Pré-Vendas)
-- ============================================
CREATE TABLE IF NOT EXISTS pre_sales_requests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'PENDING',
  priority TEXT DEFAULT 'MEDIUM',
  company_id TEXT,
  requester_id TEXT NOT NULL,
  approver_id TEXT,
  rejector_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  FOREIGN KEY (rejector_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pre_sales_requests_company ON pre_sales_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_pre_sales_requests_requester ON pre_sales_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_pre_sales_requests_status ON pre_sales_requests(status);

-- ============================================
-- TABELA: app_settings
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  app_name TEXT DEFAULT 'CRM Comercial',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#64748B',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INSERIR USUÁRIO MASTER PADRÃO
-- ============================================
INSERT OR IGNORE INTO users (
  id,
  email,
  name,
  password,
  role,
  company_id,
  active,
  accessB2B,
  accessB2G,
  accessPreSales,
  created_at,
  updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'master@master.com',
  'Master User',
  '$2b$10$lTKAs0VqeitQZRE5/t5ZtuLnZ83pcXURoJAmtBgB/zUlqaa4BnvTw.',
  'MASTER',
  NULL,
  1,
  1,
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ============================================
-- INSERIR CONFIGURAÇÕES PADRÃO
-- ============================================
INSERT OR IGNORE INTO app_settings (id, app_name, logo_url, updated_at)
VALUES (1, 'CRM Comercial - Nexos', NULL, CURRENT_TIMESTAMP);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
