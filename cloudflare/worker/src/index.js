import bcrypt from 'bcryptjs';

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers
    }
  });

const withCors = (response, origin = '*') => {
  const h = new Headers(response.headers);
  h.set('access-control-allow-origin', origin);
  h.set('access-control-allow-headers', 'content-type, authorization, x-company-id, x-user-id, x-user-role');
  h.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: h
  });
};

const AUTH_LOGIN_PATHS = new Set(['/auth/login']);
const AUTH_ME_PATHS = new Set(['/auth/me']);
const AUTH_LOGOUT_PATHS = new Set(['/auth/logout']);
const AUTH_REGISTER_PATHS = new Set(['/auth/register']);
const AUTH_FORGOT_PASSWORD_PATHS = new Set(['/auth/forgot-password']);

const SETTINGS_PATH = '/settings';
const SETTINGS_LOGO_PATH = '/settings/logo';
const HEALTH_PATH = '/health';
const PAYMENTS_PUBLIC_CONFIG_PATH = '/public/payments/config';
const CHECKOUT_CREATE_PREFERENCE_PATH = '/checkout/create-preference';
const CHECKOUT_WEBHOOK_PATH = '/checkout/webhook';
const LICENSING_PUBLIC_PLANS_PATH = '/licensing/public/plans';
const LICENSING_PUBLIC_CONFIRM_PATH = '/licensing/public/checkout/confirm';

const MODULES = {
  REGIONS: 'regions',
  COMPANIES: 'companies',
  OPPORTUNITIES: 'opportunities',
  ACTIVITIES: 'activities',
  PRODUCTS: 'products',
  PROPOSALS: 'proposals',
  PROPOSAL_TEMPLATES: 'proposal_templates',
  CONTRACTS: 'contracts',
  COMMISSIONS: 'commissions',
  SALES_TARGETS: 'sales_targets',
  ADVANCED_WORKFLOWS: 'advanced_workflows',
  WORKFLOWS: 'workflows',
  AUTOMATION_RULES: 'automation_rules',
  NOTIFICATIONS: 'notifications',
  INTEGRATIONS: 'integrations',
  PRICE_TABLES: 'price_tables',
  COMPETITORS: 'competitors',
  CROSS_SELL: 'cross_sell',
  UPSELL: 'upsell',
  APPROVALS: 'approvals',
  SOLICITACOES: 'solicitacoes',
  POST_SALES_ONBOARDING: 'post_sales_onboarding',
  POST_SALES_SUPPORT: 'post_sales_support',
  POST_SALES_NPS: 'post_sales_nps',
  POST_SALES_CHURN_ALERTS: 'post_sales_churn_alerts',
  B2G_NOTICES: 'b2g_notices',
  B2G_HISTORY: 'b2g_history',
  SAVED_ANALYSES: 'saved_analyses'
};

const BLOB_MODULES = {
  COMPANY_DOCUMENT: 'company_document',
  CONTRACT_ATTACHMENT: 'contract_attachment'
};

const DEFAULT_TENANT_COMPANY_ID = 'tenant-default';

const getRequestTenantCompanyId = (env) => {
  const raw = normalizeString(env?.__tenantCompanyId, 120);
  return raw || null;
};

const isMasterRequestScope = (env) => Boolean(env?.__isMasterSession);

const withRequestScope = (env, authContext) => {
  const role = normalizeRole(authContext?.user?.role);
  const isMaster = role === 'MASTER';
  const tenantCompanyIdRaw =
    normalizeString(authContext?.tenantCompanyId, 120) ||
    normalizeString(authContext?.user?.companyId, 120);

  return {
    ...env,
    __isMasterSession: isMaster,
    __tenantCompanyId: isMaster ? null : (tenantCompanyIdRaw || DEFAULT_TENANT_COMPANY_ID)
  };
};

const encoder = new TextEncoder();
const toBase64Url = (value) =>
  btoa(typeof value === 'string' ? value : JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return atob(normalized + pad);
};

const nowIso = () => new Date().toISOString();
const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const ANALYSIS_SCHEMAS = {
  request_edital: {
    type: 'object',
    properties: {
      fileDataUri: { type: 'string', minLength: 1 }
    },
    required: ['fileDataUri']
  },
  response_edital: {
    type: 'object',
    properties: {
      general: {
        type: 'object',
        properties: {
          openingDate: { type: 'string' },
          openingTime: { type: 'string' },
          portal: { type: 'string' },
          agency: { type: 'string' },
          modality: { type: 'string' },
          objectSummary: { type: 'string' }
        },
        required: ['openingDate', 'openingTime', 'portal', 'agency', 'modality', 'objectSummary']
      },
      deadlines: {
        type: 'object',
        properties: {
          publicationDate: { type: 'string' },
          impugnationDeadline: { type: 'string' },
          clarificationDeadline: { type: 'string' },
          proposalDeadline: { type: 'string' },
          contractTerm: { type: 'string' }
        },
        required: ['publicationDate', 'impugnationDeadline', 'clarificationDeadline', 'proposalDeadline', 'contractTerm']
      },
      requirements: {
        type: 'object',
        properties: {
          legal: { type: 'array', items: { type: 'string' } },
          technical: { type: 'array', items: { type: 'string' } },
          economic: { type: 'array', items: { type: 'string' } },
          fiscal: { type: 'array', items: { type: 'string' } }
        },
        required: ['legal', 'technical', 'economic', 'fiscal']
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: { type: 'string' },
            specs: { type: 'string' }
          },
          required: ['name', 'quantity', 'specs']
        }
      },
      risks: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['general', 'deadlines', 'requirements', 'items', 'risks']
  },
  request_tr: {
    type: 'object',
    properties: {
      fileDataUri: { type: 'string', minLength: 1 },
      analyzedModelName: { type: 'string', minLength: 1 },
      analyzedModelManufacturer: { type: 'string' },
      analyzedModelSpecs: { type: 'string', minLength: 1 },
      datasheetFileDataUri: { type: 'string' },
      datasheetFileName: { type: 'string' }
    },
    required: ['fileDataUri', 'analyzedModelName', 'analyzedModelSpecs']
  },
  response_tr: {
    type: 'object',
    properties: {
      analysisType: { type: 'string', enum: ['tr'] },
      trSummary: { type: 'string' },
      analyzedModel: {
        type: 'object',
        properties: {
          modelName: { type: 'string' },
          manufacturer: { type: 'string' },
          providedSpecs: { type: 'string' }
        },
        required: ['modelName', 'providedSpecs']
      },
      termRequirements: {
        type: 'array',
        items: { type: 'string' }
      },
      technicalNotebook: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            termRequirement: { type: 'string' },
            meetsRequirement: { type: 'string', enum: ['ATENDE', 'NAO_ATENDE'] },
            datasheetEvidence: { type: 'string' },
            rationale: { type: 'string' }
          },
          required: ['termRequirement', 'meetsRequirement', 'rationale']
        }
      },
      compliantEquipment: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            manufacturer: { type: 'string' },
            rationale: { type: 'string' }
          },
          required: ['model', 'manufacturer', 'rationale']
        }
      },
      complianceOverview: {
        type: 'object',
        properties: {
          totalRequirements: { type: 'number' },
          metRequirements: { type: 'number' },
          fullCompliance: { type: 'boolean' }
        },
        required: ['totalRequirements', 'metRequirements', 'fullCompliance']
      }
    },
    required: ['analysisType', 'trSummary', 'analyzedModel', 'termRequirements', 'technicalNotebook', 'compliantEquipment', 'complianceOverview']
  }
};
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const validateBySchema = (schema, data, path = '$') => {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.type === 'object') {
    if (!isPlainObject(data)) {
      errors.push(`${path} deve ser objeto.`);
      return errors;
    }
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        errors.push(`${path}.${key} é obrigatório.`);
      }
    }
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    for (const [key, propSchema] of Object.entries(properties)) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      errors.push(...validateBySchema(propSchema, data[key], `${path}.${key}`));
    }
    return errors;
  }

  if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push(`${path} deve ser array.`);
      return errors;
    }
    if (schema.items && typeof schema.items === 'object') {
      data.forEach((item, index) => {
        errors.push(...validateBySchema(schema.items, item, `${path}[${index}]`));
      });
    }
    return errors;
  }

  if (schema.type === 'string') {
    if (typeof data !== 'string') {
      errors.push(`${path} deve ser string.`);
      return errors;
    }
    if (Number.isFinite(schema.minLength) && data.length < schema.minLength) {
      errors.push(`${path} deve ter no mínimo ${schema.minLength} caracteres.`);
    }
  } else if (schema.type === 'number') {
    if (typeof data !== 'number' || !Number.isFinite(data)) {
      errors.push(`${path} deve ser number.`);
      return errors;
    }
  } else if (schema.type === 'boolean') {
    if (typeof data !== 'boolean') {
      errors.push(`${path} deve ser boolean.`);
      return errors;
    }
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0 && !schema.enum.includes(data)) {
    errors.push(`${path} deve ser um de: ${schema.enum.join(', ')}.`);
  }
  return errors;
};
const schemaErrorsToMessage = (errors) => asArray(errors).slice(0, 5).join(' ');
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const toInt = (value, fallback = 0) => {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const DEFAULT_FORCED_MASTER_EMAILS = ['admin@crm.com', 'chorstconsult@gmail.com'];
const getForcedMasterEmails = (env) => {
  const configured = String(env?.FORCE_MASTER_EMAILS || env?.MASTER_EMAILS || '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  return [...new Set([...configured, ...DEFAULT_FORCED_MASTER_EMAILS])];
};
const normalizeString = (value, max = 255) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
};
const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const token = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'active', 'ativo'].includes(token)) return true;
  if (['false', '0', 'no', 'off', 'inactive', 'inativo'].includes(token)) return false;
  return fallback;
};

const normalizePath = (pathname) => {
  const value = String(pathname || '/');
  if (value === '/api') return '/';
  if (value.startsWith('/api/')) return value.slice(4);
  return value;
};

const parseJsonBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const trimEnvUrl = (value, fallback = '') => {
  const normalized = normalizeString(value || fallback, 1024);
  return normalized.replace(/\s+/g, '').replace(/\/+$/, '');
};

const getFrontendUrl = (env) => trimEnvUrl(env.FRONTEND_URL, 'http://localhost:5174');

const getApiUrl = (env) => trimEnvUrl(env.API_URL, 'http://localhost:3002/api');

const toAbsoluteHttpUrl = (value, fallback = '') => {
  const normalized = trimEnvUrl(value, fallback);
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
};

const generateSetupPassword = () =>
  `Adm${Math.random().toString(36).slice(2, 8)}!${Math.floor(100 + Math.random() * 899)}`;

const textToSlug = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const uint8ToBase64 = (uint8) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const base64ToUint8 = (base64) => {
  const binary = atob(base64 || '');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
};

const getJwtSecret = (env) => env.JWT_SECRET || 'change-me-in-cloudflare-vars';
const getAuthMasterKey = (env) => String(env.AUTH_MASTER_KEY || '').trim();
const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

const getSigningKey = async (secret) =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

const signToken = async (headerPayload, secret) => {
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(headerPayload));
  return toBase64Url(String.fromCharCode(...new Uint8Array(sig)));
};

const createJwt = async (payload, secret) => {
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' });
  const body = toBase64Url(payload);
  const signature = await signToken(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
};

const verifyJwt = async (token, secret) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const key = await getSigningKey(secret);
  const signatureBytes = Uint8Array.from(fromBase64Url(signature), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    encoder.encode(`${header}.${payload}`)
  );

  if (!valid) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(payload));
    if (parsed?.exp && Date.now() >= parsed.exp * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
};

const normalizeRole = (role) => {
  const value = String(role || '').trim().toUpperCase();
  if (value === 'MASTER' || value === 'ADMIN' || value === 'USER' || value === 'PRE_SALES') return value;
  if (value === 'PRE-VENDAS' || value === 'PREVENDAS') return 'PRE_SALES';
  if (value === 'USUARIO') return 'USER';
  if (value === 'MANAGER' || value === 'DIRECTOR' || value === 'GERENTE') return 'ADMIN';
  if (value === 'SELLER' || value === 'VENDEDOR') return 'USER';
  return value || 'USER';
};

const isActiveUser = (user) => {
  if (user?.active !== undefined && user?.active !== null) {
    return Number(user.active) === 1 || user.active === true;
  }

  const status = String(user?.status || '').trim().toLowerCase();
  if (!status) return true;
  return ['ativo', 'active', 'enabled'].includes(status);
};

const verifyPassword = async (inputPassword, storedPassword) => {
  const normalizedStored = String(storedPassword || '');
  if (!normalizedStored) return false;
  if (BCRYPT_PREFIX.test(normalizedStored)) {
    return bcrypt.compare(inputPassword, normalizedStored);
  }
  return inputPassword === normalizedStored;
};

let usersTableColumnsPromise;
const getUsersTableColumns = async (env) => {
  if (!usersTableColumnsPromise) {
    usersTableColumnsPromise = env.DB.prepare('PRAGMA table_info(users)')
      .all()
      .then((result) => new Set((result?.results || []).map((column) => String(column.name || '').toLowerCase())));
  }
  return usersTableColumnsPromise;
};

let moduleRecordsColumnsPromise;
const getModuleRecordsColumns = async (env) => {
  if (!moduleRecordsColumnsPromise) {
    moduleRecordsColumnsPromise = env.DB.prepare('PRAGMA table_info(module_records)')
      .all()
      .then((result) => new Set((result?.results || []).map((column) => String(column.name || '').toLowerCase())));
  }
  return moduleRecordsColumnsPromise;
};

let userProfilesColumnsPromise;
const getUserProfilesColumns = async (env) => {
  if (!userProfilesColumnsPromise) {
    userProfilesColumnsPromise = env.DB.prepare('PRAGMA table_info(user_profiles)')
      .all()
      .then((result) => new Set((result?.results || []).map((column) => String(column.name || '').toLowerCase())));
  }
  return userProfilesColumnsPromise;
};

let binaryBlobsColumnsPromise;
const getBinaryBlobsColumns = async (env) => {
  if (!binaryBlobsColumnsPromise) {
    binaryBlobsColumnsPromise = env.DB.prepare('PRAGMA table_info(binary_blobs)')
      .all()
      .then((result) => new Set((result?.results || []).map((column) => String(column.name || '').toLowerCase())));
  }
  return binaryBlobsColumnsPromise;
};

const refreshTableColumnCaches = () => {
  usersTableColumnsPromise = null;
  moduleRecordsColumnsPromise = null;
  userProfilesColumnsPromise = null;
  binaryBlobsColumnsPromise = null;
};

const parseLegacyUserRow = (row) => {
  if (!row?.data) return null;

  try {
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return {
      id: row.id,
      email: normalizeEmail(data?.email),
      name: data?.name || '',
      password: String(data?.password || ''),
      role: normalizeRole(data?.role),
      companyId: normalizeString(data?.companyId, 120) || null,
      active: isActiveUser(data) ? 1 : 0,
      status: data?.status,
      rawData: data,
      storage: 'legacy-json',
      createdAt: data?.createdAt || row?.created_at || null
    };
  } catch {
    return null;
  }
};

const persistLegacyUser = async (env, userId, rawData) => {
  const timestamp = nowIso();
  const nextData = {
    ...rawData,
    id: rawData?.id || userId,
    updatedAt: timestamp
  };

  await env.DB.prepare('UPDATE users SET data = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(nextData), timestamp, userId)
    .run();

  return nextData;
};

const findUserByEmail = async (env, email) => {
  const columns = await getUsersTableColumns(env);
  const hasCompanyColumn = columns.has('company_id');

  if (columns.has('email')) {
    const query = hasCompanyColumn
      ? 'SELECT id, email, name, password, role, company_id, active, created_at FROM users WHERE lower(email) = lower(?) LIMIT 1'
      : 'SELECT id, email, name, password, role, active, created_at FROM users WHERE lower(email) = lower(?) LIMIT 1';
    const user = await env.DB.prepare(query)
      .bind(email)
      .first();

    if (!user) return null;
    return {
      ...user,
      createdAt: user.created_at,
      email: normalizeEmail(user.email),
      role: normalizeRole(user.role),
      companyId: hasCompanyColumn ? normalizeString(user.company_id, 120) || null : null,
      active: isActiveUser(user) ? 1 : 0,
      storage: 'columns'
    };
  }

  if (columns.has('data')) {
    const row = await env.DB.prepare(
      "SELECT id, data, created_at FROM users WHERE lower(json_extract(data, '$.email')) = lower(?) LIMIT 1"
    )
      .bind(email)
      .first();

    return parseLegacyUserRow(row);
  }

  return null;
};

const findUserById = async (env, userId) => {
  const columns = await getUsersTableColumns(env);
  const hasCompanyColumn = columns.has('company_id');

  if (columns.has('email')) {
    const query = hasCompanyColumn
      ? 'SELECT id, email, name, password, role, company_id, active, created_at FROM users WHERE id = ? LIMIT 1'
      : 'SELECT id, email, name, password, role, active, created_at FROM users WHERE id = ? LIMIT 1';
    const user = await env.DB.prepare(query)
      .bind(userId)
      .first();

    if (!user) return null;
    return {
      ...user,
      createdAt: user.created_at,
      email: normalizeEmail(user.email),
      role: normalizeRole(user.role),
      companyId: hasCompanyColumn ? normalizeString(user.company_id, 120) || null : null,
      active: isActiveUser(user) ? 1 : 0,
      storage: 'columns'
    };
  }

  if (columns.has('data')) {
    const row = await env.DB.prepare('SELECT id, data, created_at FROM users WHERE id = ? LIMIT 1')
      .bind(userId)
      .first();

    return parseLegacyUserRow(row);
  }

  return null;
};

const createUser = async (env, { name, email, password, role, companyId = null }) => {
  const columns = await getUsersTableColumns(env);
  const userId = crypto.randomUUID();
  const normalizedRole = normalizeRole(role);
  const normalizedCompanyId =
    normalizedRole === 'MASTER'
      ? null
      : (normalizeString(companyId, 120) || getRequestTenantCompanyId(env) || DEFAULT_TENANT_COMPANY_ID);

  if (columns.has('email')) {
    if (columns.has('company_id')) {
      await env.DB.prepare(
        'INSERT INTO users (id, email, name, password, role, company_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
        .bind(userId, email, name, password, normalizedRole, normalizedCompanyId)
        .run();
    } else {
      await env.DB.prepare(
        'INSERT INTO users (id, email, name, password, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
        .bind(userId, email, name, password, normalizedRole)
        .run();
    }

    return findUserById(env, userId);
  }

  if (columns.has('data')) {
    const timestamp = nowIso();
    const data = {
      id: userId,
      name,
      email,
      password,
      role: normalizedRole,
      companyId: normalizedCompanyId,
      status: 'Ativo',
      mustChangePassword: false,
      customPermissions: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await env.DB.prepare('INSERT INTO users (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .bind(userId, JSON.stringify(data), timestamp, timestamp)
      .run();

    return parseLegacyUserRow({ id: userId, data: JSON.stringify(data), created_at: timestamp });
  }

  throw new Error('Tabela users sem formato suportado');
};

let schemaEnsurePromise;
let schemaReady = false;

const runStatements = async (env, statements) => {
  for (const statement of statements) {
    await env.DB.prepare(statement).run();
  }
};

const ensureColumnExists = async (env, tableName, columnName, columnDefinitionSql) => {
  const info = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = (info?.results || []).some(
    (column) => String(column.name || '').toLowerCase() === String(columnName || '').toLowerCase()
  );
  if (!hasColumn) {
    await env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinitionSql}`).run();
  }
};

const tableExists = async (env, tableName) => {
  const row = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
  )
    .bind(String(tableName || '').trim())
    .first();
  return Boolean(row?.name);
};

const ensureModuleRecordsCompanyScopedPrimaryKey = async (env) => {
  const info = await env.DB.prepare('PRAGMA table_info(module_records)').all();
  const columns = info?.results || [];
  if (!columns.length) return;
  const legacyExists = await tableExists(env, 'module_records_legacy');

  const hasCompanyColumn = columns.some((column) => String(column?.name || '').toLowerCase() === 'company_id');
  const hasCompanyInPrimaryKey = columns.some(
    (column) => String(column?.name || '').toLowerCase() === 'company_id' && toInt(column?.pk, 0) > 0
  );

  if (hasCompanyColumn && hasCompanyInPrimaryKey) {
    if (legacyExists) {
      await env.DB.prepare(
        `INSERT INTO module_records (module, id, company_id, data, created_at, updated_at)
         SELECT
           module,
           id,
           COALESCE(NULLIF(trim(company_id), ''), ?),
           data,
           created_at,
           updated_at
         FROM module_records_legacy
         ON CONFLICT(module, company_id, id) DO UPDATE SET
           data = excluded.data,
           updated_at = excluded.updated_at`
      )
        .bind(DEFAULT_TENANT_COMPANY_ID)
        .run();
      await env.DB.prepare('DROP TABLE IF EXISTS module_records_legacy').run();
    }
    return;
  }

  if (!hasCompanyColumn) {
    await env.DB.prepare('ALTER TABLE module_records ADD COLUMN company_id TEXT').run();
  }

  await env.DB.prepare('UPDATE module_records SET company_id = ? WHERE company_id IS NULL OR trim(company_id) = \'\'')
    .bind(DEFAULT_TENANT_COMPANY_ID)
    .run();

  await runStatements(env, [
    'DROP INDEX IF EXISTS idx_module_records_module',
    'DROP INDEX IF EXISTS idx_module_records_company',
    'DROP TABLE IF EXISTS module_records_legacy',
    'ALTER TABLE module_records RENAME TO module_records_legacy',
    `CREATE TABLE module_records (
      module TEXT NOT NULL,
      id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (module, company_id, id)
    )`
  ]);

  await env.DB.prepare(
    `INSERT INTO module_records (module, id, company_id, data, created_at, updated_at)
     SELECT
       module,
       id,
       COALESCE(NULLIF(trim(company_id), ''), ?),
       data,
       created_at,
       updated_at
     FROM module_records_legacy`
  )
    .bind(DEFAULT_TENANT_COMPANY_ID)
    .run();

  await runStatements(env, [
    'DROP TABLE IF EXISTS module_records_legacy',
    'CREATE INDEX IF NOT EXISTS idx_module_records_module ON module_records(module)',
    'CREATE INDEX IF NOT EXISTS idx_module_records_company ON module_records(company_id)'
  ]);

  refreshTableColumnCaches();
};

const ensureSchema = async (env) => {
  if (schemaReady) return;
  if (schemaEnsurePromise) {
    await schemaEnsurePromise;
    return;
  }

  schemaEnsurePromise = (async () => {
    await runStatements(env, [
      `CREATE TABLE IF NOT EXISTS users (
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
      )`,
      `CREATE TABLE IF NOT EXISTS module_records (
        module TEXT NOT NULL,
        id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (module, company_id, id)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_module_records_module ON module_records(module)',
      `CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        app_name TEXT,
        logo_url TEXT,
        updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        company_id TEXT,
        region_id TEXT,
        quota REAL,
        updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS binary_blobs (
        id TEXT PRIMARY KEY,
        module TEXT NOT NULL,
        company_id TEXT,
        parent_id TEXT,
        original_name TEXT,
        mime_type TEXT,
        size INTEGER,
        data_base64 TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      'CREATE INDEX IF NOT EXISTS idx_binary_blobs_module_parent ON binary_blobs(module, parent_id)'
    ]);

    await ensureColumnExists(env, 'users', 'company_id', 'company_id TEXT');
    await ensureColumnExists(env, 'module_records', 'company_id', 'company_id TEXT');
    await ensureColumnExists(env, 'user_profiles', 'company_id', 'company_id TEXT');
    await ensureColumnExists(env, 'binary_blobs', 'company_id', 'company_id TEXT');

    await runStatements(env, [
      'CREATE INDEX IF NOT EXISTS idx_module_records_company ON module_records(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_binary_blobs_company ON binary_blobs(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id)'
    ]);

    refreshTableColumnCaches();

    await env.DB.prepare('UPDATE users SET company_id = ? WHERE (company_id IS NULL OR trim(company_id) = \'\') AND upper(role) <> \'MASTER\'')
      .bind(DEFAULT_TENANT_COMPANY_ID)
      .run();
    await env.DB.prepare('UPDATE module_records SET company_id = ? WHERE company_id IS NULL OR trim(company_id) = \'\'')
      .bind(DEFAULT_TENANT_COMPANY_ID)
      .run();
    await env.DB.prepare(
      `UPDATE user_profiles
       SET company_id = (
         SELECT COALESCE(u.company_id, ?) FROM users u WHERE u.id = user_profiles.user_id
       )
       WHERE user_id IN (SELECT id FROM users) AND (company_id IS NULL OR trim(company_id) = '')`
    )
      .bind(DEFAULT_TENANT_COMPANY_ID)
      .run();
    await env.DB.prepare('UPDATE user_profiles SET company_id = ? WHERE company_id IS NULL OR trim(company_id) = \'\'')
      .bind(DEFAULT_TENANT_COMPANY_ID)
      .run();
    await env.DB.prepare('UPDATE binary_blobs SET company_id = ? WHERE company_id IS NULL OR trim(company_id) = \'\'')
      .bind(DEFAULT_TENANT_COMPANY_ID)
      .run();

    await ensureModuleRecordsCompanyScopedPrimaryKey(env);

    await env.DB.prepare(
      'INSERT OR IGNORE INTO app_settings (id, app_name, logo_url, updated_at) VALUES (1, ?, NULL, ?)'
    )
      .bind('CRM Automatizado B2G', nowIso())
      .run();

    const regionsCountRow = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM module_records WHERE module = ?'
    ).bind(MODULES.REGIONS).first();

    if (toInt(regionsCountRow?.count, 0) === 0) {
      const now = nowIso();
      const defaultRegions = [
        { id: crypto.randomUUID(), name: 'Sudeste', code: 'SE', city: 'São Paulo', state: 'SP', country: 'Brasil' },
        { id: crypto.randomUUID(), name: 'Sul', code: 'S', city: 'Curitiba', state: 'PR', country: 'Brasil' },
        { id: crypto.randomUUID(), name: 'Nordeste', code: 'NE', city: 'Recife', state: 'PE', country: 'Brasil' }
      ];

      for (const region of defaultRegions) {
        const payload = {
          ...region,
          companyId: DEFAULT_TENANT_COMPANY_ID,
          createdAt: now,
          updatedAt: now
        };

        await env.DB.prepare(
          'INSERT INTO module_records (module, id, company_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(MODULES.REGIONS, region.id, DEFAULT_TENANT_COMPANY_ID, JSON.stringify(payload), now, now)
          .run();
      }
    }

    const userCountRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
    if (toInt(userCountRow?.count, 0) === 0) {
      const adminEmail = normalizeEmail(env.DEFAULT_ADMIN_EMAIL || 'admin@crm.com');
      const adminPassword = String(env.DEFAULT_ADMIN_PASSWORD || 'admin123');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await createUser(env, {
        name: 'Administrador',
        email: adminEmail,
        password: hashedPassword,
        role: 'MASTER'
      });
    }

    const mastersCountRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE upper(role) = 'MASTER'").first();
    if (toInt(mastersCountRow?.count, 0) === 0) {
      const preferredEmail = normalizeEmail(env.DEFAULT_ADMIN_EMAIL || 'admin@crm.com');
      const preferred = await env.DB.prepare(
        "SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1"
      )
        .bind(preferredEmail)
        .first();
      if (preferred?.id) {
        await env.DB.prepare("UPDATE users SET role = 'MASTER', company_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(preferred.id)
          .run();
      } else {
        await env.DB.prepare(
          "UPDATE users SET role = 'MASTER', company_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id IN (SELECT id FROM users ORDER BY datetime(created_at) ASC LIMIT 1)"
        ).run();
      }
    }

    const forcedMasterEmails = getForcedMasterEmails(env);
    if (forcedMasterEmails.length > 0) {
      const usersColumns = await getUsersTableColumns(env);
      if (usersColumns.has('email')) {
        const setClauses = ["role = 'MASTER'", 'updated_at = CURRENT_TIMESTAMP'];
        if (usersColumns.has('company_id')) setClauses.push('company_id = NULL');
        if (usersColumns.has('active')) setClauses.push('active = 1');
        const placeholders = forcedMasterEmails.map(() => '?').join(', ');
        await env.DB.prepare(
          `UPDATE users
           SET ${setClauses.join(', ')}
           WHERE lower(email) IN (${placeholders})`
        )
          .bind(...forcedMasterEmails)
          .run();
      } else if (usersColumns.has('data')) {
        for (const email of forcedMasterEmails) {
          const current = await findUserByEmail(env, email);
          if (!current?.id) continue;
          const nextRawData = {
            ...(current.rawData || {}),
            role: 'MASTER',
            companyId: null,
            status: 'Ativo',
            active: 1
          };
          await persistLegacyUser(env, current.id, nextRawData);
        }
      }
    }

    schemaReady = true;
  })();

  try {
    await schemaEnsurePromise;
  } catch (error) {
    schemaEnsurePromise = null;
    schemaReady = false;
    throw error;
  }
};

const parseModuleRow = (row) => {
  const parsed = safeJsonParse(row?.data, {});
  const id = parsed?.id || row?.id || crypto.randomUUID();
  const createdAt = parsed?.createdAt || row?.created_at || nowIso();
  const updatedAt = parsed?.updatedAt || row?.updated_at || createdAt;
  const companyId = normalizeString(parsed?.companyId || row?.company_id, 120) || null;
  return {
    ...asObject(parsed),
    id,
    companyId,
    createdAt,
    updatedAt
  };
};

const listModuleRecords = async (env, module) => {
  const columns = await getModuleRecordsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const scoped = hasCompanyColumn && tenantCompanyId && !isMasterRequestScope(env);

  const query = scoped
    ? 'SELECT id, company_id, data, created_at, updated_at FROM module_records WHERE module = ? AND company_id = ? ORDER BY datetime(created_at) DESC'
    : hasCompanyColumn
      ? 'SELECT id, company_id, data, created_at, updated_at FROM module_records WHERE module = ? ORDER BY datetime(created_at) DESC'
      : 'SELECT id, data, created_at, updated_at FROM module_records WHERE module = ? ORDER BY datetime(created_at) DESC';
  const result = await env.DB.prepare(query)
    .bind(...(scoped ? [module, tenantCompanyId] : [module]))
    .all();
  return (result?.results || []).map(parseModuleRow);
};

const getModuleRecord = async (env, module, id, companyIdHint = null) => {
  if (!id) return null;
  const columns = await getModuleRecordsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const explicitCompanyId = hasCompanyColumn ? normalizeString(companyIdHint, 120) : '';
  const scoped = hasCompanyColumn && tenantCompanyId && !isMasterRequestScope(env);
  const query = scoped
    ? 'SELECT id, company_id, data, created_at, updated_at FROM module_records WHERE module = ? AND id = ? AND company_id = ? LIMIT 1'
    : explicitCompanyId
      ? 'SELECT id, company_id, data, created_at, updated_at FROM module_records WHERE module = ? AND id = ? AND company_id = ? LIMIT 1'
    : hasCompanyColumn
      ? 'SELECT id, company_id, data, created_at, updated_at FROM module_records WHERE module = ? AND id = ? LIMIT 1'
      : 'SELECT id, data, created_at, updated_at FROM module_records WHERE module = ? AND id = ? LIMIT 1';
  const row = await env.DB.prepare(query)
    .bind(...((scoped || explicitCompanyId) ? [module, id, scoped ? tenantCompanyId : explicitCompanyId] : [module, id]))
    .first();
  return row ? parseModuleRow(row) : null;
};

const upsertModuleRecord = async (env, module, payload, idInput = null) => {
  const columns = await getModuleRecordsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const scoped = hasCompanyColumn && tenantCompanyId && !isMasterRequestScope(env);
  const payloadCompanyId = hasCompanyColumn ? normalizeString(payload?.companyId, 120) : '';

  const id = String(idInput || payload?.id || crypto.randomUUID()).trim() || crypto.randomUUID();
  const current = await getModuleRecord(env, module, id, payloadCompanyId || null);
  const companyId = hasCompanyColumn
    ? (scoped
      ? tenantCompanyId
      : (payloadCompanyId || normalizeString(current?.companyId, 120) || DEFAULT_TENANT_COMPANY_ID))
    : null;
  const createdAt = current?.createdAt || payload?.createdAt || nowIso();
  const updatedAt = nowIso();

  const next = {
    ...(current || {}),
    ...asObject(payload),
    id,
    ...(hasCompanyColumn ? { companyId } : {}),
    createdAt,
    updatedAt
  };

  if (hasCompanyColumn) {
    await env.DB.prepare(
      `INSERT INTO module_records (module, id, company_id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(module, company_id, id) DO UPDATE SET
         company_id = excluded.company_id,
         data = excluded.data,
         updated_at = excluded.updated_at`
    )
      .bind(module, id, companyId, JSON.stringify(next), createdAt, updatedAt)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO module_records (module, id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(module, id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at`
    )
      .bind(module, id, JSON.stringify(next), createdAt, updatedAt)
      .run();
  }

  return next;
};

const deleteModuleRecord = async (env, module, id) => {
  if (!id) return false;
  const columns = await getModuleRecordsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const scoped = hasCompanyColumn && tenantCompanyId && !isMasterRequestScope(env);
  let effectiveCompanyId = scoped ? tenantCompanyId : '';
  if (hasCompanyColumn && !effectiveCompanyId) {
    const existing = await env.DB.prepare(
      'SELECT company_id FROM module_records WHERE module = ? AND id = ? ORDER BY datetime(updated_at) DESC LIMIT 1'
    )
      .bind(module, id)
      .first();
    effectiveCompanyId = normalizeString(existing?.company_id, 120);
  }

  const useCompanyScope = hasCompanyColumn && !!effectiveCompanyId;
  const query = useCompanyScope
    ? 'DELETE FROM module_records WHERE module = ? AND id = ? AND company_id = ?'
    : 'DELETE FROM module_records WHERE module = ? AND id = ?';
  await env.DB.prepare(query)
    .bind(...(useCompanyScope ? [module, id, effectiveCompanyId] : [module, id]))
    .run();
  return true;
};

const listModuleByField = async (env, module, field, value) => {
  const rows = await listModuleRecords(env, module);
  return rows.filter((row) => String(row?.[field] || '') === String(value || ''));
};

const getSettings = async (env) => {
  const row = await env.DB.prepare('SELECT app_name, logo_url FROM app_settings WHERE id = 1').first();
  return {
    appName: row?.app_name || 'CRM Automatizado B2G',
    logoUrl: row?.logo_url || null
  };
};

const updateSettings = async (env, patch) => {
  const current = await getSettings(env);
  const next = {
    appName: patch?.appName !== undefined ? String(patch.appName || '').trim() : current.appName,
    logoUrl: patch?.logoUrl !== undefined ? (String(patch.logoUrl || '').trim() || null) : current.logoUrl
  };

  await env.DB.prepare('UPDATE app_settings SET app_name = ?, logo_url = ?, updated_at = ? WHERE id = 1')
    .bind(next.appName || 'CRM Automatizado B2G', next.logoUrl, nowIso())
    .run();

  return next;
};

const listBinaryBlobs = async (env, module, parentId = null) => {
  const columns = await getBinaryBlobsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const scoped = hasCompanyColumn && tenantCompanyId && !isMasterRequestScope(env);

  const query = parentId
    ? scoped
      ? 'SELECT * FROM binary_blobs WHERE module = ? AND parent_id = ? AND company_id = ? ORDER BY datetime(created_at) DESC'
      : 'SELECT * FROM binary_blobs WHERE module = ? AND parent_id = ? ORDER BY datetime(created_at) DESC'
    : scoped
      ? 'SELECT * FROM binary_blobs WHERE module = ? AND company_id = ? ORDER BY datetime(created_at) DESC'
      : 'SELECT * FROM binary_blobs WHERE module = ? ORDER BY datetime(created_at) DESC';
  const prepared = env.DB.prepare(query);
  const bindValues = parentId
    ? (scoped ? [module, parentId, tenantCompanyId] : [module, parentId])
    : (scoped ? [module, tenantCompanyId] : [module]);
  const result = await prepared.bind(...bindValues).all();

  return (result?.results || []).map((row) => ({
    id: row.id,
    module: row.module,
    companyId: normalizeString(row.company_id, 120) || null,
    parentId: row.parent_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: toInt(row.size, 0),
    createdAt: row.created_at,
    dataBase64: row.data_base64
  }));
};

const getBinaryBlob = async (env, id) => {
  if (!id) return null;
  const columns = await getBinaryBlobsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const scoped = hasCompanyColumn && tenantCompanyId && !isMasterRequestScope(env);
  const query = scoped
    ? 'SELECT * FROM binary_blobs WHERE id = ? AND company_id = ? LIMIT 1'
    : 'SELECT * FROM binary_blobs WHERE id = ? LIMIT 1';
  const row = await env.DB.prepare(query)
    .bind(...(scoped ? [id, tenantCompanyId] : [id]))
    .first();
  if (!row) return null;
  return {
    id: row.id,
    module: row.module,
    companyId: normalizeString(row.company_id, 120) || null,
    parentId: row.parent_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: toInt(row.size, 0),
    createdAt: row.created_at,
    dataBase64: row.data_base64
  };
};

const saveBinaryBlob = async (env, module, parentId, file) => {
  const columns = await getBinaryBlobsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env) || DEFAULT_TENANT_COMPANY_ID;
  const id = crypto.randomUUID();
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const dataBase64 = uint8ToBase64(bytes);
  const size = bytes.byteLength;

  if (hasCompanyColumn) {
    await env.DB.prepare(
      `INSERT INTO binary_blobs
        (id, module, company_id, parent_id, original_name, mime_type, size, data_base64, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        module,
        tenantCompanyId,
        parentId || null,
        file.name || 'arquivo.bin',
        file.type || 'application/octet-stream',
        size,
        dataBase64,
        nowIso()
      )
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO binary_blobs
        (id, module, parent_id, original_name, mime_type, size, data_base64, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, module, parentId || null, file.name || 'arquivo.bin', file.type || 'application/octet-stream', size, dataBase64, nowIso())
      .run();
  }

  return {
    id,
    module,
    companyId: hasCompanyColumn ? tenantCompanyId : null,
    parentId,
    originalName: file.name || 'arquivo.bin',
    mimeType: file.type || 'application/octet-stream',
    size,
    createdAt: nowIso(),
    dataBase64
  };
};

const deleteBinaryBlob = async (env, id) => {
  if (!id) return false;
  const columns = await getBinaryBlobsColumns(env);
  const hasCompanyColumn = columns.has('company_id');
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const scoped = hasCompanyColumn && tenantCompanyId && !isMasterRequestScope(env);
  const query = scoped
    ? 'DELETE FROM binary_blobs WHERE id = ? AND company_id = ?'
    : 'DELETE FROM binary_blobs WHERE id = ?';
  await env.DB.prepare(query)
    .bind(...(scoped ? [id, tenantCompanyId] : [id]))
    .run();
  return true;
};

const countByField = (items, key, value) =>
  asArray(items).filter((item) => String(item?.[key] || '') === String(value || '')).length;

const computeOpportunityStats = (opportunities) => {
  const rows = asArray(opportunities);
  const total = rows.length;
  const wonRows = rows.filter((item) => item.stage === 'WON');
  const won = wonRows.length;
  const wonValue = wonRows.reduce((sum, item) => sum + toNumber(item.value, 0), 0);
  const totalValue = rows.reduce((sum, item) => sum + toNumber(item.value, 0), 0);

  return {
    total,
    won,
    wonValue,
    totalValue,
    conversionRate: total > 0 ? Number(((won / total) * 100).toFixed(1)) : 0,
    avgTicket: won > 0 ? wonValue / won : 0
  };
};

const sanitizeCompanyPayload = (payload) => {
  const body = asObject(payload);
  return {
    id: body.id,
    name: String(body.name || '').trim(),
    document: String(body.document || '').trim(),
    segment: String(body.segment || '').trim(),
    size: String(body.size || 'SMALL').toUpperCase(),
    website: String(body.website || '').trim(),
    logo: String(body.logo || '').trim(),
    address: String(body.address || '').trim(),
    city: String(body.city || '').trim(),
    state: String(body.state || '').trim(),
    country: String(body.country || 'Brasil').trim(),
    status: String(body.status || 'LEAD').toUpperCase(),
    leadScore: clamp(toNumber(body.leadScore ?? body.lead_score, 0), 0, 100),
    churnRisk: clamp(toNumber(body.churnRisk ?? body.churn_risk, 0), 0, 100),
    contacts: asArray(body.contacts).map((contact) => ({
      id: String(contact?.id || crypto.randomUUID()),
      name: String(contact?.name || '').trim(),
      email: String(contact?.email || '').trim(),
      phone: String(contact?.phone || '').trim(),
      position: String(contact?.position || '').trim(),
      isPrimary: toBool(contact?.isPrimary, false)
    }))
  };
};

const hydrateOpportunity = (opportunity, companiesMap, usersMap) => {
  if (!opportunity) return opportunity;
  const company = companiesMap.get(String(opportunity.companyId || '')) || null;
  const owner = usersMap.get(String(opportunity.ownerId || '')) || null;
  return {
    ...opportunity,
    company,
    owner
  };
};

const getScopeHeaders = (request) => {
  const companyId = String(request.headers.get('x-company-id') || '').trim();
  const userId = String(request.headers.get('x-user-id') || '').trim();
  const userRole = String(request.headers.get('x-user-role') || '').trim().toLowerCase();

  return {
    companyId: companyId || 'crm-b2g-default',
    userId,
    userRole: userRole || 'user'
  };
};

const buildBasicAnalysisExtractedData = ({ mode, title, organization, summary, instruction }) => {
  const isTr = String(mode || '').toUpperCase() === 'TR';
  const today = new Date();
  const proposalDeadline = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 15);
  const dateBr = today.toLocaleDateString('pt-BR');
  const proposalBr = proposalDeadline.toLocaleDateString('pt-BR');
  const defaultObjectSummary = summary || 'Objeto técnico/comercial extraído automaticamente.';
  const defaultAgency = organization || 'Órgão não identificado';
  const defaultGeneral = {
    openingDate: dateBr,
    openingTime: '09:00',
    portal: 'Não identificado',
    agency: defaultAgency,
    modality: isTr ? 'Termo de Referência' : 'Pregão Eletrônico',
    objectSummary: defaultObjectSummary
  };
  const defaultDeadlines = {
    publicationDate: dateBr,
    impugnationDeadline: dateBr,
    clarificationDeadline: dateBr,
    proposalDeadline: proposalBr,
    contractTerm: '12 meses'
  };
  const defaultRequirements = {
    legal: [],
    technical: [],
    economic: [],
    fiscal: []
  };

  if (!isTr) {
    return {
      analysisType: 'edital',
      general: defaultGeneral,
      deadlines: defaultDeadlines,
      requirements: defaultRequirements,
      items: [
        {
          name: title || 'Item principal',
          quantity: '1',
          specs: 'Não identificado'
        }
      ],
      risks: [
        'Prazo curto para entrega de documentação',
        'Dependência de homologação técnica'
      ],
      keyPoints: [
        'Escopo técnico identificado',
        'Critérios de qualificação definidos',
        'Prazo estimado de execução mapeado'
      ],
      opportunities: [
        'Potencial de expansão comercial',
        'Possibilidade de contrato recorrente'
      ],
      nextActions: [
        'Validar documentação obrigatória',
        'Revisar composição de preço',
        'Preparar estratégia de proposta'
      ],
      requirementGroups: [
        { label: 'Habilitação', items: ['Regularidade fiscal', 'Capacidade técnica'] },
        { label: 'Comercial', items: ['Garantia mínima', 'Prazo de entrega'] }
      ],
      scoreAderencia: 78,
      recomendacao: 'GO',
      promptUsed: instruction || ''
    };
  }

  const termRequirements = [
    'Atendimento integral ao TR',
    'Comprovação de experiência similar',
    'Compatibilidade com requisitos funcionais',
    'Conformidade de desempenho mínimo',
    'Evidência técnica em datasheet'
  ];
  const technicalNotebook = termRequirements.map((termRequirement, index) => ({
    termRequirement,
    meetsRequirement: index === 0 ? 'ATENDE' : 'NAO_ATENDE',
    datasheetEvidence:
      index === 0
        ? `TR exige ${termRequirement}. Modelo possui evidência objetiva`
        : `TR exige ${termRequirement}. Modelo possui diferença técnica não comprovada ou Não identificado`,
    rationale:
      index === 0
        ? 'Requisito atendido conforme análise inicial.'
        : 'Requisito pendente de comprovação técnica.'
  }));
  const metRequirements = technicalNotebook.filter((row) => row.meetsRequirement === 'ATENDE').length;
  const totalRequirements = technicalNotebook.length;

  return {
    analysisType: 'tr',
    trSummary: summary || `Análise técnica inicial para ${title || 'TR sem título'}.`,
    analyzedModel: {
      modelName: title || 'Modelo não identificado',
      manufacturer: 'Não identificado',
      providedSpecs: instruction || 'Não identificado'
    },
    termRequirements,
    technicalNotebook,
    compliantEquipment: [],
    complianceOverview: {
      totalRequirements,
      metRequirements,
      fullCompliance: metRequirements === totalRequirements && totalRequirements > 0
    },
    general: defaultGeneral,
    deadlines: defaultDeadlines,
    requirements: defaultRequirements,
    items: [
      {
        name: title || 'Item principal',
        quantity: '1',
        specs: 'Não identificado'
      }
    ],
    risks: [
      'Prazo curto para entrega de documentação',
      'Dependência de homologação técnica'
    ],
    keyPoints: [
      'Escopo técnico identificado',
      'Critérios de qualificação definidos',
      'Prazo estimado de execução mapeado'
    ],
    opportunities: [
      'Potencial de expansão comercial',
      'Possibilidade de contrato recorrente'
    ],
    nextActions: [
      'Validar documentação obrigatória',
      'Revisar composição de preço',
      'Preparar estratégia de proposta'
    ],
    requirementGroups: [
      { label: 'Habilitação', items: ['Regularidade fiscal', 'Capacidade técnica'] },
      { label: 'Comercial', items: ['Garantia mínima', 'Prazo de entrega'] }
    ],
    scoreAderencia: 78,
    recomendacao: 'GO',
    promptUsed: instruction || ''
  };
};

const buildAiAnalysisFromNotice = ({ notice, instruction = '', mode = '' }) => {
  const inferredMode = mode || (String(notice?.type || '').toUpperCase() === 'TERMO_REFERENCIA' ? 'TR' : 'EDITAL');
  const summary = String(notice?.summary || notice?.objectDescription || '').trim();
  const extractedData = buildBasicAnalysisExtractedData({
    mode: inferredMode,
    title: notice?.title,
    organization: notice?.organization,
    summary,
    instruction
  });

  return {
    generatedAt: nowIso(),
    recomendacao: extractedData.recomendacao,
    scoreAderencia: extractedData.scoreAderencia,
    resumoExecutivo:
      extractedData.trSummary ||
      extractedData.general?.objectSummary ||
      `Análise automática gerada para ${notice?.title || 'registro sem título'}.`,
    pontosChave: extractedData.keyPoints,
    riscos: extractedData.risks,
    oportunidades: extractedData.opportunities,
    proximasAcoes: extractedData.nextActions,
    templateExtractedData: extractedData
  };
};

const getBearerToken = (request) => {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
};

const resolveUserTenantCompanyId = async (env, user) => {
  const direct = normalizeString(user?.companyId, 120);
  if (direct) return direct;

  const profileColumns = await getUserProfilesColumns(env);
  if (profileColumns.has('company_id')) {
    const profile = await env.DB.prepare('SELECT company_id FROM user_profiles WHERE user_id = ? LIMIT 1')
      .bind(user.id)
      .first();
    const fromProfile = normalizeString(profile?.company_id, 120);
    if (fromProfile) return fromProfile;
  }

  return null;
};

const requireAuthContext = async (request, env) => {
  const token = getBearerToken(request);
  if (!token) {
    return { response: json({ error: 'Não autorizado' }, 401), user: null, payload: null };
  }

  const payload = await verifyJwt(token, getJwtSecret(env));
  if (!payload?.sub) {
    return { response: json({ error: 'Token inválido' }, 401), user: null, payload: null };
  }

  const user = await findUserById(env, payload.sub);
  if (!user || Number(user.active || 0) !== 1) {
    return { response: json({ error: 'Usuário inválido' }, 401), user: null, payload: null };
  }

  const role = normalizeRole(user.role);
  const tenantCompanyId = role === 'MASTER'
    ? null
    : (await resolveUserTenantCompanyId(env, user)) || DEFAULT_TENANT_COMPANY_ID;

  return {
    response: null,
    user: {
      ...user,
      role,
      companyId: role === 'MASTER' ? null : tenantCompanyId
    },
    payload,
    tenantCompanyId,
    isMasterSession: role === 'MASTER'
  };
};

const methodNotAllowed = () => json({ error: 'Método não permitido' }, 405);
const notFound = () => json({ error: 'Rota não encontrada' }, 404);
const badRequest = (message) => json({ error: message || 'Requisição inválida' }, 400);

const loadUsersForView = async (env) => {
  const users = [];
  const columns = await getUsersTableColumns(env);
  const profilesColumns = await getUserProfilesColumns(env);
  const tenantCompanyId = getRequestTenantCompanyId(env);
  const scoped = tenantCompanyId && !isMasterRequestScope(env) && columns.has('company_id');

  if (columns.has('email')) {
    const query = columns.has('company_id')
      ? (scoped
        ? 'SELECT id, name, email, role, company_id, active, created_at FROM users WHERE company_id = ? ORDER BY datetime(created_at) DESC'
        : 'SELECT id, name, email, role, company_id, active, created_at FROM users ORDER BY datetime(created_at) DESC')
      : 'SELECT id, name, email, role, active, created_at FROM users ORDER BY datetime(created_at) DESC';
    const rows = await env.DB.prepare(query)
      .bind(...(scoped ? [tenantCompanyId] : []))
      .all();
    users.push(
      ...(rows?.results || []).map((row) => ({
        id: row.id,
        name: row.name,
        email: normalizeEmail(row.email),
        role: normalizeRole(row.role),
        companyId: columns.has('company_id') ? normalizeString(row.company_id, 120) || null : null,
        active: isActiveUser(row),
        createdAt: row.created_at
      }))
    );
  } else if (columns.has('data')) {
    const rows = await env.DB.prepare('SELECT id, data, created_at FROM users ORDER BY datetime(created_at) DESC').all();
    for (const row of rows?.results || []) {
      const parsed = parseLegacyUserRow(row);
      if (parsed) {
        if (scoped && String(parsed.companyId || '') !== String(tenantCompanyId || '')) {
          continue;
        }
        users.push({
          id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          role: parsed.role,
          companyId: parsed.companyId || null,
          active: parsed.active === 1,
          createdAt: parsed.createdAt || row.created_at
        });
      }
    }
  }

  const profilesQuery = profilesColumns.has('company_id')
    ? (scoped
      ? 'SELECT user_id, company_id, region_id, quota FROM user_profiles WHERE company_id = ?'
      : 'SELECT user_id, company_id, region_id, quota FROM user_profiles')
    : 'SELECT user_id, region_id, quota FROM user_profiles';
  const profilesRows = await env.DB.prepare(profilesQuery)
    .bind(...(scoped ? [tenantCompanyId] : []))
    .all();
  const profileMap = new Map((profilesRows?.results || []).map((row) => [String(row.user_id), row]));

  const regions = await listModuleRecords(env, MODULES.REGIONS);
  const regionMap = new Map(regions.map((region) => [String(region.id), region]));

  const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
  const activities = await listModuleRecords(env, MODULES.ACTIVITIES);

  return users.map((user) => {
    const profile = profileMap.get(String(user.id));
    const region = profile?.region_id ? regionMap.get(String(profile.region_id)) : null;

    return {
      ...user,
      companyId: profile?.company_id || user.companyId || null,
      regionId: profile?.region_id || null,
      region: region
        ? {
            id: region.id,
            name: region.name,
            code: region.code,
            country: region.country,
            city: region.city,
            state: region.state
          }
        : null,
      quota: profile?.quota !== null && profile?.quota !== undefined ? toNumber(profile.quota, 0) : null,
      _count: {
        opportunities: countByField(opportunities, 'ownerId', user.id),
        activities: countByField(activities, 'assignedToId', user.id)
      }
    };
  });
};

const saveUserProfile = async (env, userId, regionId, quota, companyIdOverride = null) => {
  if (!userId) return;

  const hasRegion = regionId !== undefined;
  const hasQuota = quota !== undefined;

  if (!hasRegion && !hasQuota) return;

  const tenantCompanyId =
    normalizeString(companyIdOverride, 120) ||
    getRequestTenantCompanyId(env) ||
    DEFAULT_TENANT_COMPANY_ID;
  const profilesColumns = await getUserProfilesColumns(env);
  const now = nowIso();
  if (profilesColumns.has('company_id')) {
    await env.DB.prepare(
      `INSERT INTO user_profiles (user_id, company_id, region_id, quota, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         company_id = excluded.company_id,
         region_id = excluded.region_id,
         quota = excluded.quota,
         updated_at = excluded.updated_at`
    )
      .bind(
        userId,
        tenantCompanyId,
        regionId !== undefined && regionId !== null && String(regionId).trim() ? String(regionId).trim() : null,
        quota === undefined || quota === null || String(quota).trim() === '' ? null : toNumber(quota, 0),
        now
      )
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO user_profiles (user_id, region_id, quota, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         region_id = excluded.region_id,
         quota = excluded.quota,
         updated_at = excluded.updated_at`
    )
      .bind(
        userId,
        regionId !== undefined && regionId !== null && String(regionId).trim() ? String(regionId).trim() : null,
        quota === undefined || quota === null || String(quota).trim() === '' ? null : toNumber(quota, 0),
        now
      )
      .run();
  }
};

const createSolicitacaoNumber = async (env) => {
  const all = await listModuleRecords(env, MODULES.SOLICITACOES);
  const year = new Date().getFullYear();
  const currentYear = all.filter((item) => String(item?.numero || '').startsWith(`PRE-${year}-`));
  const sequence = String(currentYear.length + 1).padStart(3, '0');
  return `PRE-${year}-${sequence}`;
};

const generateSimplePdf = (title, bodyLines = []) => {
  const safeTitle = String(title || 'Relatório').replace(/[()]/g, '');
  const streamLines = [`BT`, `/F1 12 Tf`, `40 800 Td`, `(${safeTitle}) Tj`];

  let y = 780;
  for (const line of bodyLines.slice(0, 25)) {
    const clean = String(line || '').replace(/[()]/g, '');
    streamLines.push(`40 ${y} Td (${clean}) Tj`);
    y -= 18;
  }

  streamLines.push('ET');
  const stream = `${streamLines.join('\n')}\n`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
};

const toDateOnly = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

const getPeriodDates = (period) => {
  const now = new Date();
  if (!period) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: toDateOnly(start), endDate: toDateOnly(end) };
  }

  const token = String(period).trim();
  if (/^\d{4}-\d{2}$/.test(token)) {
    const [year, month] = token.split('-').map((item) => toInt(item, 0));
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { startDate: toDateOnly(start), endDate: toDateOnly(end) };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toDateOnly(start), endDate: toDateOnly(end) };
};

const computeTargetWithMetrics = (target, opportunities, seller) => {
  const targetValue = toNumber(target.targetValue ?? target.target ?? 0, 0);
  const startDate = target.startDate || getPeriodDates(target.period).startDate;
  const endDate = target.endDate || getPeriodDates(target.period).endDate;

  const startTs = startDate ? new Date(startDate).getTime() : null;
  const endTs = endDate ? new Date(endDate).getTime() : null;

  const wonRows = asArray(opportunities).filter((item) => {
    if (String(item.ownerId || '') !== String(target.sellerId || '')) return false;
    if (item.stage !== 'WON') return false;
    const closeDate = item.actualCloseDate || item.updatedAt || item.createdAt;
    const closeTs = closeDate ? new Date(closeDate).getTime() : null;
    if (!closeTs || Number.isNaN(closeTs)) return false;
    if (startTs && closeTs < startTs) return false;
    if (endTs && closeTs > endTs) return false;
    return true;
  });

  const realized = wonRows.reduce((sum, item) => sum + toNumber(item.value, 0), 0);
  const progress = targetValue > 0 ? clamp((realized / targetValue) * 100, 0, 999) : 0;
  const remaining = Math.max(targetValue - realized, 0);

  let status = 'ON_TRACK';
  if (progress >= 100) status = 'ACHIEVED';
  else if (progress < 40) status = 'BEHIND';
  else if (progress < 70) status = 'AT_RISK';

  return {
    ...target,
    targetValue,
    target: targetValue,
    startDate,
    endDate,
    period: target.period || `${(startDate || nowIso().slice(0, 10)).slice(0, 7)}`,
    realized,
    progress,
    remaining,
    status,
    seller: seller || null
  };
};

const routeGenericModuleCrud = async (request, env, module, id = null) => {
  const method = request.method;

  if (method === 'GET') {
    if (id) {
      const row = await getModuleRecord(env, module, id);
      if (!row) return json({ error: 'Registro não encontrado' }, 404);
      return json(row);
    }
    return json(await listModuleRecords(env, module));
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const created = await upsertModuleRecord(env, module, body, body?.id || null);
    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const targetId = id || body?.id;
    if (!targetId) return badRequest('ID obrigatório');
    const current = await getModuleRecord(env, module, targetId);
    if (!current) return json({ error: 'Registro não encontrado' }, 404);
    const updated = await upsertModuleRecord(env, module, { ...current, ...body }, targetId);
    return json(updated);
  }

  if (method === 'DELETE') {
    let targetId = id;
    if (!targetId) {
      const body = asObject(await parseJsonBody(request));
      targetId = body?.id || '';
    }
    if (!targetId) return badRequest('ID obrigatório');
    await deleteModuleRecord(env, module, targetId);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleUsersRoutes = async (request, env, url, segments) => {
  const method = request.method;
  const isMasterSession = isMasterRequestScope(env);
  const tenantCompanyId = getRequestTenantCompanyId(env) || DEFAULT_TENANT_COMPANY_ID;

  if (method === 'GET') {
    const roleFilter = String(url.searchParams.get('role') || '').trim().toUpperCase();
    const users = await loadUsersForView(env);
    const filtered = roleFilter
      ? users.filter((user) => String(user.role || '').toUpperCase() === roleFilter)
      : users;

    return json(filtered);
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const name = String(body.name || '').trim();
    const email = normalizeEmail(body.email);
    const role = normalizeRole(body.role);
    if (!isMasterSession && role === 'MASTER') {
      return json({ error: 'Apenas MASTER pode criar usuário MASTER' }, 403);
    }
    const companyId = isMasterSession ? (normalizeString(body.companyId, 120) || null) : tenantCompanyId;
    const password = String(body.password || '').trim() || 'admin123';

    if (!name || !email) return badRequest('Nome e email são obrigatórios');

    const existing = await findUserByEmail(env, email);
    if (existing?.id) return json({ error: 'Email já está em uso' }, 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await createUser(env, {
      name,
      email,
      password: hashedPassword,
      role,
      companyId
    });

    await saveUserProfile(env, created.id, body.regionId, body.quota, companyId || created.companyId || null);

    const users = await loadUsersForView(env);
    const hydrated = users.find((item) => item.id === created.id) || created;
    return json(hydrated, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await findUserById(env, id);
    if (!current) return json({ error: 'Usuário não encontrado' }, 404);
    if (!isMasterSession && String(current.companyId || '') !== String(tenantCompanyId || '')) {
      return json({ error: 'Acesso restrito ao escopo da sua empresa' }, 403);
    }

    const nextName = body.name !== undefined ? String(body.name || '').trim() : current.name;
    const nextEmail = body.email !== undefined ? normalizeEmail(body.email) : current.email;
    const nextRole = body.role !== undefined ? normalizeRole(body.role) : current.role;
    if (!isMasterSession && nextRole === 'MASTER') {
      return json({ error: 'Apenas MASTER pode atribuir role MASTER' }, 403);
    }
    const nextCompanyId = body.companyId !== undefined
      ? (isMasterSession ? (normalizeString(body.companyId, 120) || null) : tenantCompanyId)
      : (isMasterSession ? (normalizeString(current.companyId, 120) || null) : tenantCompanyId);
    const nextActive = body.active !== undefined ? (toBool(body.active, true) ? 1 : 0) : current.active;

    if (!nextName || !nextEmail) return badRequest('Nome e email são obrigatórios');

    const byEmail = await findUserByEmail(env, nextEmail);
    if (byEmail?.id && byEmail.id !== id) {
      return json({ error: 'Email já está em uso por outro usuário' }, 400);
    }

    const columns = await getUsersTableColumns(env);

    if (columns.has('email')) {
      const hasCompanyColumn = columns.has('company_id');
      if (body.password) {
        const hashedPassword = await bcrypt.hash(String(body.password), 10);
        if (hasCompanyColumn) {
          await env.DB.prepare(
            'UPDATE users SET name = ?, email = ?, role = ?, company_id = ?, active = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
            .bind(nextName, nextEmail, nextRole, nextRole === 'MASTER' ? null : (nextCompanyId || DEFAULT_TENANT_COMPANY_ID), nextActive, hashedPassword, id)
            .run();
        } else {
          await env.DB.prepare(
            'UPDATE users SET name = ?, email = ?, role = ?, active = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
            .bind(nextName, nextEmail, nextRole, nextActive, hashedPassword, id)
            .run();
        }
      } else if (hasCompanyColumn) {
        await env.DB.prepare(
          'UPDATE users SET name = ?, email = ?, role = ?, company_id = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
          .bind(nextName, nextEmail, nextRole, nextRole === 'MASTER' ? null : (nextCompanyId || DEFAULT_TENANT_COMPANY_ID), nextActive, id)
          .run();
      } else {
        await env.DB.prepare(
          'UPDATE users SET name = ?, email = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
          .bind(nextName, nextEmail, nextRole, nextActive, id)
          .run();
      }
    } else if (columns.has('data')) {
      const raw = {
        ...(current.rawData || {}),
        id,
        name: nextName,
        email: nextEmail,
        role: nextRole,
        companyId: nextRole === 'MASTER' ? null : (nextCompanyId || DEFAULT_TENANT_COMPANY_ID),
        status: nextActive === 1 ? 'Ativo' : 'Inativo'
      };
      if (body.password) {
        raw.password = await bcrypt.hash(String(body.password), 10);
      }
      await persistLegacyUser(env, id, raw);
    }

    await saveUserProfile(
      env,
      id,
      body.regionId,
      body.quota,
      nextRole === 'MASTER' ? null : (nextCompanyId || DEFAULT_TENANT_COMPANY_ID)
    );

    const users = await loadUsersForView(env);
    const hydrated = users.find((item) => item.id === id);
    return json(hydrated || { success: true });
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await findUserById(env, id);
    if (!current) return json({ error: 'Usuário não encontrado' }, 404);
    if (!isMasterSession && String(current.companyId || '') !== String(tenantCompanyId || '')) {
      return json({ error: 'Acesso restrito ao escopo da sua empresa' }, 403);
    }
    if (!isMasterSession && normalizeRole(current.role) === 'MASTER') {
      return json({ error: 'Apenas MASTER pode remover usuário MASTER' }, 403);
    }

    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM user_profiles WHERE user_id = ?').bind(id).run();

    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleRegionsRoutes = async (request, env, url, segments) => {
  const method = request.method;

  if (method === 'GET') {
    const regions = await listModuleRecords(env, MODULES.REGIONS);
    const users = await loadUsersForView(env);
    const companies = await listModuleRecords(env, MODULES.COMPANIES);

    const result = regions.map((region) => ({
      ...region,
      _count: {
        users: users.filter((user) => String(user.regionId || '') === String(region.id)).length,
        companies: companies.filter((company) => String(company.regionId || '') === String(region.id)).length
      }
    }));

    return json(result);
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const name = String(body.name || '').trim();
    if (!name) return badRequest('Nome da região é obrigatório');

    const code = String(body.code || textToSlug(name).slice(0, 8).toUpperCase() || 'REG').trim();
    const created = await upsertModuleRecord(env, MODULES.REGIONS, {
      id: body.id || crypto.randomUUID(),
      name,
      code,
      city: String(body.city || '').trim(),
      state: String(body.state || '').trim(),
      country: String(body.country || 'Brasil').trim()
    });

    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.REGIONS, id);
    if (!current) return json({ error: 'Região não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.REGIONS, {
      ...current,
      ...body,
      id
    }, id);

    return json(updated);
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    await deleteModuleRecord(env, MODULES.REGIONS, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleCompaniesRoutes = async (request, env, url, segments) => {
  const method = request.method;

  if (segments[1] && segments[2] === 'documents' && method === 'POST') {
    const companyId = segments[1];
    const company = await getModuleRecord(env, MODULES.COMPANIES, companyId);
    if (!company) return json({ error: 'Empresa não encontrada' }, 404);

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return badRequest('Arquivo não enviado');

    const blob = await saveBinaryBlob(env, BLOB_MODULES.COMPANY_DOCUMENT, companyId, file);
    return json({
      id: blob.id,
      originalName: blob.originalName,
      mimeType: blob.mimeType,
      size: blob.size,
      createdAt: blob.createdAt
    }, 201);
  }

  if (segments[1] === 'document' && segments[3] === 'download' && method === 'GET') {
    const documentId = segments[2];
    const doc = await getBinaryBlob(env, documentId);
    if (!doc || doc.module !== BLOB_MODULES.COMPANY_DOCUMENT) {
      return json({ error: 'Documento não encontrado' }, 404);
    }

    const bytes = base64ToUint8(doc.dataBase64 || '');
    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': doc.mimeType || 'application/octet-stream',
        'content-disposition': `attachment; filename="${encodeURIComponent(doc.originalName || 'documento')}"`
      }
    });
  }

  if (segments[1] === 'document' && segments[2] && method === 'DELETE') {
    const documentId = segments[2];
    const doc = await getBinaryBlob(env, documentId);
    if (!doc || doc.module !== BLOB_MODULES.COMPANY_DOCUMENT) {
      return json({ error: 'Documento não encontrado' }, 404);
    }
    await deleteBinaryBlob(env, documentId);
    return json({ success: true });
  }

  const companies = await listModuleRecords(env, MODULES.COMPANIES);

  if (method === 'GET') {
    const requestedId = String(url.searchParams.get('id') || segments[1] || '').trim();

    const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
    const contracts = await listModuleRecords(env, MODULES.CONTRACTS);
    const activities = await listModuleRecords(env, MODULES.ACTIVITIES);

    if (requestedId) {
      const company = companies.find((item) => String(item.id) === requestedId);
      if (!company) return json({ error: 'Empresa não encontrada' }, 404);

      const docs = await listBinaryBlobs(env, BLOB_MODULES.COMPANY_DOCUMENT, requestedId);

      return json({
        ...company,
        contacts: asArray(company.contacts),
        opportunities: opportunities.filter((item) => String(item.companyId || '') === requestedId),
        contracts: contracts.filter((item) => String(item.companyId || '') === requestedId),
        activities: activities.filter((item) => String(item.companyId || '') === requestedId),
        documents: docs.map((doc) => ({
          id: doc.id,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          createdAt: doc.createdAt
        })),
        _count: {
          opportunities: opportunities.filter((item) => String(item.companyId || '') === requestedId).length
        }
      });
    }

    const hydrated = companies.map((company) => ({
      ...company,
      contacts: asArray(company.contacts),
      _count: {
        opportunities: opportunities.filter((item) => String(item.companyId || '') === String(company.id)).length
      }
    }));

    return json(hydrated);
  }

  if (method === 'POST') {
    const body = sanitizeCompanyPayload(await parseJsonBody(request));
    if (!body.name) return badRequest('Nome da empresa é obrigatório');

    const created = await upsertModuleRecord(env, MODULES.COMPANIES, {
      ...body,
      id: body.id || crypto.randomUUID(),
      leadScore: clamp(toNumber(body.leadScore, 0), 0, 100),
      churnRisk: clamp(toNumber(body.churnRisk, 0), 0, 100)
    });

    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = sanitizeCompanyPayload(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.COMPANIES, id);
    if (!current) return json({ error: 'Empresa não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.COMPANIES, {
      ...current,
      ...body,
      id,
      contacts: body.contacts.length > 0 ? body.contacts : asArray(current.contacts)
    }, id);

    return json(updated);
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(url.searchParams.get('id') || body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    await deleteModuleRecord(env, MODULES.COMPANIES, id);

    const opportunities = await listModuleByField(env, MODULES.OPPORTUNITIES, 'companyId', id);
    const contracts = await listModuleByField(env, MODULES.CONTRACTS, 'companyId', id);
    const activities = await listModuleByField(env, MODULES.ACTIVITIES, 'companyId', id);

    for (const record of [...opportunities, ...contracts, ...activities]) {
      const module = opportunities.some((o) => o.id === record.id)
        ? MODULES.OPPORTUNITIES
        : contracts.some((c) => c.id === record.id)
          ? MODULES.CONTRACTS
          : MODULES.ACTIVITIES;
      await deleteModuleRecord(env, module, record.id);
    }

    const docs = await listBinaryBlobs(env, BLOB_MODULES.COMPANY_DOCUMENT, id);
    for (const doc of docs) {
      await deleteBinaryBlob(env, doc.id);
    }

    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleClientsRoutes = async (request, env) => {
  if (request.method === 'GET') {
    const companies = await listModuleRecords(env, MODULES.COMPANIES);
    return json(companies.map((company) => ({
      id: company.id,
      name: company.name,
      contact: company.contacts?.[0]?.name || '',
      status: company.status || 'Ativo'
    })));
  }

  if (request.method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const name = String(body.name || '').trim();
    if (!name) return badRequest('Nome obrigatório');

    const created = await upsertModuleRecord(env, MODULES.COMPANIES, {
      id: crypto.randomUUID(),
      name,
      status: String(body.status || 'LEAD').toUpperCase(),
      contacts: body.contact
        ? [{ id: crypto.randomUUID(), name: String(body.contact), email: '', phone: '', position: '', isPrimary: true }]
        : [],
      leadScore: 0,
      churnRisk: 0
    });

    return json(created, 201);
  }

  return methodNotAllowed();
};

const handleOpportunitiesRoutes = async (request, env, url, segments, currentUser) => {
  const method = request.method;
  const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
  const companies = await listModuleRecords(env, MODULES.COMPANIES);
  const users = await loadUsersForView(env);
  const companiesMap = new Map(companies.map((company) => [String(company.id), company]));
  const usersMap = new Map(users.map((user) => [String(user.id), user]));

  if (method === 'GET') {
    const id = String(segments[1] || url.searchParams.get('id') || '').trim();
    if (id) {
      const found = opportunities.find((item) => String(item.id) === id);
      if (!found) return json({ error: 'Oportunidade não encontrada' }, 404);
      return json(hydrateOpportunity(found, companiesMap, usersMap));
    }

    const rows = opportunities
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
      .map((item) => hydrateOpportunity(item, companiesMap, usersMap));

    return json(rows);
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const title = String(body.title || body.projectName || '').trim();
    if (!title) return badRequest('Título é obrigatório');

    const companyId = String(body.companyId || '').trim();
    const ownerId = String(body.ownerId || currentUser?.id || '').trim();

    const created = await upsertModuleRecord(env, MODULES.OPPORTUNITIES, {
      id: crypto.randomUUID(),
      title,
      projectName: String(body.projectName || title).trim(),
      projectClientType: String(body.projectClientType || 'NEW_CLIENT').trim(),
      description: String(body.description || '').trim(),
      value: toNumber(body.value, 0),
      probability: clamp(toInt(body.probability, 50), 0, 100),
      stage: String(body.stage || 'LEAD').toUpperCase(),
      b2gStage: body.b2gStage ? String(body.b2gStage).toUpperCase() : null,
      source: String(body.source || 'MANUAL').trim(),
      expectedCloseDate: body.expectedCloseDate || null,
      actualCloseDate: body.actualCloseDate || null,
      lossReason: String(body.lossReason || '').trim(),
      companyId,
      ownerId
    });

    return json(hydrateOpportunity(created, companiesMap, usersMap), 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(segments[1] || body.id || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.OPPORTUNITIES, id);
    if (!current) return json({ error: 'Oportunidade não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.OPPORTUNITIES, {
      ...current,
      ...body,
      id,
      value: body.value !== undefined ? toNumber(body.value, toNumber(current.value, 0)) : toNumber(current.value, 0),
      probability:
        body.probability !== undefined
          ? clamp(toInt(body.probability, toInt(current.probability, 50)), 0, 100)
          : clamp(toInt(current.probability, 50), 0, 100),
      stage: body.stage ? String(body.stage).toUpperCase() : String(current.stage || 'LEAD').toUpperCase(),
      b2gStage: body.b2gStage !== undefined ? (body.b2gStage ? String(body.b2gStage).toUpperCase() : null) : (current.b2gStage || null)
    }, id);

    return json(hydrateOpportunity(updated, companiesMap, usersMap));
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(segments[1] || body.id || '').trim();
    if (!id) return badRequest('ID obrigatório');

    await deleteModuleRecord(env, MODULES.OPPORTUNITIES, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleActivitiesRoutes = async (request, env, url, segments, currentUser) => {
  const method = request.method;
  const activities = await listModuleRecords(env, MODULES.ACTIVITIES);
  const companies = await listModuleRecords(env, MODULES.COMPANIES);
  const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
  const users = await loadUsersForView(env);

  const companyMap = new Map(companies.map((item) => [String(item.id), item]));
  const opportunityMap = new Map(opportunities.map((item) => [String(item.id), item]));
  const userMap = new Map(users.map((item) => [String(item.id), item]));

  const hydrateActivity = (activity) => ({
    ...activity,
    company: activity.companyId ? companyMap.get(String(activity.companyId)) || null : null,
    opportunity: activity.opportunityId ? opportunityMap.get(String(activity.opportunityId)) || null : null,
    assignedTo: activity.assignedToId ? userMap.get(String(activity.assignedToId)) || null : null
  });

  if (method === 'GET') {
    const id = String(segments[1] || url.searchParams.get('id') || '').trim();
    let rows = [...activities];

    if (id) {
      const row = rows.find((item) => String(item.id) === id);
      if (!row) return json({ error: 'Atividade não encontrada' }, 404);
      return json(hydrateActivity(row));
    }

    const status = String(url.searchParams.get('status') || '').trim().toUpperCase();
    const type = String(url.searchParams.get('type') || '').trim().toUpperCase();
    const priority = String(url.searchParams.get('priority') || '').trim().toUpperCase();

    if (status) rows = rows.filter((item) => String(item.status || '').toUpperCase() === status);
    if (type) rows = rows.filter((item) => String(item.type || '').toUpperCase() === type);
    if (priority) rows = rows.filter((item) => String(item.priority || '').toUpperCase() === priority);

    rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return json(rows.map(hydrateActivity));
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const subject = String(body.subject || '').trim();
    if (!subject) return badRequest('Assunto é obrigatório');

    const created = await upsertModuleRecord(env, MODULES.ACTIVITIES, {
      id: crypto.randomUUID(),
      type: String(body.type || 'TASK').toUpperCase(),
      subject,
      description: String(body.description || '').trim(),
      status: String(body.status || 'PENDING').toUpperCase(),
      priority: String(body.priority || 'MEDIUM').toUpperCase(),
      dueDate: body.dueDate || null,
      completedAt: body.completedAt || null,
      companyId: body.companyId || null,
      opportunityId: body.opportunityId || null,
      assignedToId: body.assignedToId || currentUser?.id || null
    });

    return json(hydrateActivity(created), 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(segments[1] || body.id || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.ACTIVITIES, id);
    if (!current) return json({ error: 'Atividade não encontrada' }, 404);

    const nextStatus = body.status ? String(body.status).toUpperCase() : String(current.status || 'PENDING').toUpperCase();
    const updated = await upsertModuleRecord(env, MODULES.ACTIVITIES, {
      ...current,
      ...body,
      id,
      status: nextStatus,
      completedAt:
        nextStatus === 'COMPLETED'
          ? (body.completedAt || current.completedAt || nowIso())
          : (body.completedAt !== undefined ? body.completedAt : current.completedAt)
    }, id);

    return json(hydrateActivity(updated));
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(segments[1] || body.id || '').trim();
    if (!id) return badRequest('ID obrigatório');

    await deleteModuleRecord(env, MODULES.ACTIVITIES, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleProductsRoutes = async (request, env, url, segments) => {
  const method = request.method;

  if (method === 'GET') {
    return json(await listModuleRecords(env, MODULES.PRODUCTS));
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const name = String(body.name || '').trim();
    if (!name) return badRequest('Nome do produto é obrigatório');

    const created = await upsertModuleRecord(env, MODULES.PRODUCTS, {
      id: crypto.randomUUID(),
      name,
      description: String(body.description || '').trim(),
      category: String(body.category || '').trim(),
      price: toNumber(body.price, 0),
      margin: toNumber(body.margin, 0),
      active: toBool(body.active, true)
    });

    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.PRODUCTS, id);
    if (!current) return json({ error: 'Produto não encontrado' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.PRODUCTS, {
      ...current,
      ...body,
      id,
      price: body.price !== undefined ? toNumber(body.price, toNumber(current.price, 0)) : toNumber(current.price, 0),
      margin: body.margin !== undefined ? toNumber(body.margin, toNumber(current.margin, 0)) : toNumber(current.margin, 0),
      active: body.active !== undefined ? toBool(body.active, toBool(current.active, true)) : toBool(current.active, true)
    }, id);

    return json(updated);
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');
    await deleteModuleRecord(env, MODULES.PRODUCTS, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const normalizeProposalItems = (items) =>
  asArray(items).map((item) => {
    const quantity = toNumber(item?.quantity, 1);
    const unitPrice = toNumber(item?.unitPrice, 0);
    const discount = toNumber(item?.discount, 0);
    const totalPrice = item?.totalPrice !== undefined
      ? toNumber(item.totalPrice, 0)
      : quantity * unitPrice * (1 - discount / 100);

    return {
      id: String(item?.id || crypto.randomUUID()),
      productId: item?.productId || null,
      quantity,
      unitPrice,
      discount,
      totalPrice
    };
  });

const computeProposalTotals = (items, discount, tax) => {
  const subtotal = asArray(items).reduce((sum, item) => sum + toNumber(item.totalPrice, 0), 0);
  const discountPct = clamp(toNumber(discount, 0), 0, 100);
  const taxPct = clamp(toNumber(tax, 0), -100, 500);
  const afterDiscount = subtotal * (1 - discountPct / 100);
  const totalValue = afterDiscount * (1 + taxPct / 100);
  return { subtotal, totalValue };
};

const handleProposalTemplatesRoutes = async (request, env, url, segments) => {
  const method = request.method;
  const templates = await listModuleRecords(env, MODULES.PROPOSAL_TEMPLATES);

  if (method === 'GET') {
    return json(templates.map((template) => ({
      ...template,
      isDefault: toBool(template.isDefault, false),
      isActive: template.isActive === undefined ? true : toBool(template.isActive, true)
    })));
  }

  if (method === 'POST' && segments.length === 1) {
    const body = asObject(await parseJsonBody(request));
    const name = String(body.name || '').trim();
    if (!name) return badRequest('Nome do template é obrigatório');

    const created = await upsertModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, {
      id: crypto.randomUUID(),
      ...body,
      name,
      type: String(body.type || 'COMMERCIAL').toUpperCase(),
      isActive: body.isActive === undefined ? true : toBool(body.isActive, true),
      isDefault: toBool(body.isDefault, false)
    });

    return json(created, 201);
  }

  if (segments[1] && segments[2] === 'duplicate' && method === 'POST') {
    const source = await getModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, segments[1]);
    if (!source) return json({ error: 'Template não encontrado' }, 404);

    const body = asObject(await parseJsonBody(request));
    const duplicate = await upsertModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, {
      ...source,
      id: crypto.randomUUID(),
      name: String(body.name || `${source.name} (Cópia)`),
      isDefault: false
    });

    return json(duplicate, 201);
  }

  if (segments[1] && segments[2] === 'set-default' && method === 'POST') {
    const target = await getModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, segments[1]);
    if (!target) return json({ error: 'Template não encontrado' }, 404);

    for (const template of templates) {
      const sameType = String(template.type || 'COMMERCIAL') === String(target.type || 'COMMERCIAL');
      if (!sameType) continue;
      await upsertModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, {
        ...template,
        isDefault: template.id === target.id
      }, template.id);
    }

    return json({ success: true });
  }

  if ((method === 'PUT' || method === 'PATCH') && segments[1]) {
    const body = asObject(await parseJsonBody(request));
    const id = segments[1];
    const current = await getModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, id);
    if (!current) return json({ error: 'Template não encontrado' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, {
      ...current,
      ...body,
      id,
      isActive: body.isActive !== undefined ? toBool(body.isActive, toBool(current.isActive, true)) : toBool(current.isActive, true),
      isDefault: body.isDefault !== undefined ? toBool(body.isDefault, toBool(current.isDefault, false)) : toBool(current.isDefault, false)
    }, id);

    return json(updated);
  }

  if (method === 'DELETE' && segments[1]) {
    await deleteModuleRecord(env, MODULES.PROPOSAL_TEMPLATES, segments[1]);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleProposalsRoutes = async (request, env, url, segments) => {
  const method = request.method;
  const proposals = await listModuleRecords(env, MODULES.PROPOSALS);
  const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
  const templates = await listModuleRecords(env, MODULES.PROPOSAL_TEMPLATES);

  const opportunitiesMap = new Map(opportunities.map((item) => [String(item.id), item]));
  const templatesMap = new Map(templates.map((item) => [String(item.id), item]));

  const hydrateProposal = (proposal) => ({
    ...proposal,
    opportunity: proposal.opportunityId ? opportunitiesMap.get(String(proposal.opportunityId)) || null : null,
    template: proposal.templateId ? templatesMap.get(String(proposal.templateId)) || null : null,
    items: asArray(proposal.items)
  });

  if (method === 'GET') {
    const id = String(segments[1] || '').trim();
    if (id) {
      const row = await getModuleRecord(env, MODULES.PROPOSALS, id);
      if (!row) return json({ error: 'Proposta não encontrada' }, 404);
      return json(hydrateProposal(row));
    }

    return json(proposals.map(hydrateProposal));
  }

  if (method === 'POST' && segments.length === 1) {
    const body = asObject(await parseJsonBody(request));
    const title = String(body.title || '').trim();
    if (!title || !body.opportunityId) return badRequest('Título e oportunidade são obrigatórios');

    const items = normalizeProposalItems(body.items);
    const totals = computeProposalTotals(items, body.discount, body.tax);

    const created = await upsertModuleRecord(env, MODULES.PROPOSALS, {
      id: crypto.randomUUID(),
      type: String(body.type || 'COMMERCIAL').toUpperCase(),
      number: String(body.number || `PROP-${Date.now().toString().slice(-8)}`),
      title,
      description: String(body.description || '').trim(),
      version: toInt(body.version, 1),
      status: String(body.status || 'DRAFT').toUpperCase(),
      subtotal: totals.subtotal,
      totalValue: body.totalValue !== undefined ? toNumber(body.totalValue, totals.totalValue) : totals.totalValue,
      discount: toNumber(body.discount, 0),
      tax: toNumber(body.tax, 0),
      validUntil: body.validUntil || null,
      templateId: body.templateId || null,
      opportunityId: body.opportunityId,
      sectionsData: asObject(body.sectionsData),
      items
    });

    return json(hydrateProposal(created), 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && segments[1]) {
    const id = segments[1];
    const body = asObject(await parseJsonBody(request));
    const current = await getModuleRecord(env, MODULES.PROPOSALS, id);
    if (!current) return json({ error: 'Proposta não encontrada' }, 404);

    const items = body.items !== undefined ? normalizeProposalItems(body.items) : asArray(current.items);
    const discount = body.discount !== undefined ? toNumber(body.discount, toNumber(current.discount, 0)) : toNumber(current.discount, 0);
    const tax = body.tax !== undefined ? toNumber(body.tax, toNumber(current.tax, 0)) : toNumber(current.tax, 0);
    const totals = computeProposalTotals(items, discount, tax);

    const updated = await upsertModuleRecord(env, MODULES.PROPOSALS, {
      ...current,
      ...body,
      id,
      items,
      discount,
      tax,
      subtotal: totals.subtotal,
      totalValue: body.totalValue !== undefined ? toNumber(body.totalValue, totals.totalValue) : totals.totalValue,
      status: body.status ? String(body.status).toUpperCase() : String(current.status || 'DRAFT').toUpperCase()
    }, id);

    return json(hydrateProposal(updated));
  }

  if (segments[1] && segments[2] === 'send' && method === 'POST') {
    const id = segments[1];
    const current = await getModuleRecord(env, MODULES.PROPOSALS, id);
    if (!current) return json({ error: 'Proposta não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.PROPOSALS, {
      ...current,
      status: 'SENT',
      sentAt: nowIso()
    }, id);

    return json({ success: true, proposal: hydrateProposal(updated) });
  }

  if (method === 'DELETE') {
    const id = String(segments[1] || asObject(await parseJsonBody(request)).id || '').trim();
    if (!id) return badRequest('ID obrigatório');
    await deleteModuleRecord(env, MODULES.PROPOSALS, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const normalizeContractPayload = (body) => {
  const payload = asObject(body);
  return {
    id: payload.id,
    number: String(payload.number || `CTR-${Date.now().toString().slice(-8)}`),
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    status: String(payload.status || 'AWAITING_SIGNATURE').toUpperCase(),
    value: toNumber(payload.value, 0),
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    companyId: payload.companyId || null,
    opportunityId: payload.opportunityId || null,
    autoRenewal: toBool(payload.autoRenewal, false),
    renewalPeriod: payload.renewalPeriod ? toInt(payload.renewalPeriod, 0) : null,
    renewalNotice: payload.renewalNotice ? toInt(payload.renewalNotice, 0) : null,
    slaResponseTime: payload.slaResponseTime ? toInt(payload.slaResponseTime, 0) : null,
    slaResolutionTime: payload.slaResolutionTime ? toInt(payload.slaResolutionTime, 0) : null,
    slaAvailability: payload.slaAvailability ? toNumber(payload.slaAvailability, 0) : null,
    slaDescription: String(payload.slaDescription || '').trim(),
    terms: String(payload.terms || '').trim(),
    slaTerms: String(payload.slaTerms || '').trim(),
    renewalDate: payload.renewalDate || null
  };
};

const handleContractsRoutes = async (request, env, url, segments) => {
  const method = request.method;

  if (segments[1] === 'reports' && segments[2] === 'summary' && method === 'GET') {
    const contracts = await listModuleRecords(env, MODULES.CONTRACTS);
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter((item) => item.status === 'ACTIVE').length;
    const totalValue = contracts.reduce((sum, item) => sum + toNumber(item.value, 0), 0);

    return json({
      totalContracts,
      activeContracts,
      totalValue
    });
  }

  if (segments[1] === 'process-renewals' && method === 'POST') {
    const contracts = await listModuleRecords(env, MODULES.CONTRACTS);
    let updatedCount = 0;
    const now = new Date();

    for (const contract of contracts) {
      if (String(contract.status || '').toUpperCase() !== 'ACTIVE') continue;
      if (!contract.endDate) continue;
      const daysToEnd = Math.ceil((new Date(contract.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToEnd > 0 && daysToEnd <= 30) {
        await upsertModuleRecord(env, MODULES.CONTRACTS, {
          ...contract,
          status: 'RENEWAL_PENDING'
        }, contract.id);
        updatedCount += 1;
      }
    }

    return json({
      success: true,
      message: `Renovações processadas: ${updatedCount} contrato(s) atualizado(s).`,
      updatedCount
    });
  }

  if (segments[1] === 'attachment' && segments[3] === 'download' && method === 'GET') {
    const attachmentId = segments[2];
    const file = await getBinaryBlob(env, attachmentId);
    if (!file || file.module !== BLOB_MODULES.CONTRACT_ATTACHMENT) {
      return json({ error: 'Anexo não encontrado' }, 404);
    }

    const bytes = base64ToUint8(file.dataBase64 || '');
    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': file.mimeType || 'application/octet-stream',
        'content-disposition': `attachment; filename="${encodeURIComponent(file.originalName || 'anexo')}"`
      }
    });
  }

  if (segments[1] === 'attachment' && segments[2] && method === 'DELETE') {
    const attachmentId = segments[2];
    const file = await getBinaryBlob(env, attachmentId);
    if (!file || file.module !== BLOB_MODULES.CONTRACT_ATTACHMENT) {
      return json({ error: 'Anexo não encontrado' }, 404);
    }
    await deleteBinaryBlob(env, attachmentId);
    return json({ success: true });
  }

  if (segments[1] && segments[2] === 'upload' && method === 'POST') {
    const contractId = segments[1];
    const contract = await getModuleRecord(env, MODULES.CONTRACTS, contractId);
    if (!contract) return json({ error: 'Contrato não encontrado' }, 404);

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return badRequest('Arquivo não enviado');

    const saved = await saveBinaryBlob(env, BLOB_MODULES.CONTRACT_ATTACHMENT, contractId, file);
    return json({
      id: saved.id,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      size: saved.size,
      createdAt: saved.createdAt
    }, 201);
  }

  const contracts = await listModuleRecords(env, MODULES.CONTRACTS);
  const companies = await listModuleRecords(env, MODULES.COMPANIES);
  const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);

  const companyMap = new Map(companies.map((item) => [String(item.id), item]));
  const opportunityMap = new Map(opportunities.map((item) => [String(item.id), item]));

  const hydrateContract = async (contract) => {
    const attachments = await listBinaryBlobs(env, BLOB_MODULES.CONTRACT_ATTACHMENT, contract.id);
    return {
      ...contract,
      company: contract.companyId ? companyMap.get(String(contract.companyId)) || null : null,
      opportunity: contract.opportunityId ? opportunityMap.get(String(contract.opportunityId)) || null : null,
      attachments: attachments.map((item) => ({
        id: item.id,
        originalName: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
        createdAt: item.createdAt
      }))
    };
  };

  if (method === 'GET') {
    const id = String(segments[1] || '').trim();

    if (id) {
      const contract = contracts.find((item) => String(item.id) === id);
      if (!contract) return json({ error: 'Contrato não encontrado' }, 404);
      return json(await hydrateContract(contract));
    }

    const rows = [];
    for (const contract of contracts) {
      rows.push(await hydrateContract(contract));
    }

    return json(rows);
  }

  if (method === 'POST' && segments.length === 1) {
    const body = normalizeContractPayload(await parseJsonBody(request));
    if (!body.title) return badRequest('Título do contrato é obrigatório');

    const created = await upsertModuleRecord(env, MODULES.CONTRACTS, {
      ...body,
      id: body.id || crypto.randomUUID()
    });

    return json(await hydrateContract(created), 201);
  }

  if ((method === 'PUT' || method === 'PATCH') && segments[1]) {
    const id = segments[1];
    const current = await getModuleRecord(env, MODULES.CONTRACTS, id);
    if (!current) return json({ error: 'Contrato não encontrado' }, 404);

    const patch = normalizeContractPayload(await parseJsonBody(request));
    const updated = await upsertModuleRecord(env, MODULES.CONTRACTS, {
      ...current,
      ...patch,
      id
    }, id);

    return json(await hydrateContract(updated));
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(segments[1] || body.id || '').trim();
    if (!id) return badRequest('ID obrigatório');

    await deleteModuleRecord(env, MODULES.CONTRACTS, id);

    const attachments = await listBinaryBlobs(env, BLOB_MODULES.CONTRACT_ATTACHMENT, id);
    for (const item of attachments) {
      await deleteBinaryBlob(env, item.id);
    }

    return json({ success: true });
  }

  return methodNotAllowed();
};

const hydratePostSalesData = async (env, onboardings, tickets, nps, alerts) => {
  const companies = await listModuleRecords(env, MODULES.COMPANIES);
  const contracts = await listModuleRecords(env, MODULES.CONTRACTS);
  const users = await loadUsersForView(env);

  const companyMap = new Map(companies.map((company) => [String(company.id), company]));
  const contractMap = new Map(contracts.map((contract) => [String(contract.id), contract]));
  const userMap = new Map(users.map((user) => [String(user.id), user]));

  const hydratedOnboarding = onboardings.map((row) => ({
    ...row,
    company: row.companyId ? companyMap.get(String(row.companyId)) || null : null,
    contract: row.contractId ? contractMap.get(String(row.contractId)) || null : null,
    assignedTo: row.assignedToId ? userMap.get(String(row.assignedToId)) || null : null,
    steps: asArray(row.steps)
  }));

  const hydratedTickets = tickets.map((row) => ({
    ...row,
    company: row.companyId ? companyMap.get(String(row.companyId)) || null : null,
    assignedTo: row.assignedToId ? userMap.get(String(row.assignedToId)) || null : null
  }));

  const hydratedNps = nps.map((row) => ({
    ...row,
    company: row.companyId ? companyMap.get(String(row.companyId)) || null : null
  }));

  const hydratedAlerts = alerts.map((row) => ({
    ...row,
    company: row.companyId ? companyMap.get(String(row.companyId)) || null : null
  }));

  return {
    onboardings: hydratedOnboarding,
    tickets: hydratedTickets,
    surveys: hydratedNps,
    alerts: hydratedAlerts
  };
};

const handlePostSalesRoutes = async (request, env, url, segments, currentUser) => {
  const method = request.method;
  const feature = segments[1] || '';

  const onboardings = await listModuleRecords(env, MODULES.POST_SALES_ONBOARDING);
  const tickets = await listModuleRecords(env, MODULES.POST_SALES_SUPPORT);
  const surveys = await listModuleRecords(env, MODULES.POST_SALES_NPS);
  const alerts = await listModuleRecords(env, MODULES.POST_SALES_CHURN_ALERTS);

  const hydrated = await hydratePostSalesData(env, onboardings, tickets, surveys, alerts);

  if (feature === 'onboarding') {
    if (method === 'GET') return json({ onboardings: hydrated.onboardings });

    if (method === 'POST') {
      const body = asObject(await parseJsonBody(request));
      if (!body.companyId) return badRequest('companyId é obrigatório');

      const created = await upsertModuleRecord(env, MODULES.POST_SALES_ONBOARDING, {
        id: crypto.randomUUID(),
        companyId: body.companyId,
        contractId: body.contractId || null,
        assignedToId: body.assignedToId || currentUser?.id || null,
        expectedEndDate: body.expectedEndDate || null,
        description: String(body.description || '').trim(),
        status: String(body.status || 'PENDING').toUpperCase(),
        steps: asArray(body.steps).map((step, index) => ({
          id: String(step?.id || crypto.randomUUID()),
          title: String(step?.title || `Etapa ${index + 1}`),
          description: String(step?.description || ''),
          order: toInt(step?.order, index + 1),
          status: String(step?.status || 'PENDING').toUpperCase()
        }))
      });

      return json(created, 201);
    }

    return methodNotAllowed();
  }

  if (feature === 'support') {
    if (method === 'GET') return json({ tickets: hydrated.tickets });

    if (method === 'POST') {
      const body = asObject(await parseJsonBody(request));
      const number = body.number || `SUP-${Date.now().toString().slice(-8)}`;
      const created = await upsertModuleRecord(env, MODULES.POST_SALES_SUPPORT, {
        id: crypto.randomUUID(),
        number,
        subject: String(body.subject || 'Ticket de suporte').trim(),
        description: String(body.description || '').trim(),
        priority: String(body.priority || 'MEDIUM').toUpperCase(),
        status: String(body.status || 'OPEN').toUpperCase(),
        companyId: body.companyId || null,
        assignedToId: body.assignedToId || currentUser?.id || null,
        category: String(body.category || '').trim()
      });

      return json(created, 201);
    }

    return methodNotAllowed();
  }

  if (feature === 'nps') {
    if (method === 'GET') return json({ surveys: hydrated.surveys });

    if (method === 'POST') {
      const body = asObject(await parseJsonBody(request));
      const created = await upsertModuleRecord(env, MODULES.POST_SALES_NPS, {
        id: crypto.randomUUID(),
        companyId: body.companyId || null,
        score: clamp(toInt(body.score, 0), 0, 10),
        feedback: String(body.feedback || '').trim(),
        status: String(body.status || 'RESPONDED').toUpperCase()
      });
      return json(created, 201);
    }

    return methodNotAllowed();
  }

  if (feature === 'churn-alerts') {
    if (segments[2] === 'detect' && method === 'POST') {
      const companies = await listModuleRecords(env, MODULES.COMPANIES);
      const activities = await listModuleRecords(env, MODULES.ACTIVITIES);

      let created = 0;
      for (const company of companies.slice(0, 20)) {
        const companyActivities = activities.filter((activity) => String(activity.companyId || '') === String(company.id));
        const daysSinceLastActivity = (() => {
          if (!companyActivities.length) return 999;
          const latest = companyActivities
            .map((activity) => new Date(activity.updatedAt || activity.createdAt || 0).getTime())
            .filter((time) => Number.isFinite(time))
            .sort((a, b) => b - a)[0];
          if (!latest) return 999;
          return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
        })();

        const existing = alerts.find((alert) => String(alert.companyId || '') === String(company.id));
        const score = clamp(100 - Math.min(daysSinceLastActivity, 100), 0, 100);
        const riskLevel =
          daysSinceLastActivity > 45
            ? 'CRITICAL'
            : daysSinceLastActivity > 25
              ? 'HIGH'
              : daysSinceLastActivity > 10
                ? 'MEDIUM'
                : 'LOW';

        const payload = {
          ...(existing || {}),
          id: existing?.id || crypto.randomUUID(),
          companyId: company.id,
          riskLevel,
          reasons: [
            daysSinceLastActivity > 15 ? `Sem atividade há ${daysSinceLastActivity} dias` : 'Baixa atividade recente'
          ],
          score,
          status: riskLevel === 'LOW' ? 'MONITORING' : 'ACTIVE'
        };

        await upsertModuleRecord(env, MODULES.POST_SALES_CHURN_ALERTS, payload, payload.id);
        if (!existing) created += 1;
      }

      const refreshed = await listModuleRecords(env, MODULES.POST_SALES_CHURN_ALERTS);
      return json({
        success: true,
        message: `Detecção de churn concluída. ${created} alerta(s) novo(s).`,
        created,
        alerts: refreshed
      });
    }

    if (method === 'GET') return json({ alerts: hydrated.alerts });

    if (method === 'POST') {
      const body = asObject(await parseJsonBody(request));
      const created = await upsertModuleRecord(env, MODULES.POST_SALES_CHURN_ALERTS, {
        id: crypto.randomUUID(),
        companyId: body.companyId,
        riskLevel: String(body.riskLevel || 'MEDIUM').toUpperCase(),
        reasons: asArray(body.reasons),
        score: toNumber(body.score, 50),
        status: String(body.status || 'ACTIVE').toUpperCase()
      });
      return json(created, 201);
    }

    return methodNotAllowed();
  }

  return notFound();
};

const handleLeadScoringRoutes = async (request, env, url) => {
  if (request.method === 'GET') {
    const action = String(url.searchParams.get('action') || '').trim().toLowerCase();
    const companies = await listModuleRecords(env, MODULES.COMPANIES);

    if (action === 'stats') {
      return json({
        hotLeads: companies.filter((company) => toNumber(company.leadScore, 0) >= 80).length,
        warmLeads: companies.filter((company) => toNumber(company.leadScore, 0) >= 60 && toNumber(company.leadScore, 0) < 80).length,
        coldLeads: companies.filter((company) => toNumber(company.leadScore, 0) >= 40 && toNumber(company.leadScore, 0) < 60).length,
        lowPriority: companies.filter((company) => toNumber(company.leadScore, 0) < 40).length
      });
    }

    if (action === 'range') {
      const minScore = clamp(toNumber(url.searchParams.get('minScore'), 0), 0, 100);
      const maxScore = clamp(toNumber(url.searchParams.get('maxScore'), 100), 0, 100);
      const rows = companies
        .filter((company) => {
          const score = toNumber(company.leadScore, 0);
          return score >= minScore && score <= maxScore;
        })
        .sort((a, b) => toNumber(b.leadScore, 0) - toNumber(a.leadScore, 0));
      return json(rows);
    }

    return json(companies);
  }

  if (request.method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'recalculate-all') {
      const companies = await listModuleRecords(env, MODULES.COMPANIES);
      const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
      const activities = await listModuleRecords(env, MODULES.ACTIVITIES);

      let successful = 0;
      let failed = 0;

      for (const company of companies) {
        try {
          const companyOpportunities = opportunities.filter((item) => String(item.companyId || '') === String(company.id));
          const companyActivities = activities.filter((item) => String(item.companyId || '') === String(company.id));

          const base = company.status === 'ACTIVE' ? 45 : company.status === 'PROSPECT' ? 35 : 25;
          const pipelinePoints = companyOpportunities.length * 8;
          const activityPoints = companyActivities.length * 3;
          const wonBonus = companyOpportunities.filter((item) => item.stage === 'WON').length * 10;

          const score = clamp(Math.round(base + pipelinePoints + activityPoints + wonBonus), 0, 100);

          await upsertModuleRecord(env, MODULES.COMPANIES, {
            ...company,
            leadScore: score
          }, company.id);

          successful += 1;
        } catch {
          failed += 1;
        }
      }

      return json({
        success: true,
        message: 'Lead scores recalculados com sucesso.',
        summary: {
          total: companies.length,
          successful,
          failed
        }
      });
    }

    return badRequest('Ação de lead scoring não suportada');
  }

  return methodNotAllowed();
};

const handleLeadDistributionRoutes = async (request, env, url, currentUser) => {
  if (request.method === 'GET') {
    const action = String(url.searchParams.get('action') || '').trim().toLowerCase();

    if (action === 'sellers') {
      const users = await loadUsersForView(env);
      const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);

      const sellers = users
        .filter((user) => user.role === 'SELLER' || user.role === 'ADMIN' || user.role === 'MANAGER')
        .map((seller) => ({
          ...seller,
          activeLeads: opportunities.filter((opp) => String(opp.ownerId || '') === String(seller.id) && opp.stage !== 'WON' && opp.stage !== 'LOST').length
        }));

      return json(sellers);
    }

    return json([]);
  }

  if (request.method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'redistribute-unattended') {
      return json({
        success: true,
        message: 'Redistribuição concluída.',
        summary: {
          total: 0,
          successful: 0,
          failed: 0
        }
      });
    }

    if (action === 'create-opportunity') {
      const companyId = String(body.companyId || '').trim();
      if (!companyId) return badRequest('companyId é obrigatório');

      const company = await getModuleRecord(env, MODULES.COMPANIES, companyId);
      if (!company) return json({ error: 'Empresa não encontrada' }, 404);

      const users = await loadUsersForView(env);
      const sellers = users.filter((user) => user.role === 'SELLER' || user.role === 'ADMIN' || user.role === 'MANAGER');
      if (!sellers.length) return json({ error: 'Nenhum vendedor disponível' }, 400);

      const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
      let assignedSeller = null;

      if (body.sellerId) {
        assignedSeller = sellers.find((seller) => String(seller.id) === String(body.sellerId));
      }

      if (!assignedSeller) {
        const strategy = String(body.strategy || 'LOAD_BALANCE').toUpperCase();
        if (strategy === 'RANDOM') {
          assignedSeller = sellers[Math.floor(Math.random() * sellers.length)];
        } else {
          assignedSeller = sellers
            .map((seller) => ({
              seller,
              load: opportunities.filter((opp) => String(opp.ownerId || '') === String(seller.id) && opp.stage !== 'WON' && opp.stage !== 'LOST').length
            }))
            .sort((a, b) => a.load - b.load)[0]?.seller;
        }
      }

      if (!assignedSeller) {
        return json({ error: 'Não foi possível atribuir vendedor' }, 400);
      }

      const projectName = String(body.projectName || `Projeto ${company.name || ''}`).trim() || `Projeto ${company.name || ''}`;
      const opportunity = await upsertModuleRecord(env, MODULES.OPPORTUNITIES, {
        id: crypto.randomUUID(),
        title: projectName,
        projectName,
        projectClientType: String(body.projectClientType || 'NEW_CLIENT').toUpperCase(),
        description: `Lead distribuído automaticamente para ${assignedSeller.name}`,
        value: 0,
        probability: 40,
        stage: 'LEAD',
        source: 'LEAD_DISTRIBUTION',
        companyId: company.id,
        ownerId: assignedSeller.id
      });

      await upsertModuleRecord(env, MODULES.COMPANIES, {
        ...company,
        status: 'PROSPECT'
      }, company.id);

      return json({
        success: true,
        message: 'Lead distribuído com sucesso.',
        assignedSeller,
        opportunity,
        convertedToOpportunity: true,
        companyStatus: 'PROSPECT'
      });
    }

    return badRequest('Ação de distribuição não suportada');
  }

  return methodNotAllowed();
};

const handleSalesTargetsRoutes = async (request, env, url, segments) => {
  const method = request.method;

  if (method === 'GET') {
    const targets = await listModuleRecords(env, MODULES.SALES_TARGETS);
    const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
    const users = await loadUsersForView(env);
    const userMap = new Map(users.map((item) => [String(item.id), item]));

    const rows = targets.map((target) => computeTargetWithMetrics(target, opportunities, userMap.get(String(target.sellerId)) || null));
    return json(rows);
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const sellerId = String(body.sellerId || '').trim();
    if (!sellerId) return badRequest('sellerId é obrigatório');

    const periodInfo = getPeriodDates(body.period);
    const created = await upsertModuleRecord(env, MODULES.SALES_TARGETS, {
      id: crypto.randomUUID(),
      sellerId,
      period: String(body.period || periodInfo.startDate.slice(0, 7)),
      targetValue: toNumber(body.targetValue ?? body.target, 0),
      targetDeals: toInt(body.targetDeals, 0),
      startDate: body.startDate || periodInfo.startDate,
      endDate: body.endDate || periodInfo.endDate,
      description: String(body.description || '').trim(),
      bonusPercentage: toNumber(body.bonusPercentage ?? body.bonus, 0)
    });

    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.SALES_TARGETS, id);
    if (!current) return json({ error: 'Meta não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.SALES_TARGETS, {
      ...current,
      ...body,
      id,
      targetValue: body.targetValue !== undefined || body.target !== undefined
        ? toNumber(body.targetValue ?? body.target, toNumber(current.targetValue ?? current.target, 0))
        : toNumber(current.targetValue ?? current.target, 0)
    }, id);

    return json(updated);
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');
    await deleteModuleRecord(env, MODULES.SALES_TARGETS, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleCommissionsRoutes = async (request, env, url, segments) => {
  const method = request.method;
  const commissions = await listModuleRecords(env, MODULES.COMMISSIONS);
  const users = await loadUsersForView(env);
  const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
  const companies = await listModuleRecords(env, MODULES.COMPANIES);

  const usersMap = new Map(users.map((item) => [String(item.id), item]));
  const opportunitiesMap = new Map(opportunities.map((item) => [String(item.id), item]));
  const companiesMap = new Map(companies.map((item) => [String(item.id), item]));

  const hydrateCommission = (commission) => {
    const opportunity = commission.opportunityId ? opportunitiesMap.get(String(commission.opportunityId)) || null : null;
    const seller = commission.sellerId ? usersMap.get(String(commission.sellerId)) || null : null;

    return {
      ...commission,
      seller,
      opportunity: opportunity
        ? {
            ...opportunity,
            company: opportunity.companyId ? companiesMap.get(String(opportunity.companyId)) || null : null
          }
        : null
    };
  };

  if (method === 'GET') {
    const sellerId = String(url.searchParams.get('sellerId') || '').trim();
    const status = String(url.searchParams.get('status') || '').trim().toUpperCase();

    let rows = commissions;
    if (sellerId) rows = rows.filter((item) => String(item.sellerId || '') === sellerId);
    if (status) rows = rows.filter((item) => String(item.status || '').toUpperCase() === status);

    return json(rows.map(hydrateCommission));
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const sellerId = String(body.sellerId || '').trim();
    if (!sellerId) return badRequest('sellerId é obrigatório');

    const opportunity = body.opportunityId ? opportunitiesMap.get(String(body.opportunityId)) || null : null;
    const percentage = toNumber(body.percentage, 5);
    const amount = body.amount !== undefined
      ? toNumber(body.amount, 0)
      : (opportunity ? toNumber(opportunity.value, 0) * (percentage / 100) : 0);

    const created = await upsertModuleRecord(env, MODULES.COMMISSIONS, {
      id: crypto.randomUUID(),
      opportunityId: body.opportunityId || null,
      sellerId,
      percentage,
      amount,
      status: String(body.status || 'PENDING').toUpperCase(),
      paidAt: body.paidAt || null
    });

    return json(hydrateCommission(created), 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.COMMISSIONS, id);
    if (!current) return json({ error: 'Comissão não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.COMMISSIONS, {
      ...current,
      ...body,
      id,
      percentage: body.percentage !== undefined ? toNumber(body.percentage, toNumber(current.percentage, 0)) : toNumber(current.percentage, 0),
      amount: body.amount !== undefined ? toNumber(body.amount, toNumber(current.amount, 0)) : toNumber(current.amount, 0),
      status: body.status ? String(body.status).toUpperCase() : String(current.status || 'PENDING').toUpperCase()
    }, id);

    return json(hydrateCommission(updated));
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');
    await deleteModuleRecord(env, MODULES.COMMISSIONS, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleTeamCommissionsRoutes = async (request, env, url) => {
  if (request.method !== 'GET') return methodNotAllowed();

  const type = String(url.searchParams.get('type') || 'by_region').trim().toLowerCase();
  const commissions = await listModuleRecords(env, MODULES.COMMISSIONS);
  const users = await loadUsersForView(env);
  const regions = await listModuleRecords(env, MODULES.REGIONS);

  if (type !== 'by_region') return json([]);

  const regionMap = new Map(regions.map((region) => [String(region.id), region]));
  const groupMap = new Map();

  for (const commission of commissions) {
    const seller = users.find((user) => String(user.id) === String(commission.sellerId || ''));
    const regionId = String(seller?.regionId || 'sem-regiao');
    const region = regionMap.get(regionId) || {
      id: regionId,
      name: 'Sem Região',
      code: 'N/A'
    };

    if (!groupMap.has(regionId)) {
      groupMap.set(regionId, {
        region,
        sellers: new Set(),
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0
      });
    }

    const group = groupMap.get(regionId);
    group.sellers.add(String(commission.sellerId || ''));
    const amount = toNumber(commission.amount, 0);
    group.totalCommissions += amount;
    if (String(commission.status || '').toUpperCase() === 'PAID') {
      group.paidCommissions += amount;
    } else {
      group.pendingCommissions += amount;
    }
  }

  const rows = Array.from(groupMap.values()).map((group) => ({
    region: group.region,
    sellersCount: group.sellers.size,
    totalCommissions: group.totalCommissions,
    paidCommissions: group.paidCommissions,
    pendingCommissions: group.pendingCommissions,
    averagePerSeller: group.sellers.size > 0 ? group.totalCommissions / group.sellers.size : 0
  }));

  return json(rows);
};

const seedWorkflowDataIfNeeded = async (env) => {
  const existingWorkflows = await listModuleRecords(env, MODULES.WORKFLOWS);
  if (existingWorkflows.length === 0) {
    await upsertModuleRecord(env, MODULES.WORKFLOWS, {
      id: crypto.randomUUID(),
      name: 'Distribuição automática de leads',
      description: 'Distribui leads de acordo com prioridade e capacidade da equipe.',
      trigger: 'LEAD_CREATED',
      conditions: [],
      actions: [],
      active: true,
      priority: 'MEDIUM',
      executionStatus: 'PENDING',
      executions: 0
    });
  }

  const existingRules = await listModuleRecords(env, MODULES.AUTOMATION_RULES);
  if (existingRules.length === 0) {
    await upsertModuleRecord(env, MODULES.AUTOMATION_RULES, {
      id: crypto.randomUUID(),
      name: 'Executar automações pendentes',
      description: 'Processa fila de automações do CRM.',
      type: 'LEAD_DISTRIBUTION',
      schedule: 'IMMEDIATE',
      conditions: {},
      actions: {},
      active: true
    });
  }
};

const handleWorkflowsRoutes = async (request, env, url, segments) => {
  await seedWorkflowDataIfNeeded(env);

  const method = request.method;

  if (segments[1] === 'automation-rules') {
    if (segments[2] === 'execute-pending' && method === 'POST') {
      const rules = await listModuleRecords(env, MODULES.AUTOMATION_RULES);
      const activeRules = rules.filter((rule) => toBool(rule.active, true));

      await upsertModuleRecord(env, MODULES.NOTIFICATIONS, {
        id: crypto.randomUUID(),
        type: 'AUTOMATION',
        title: 'Execução de automações',
        message: `${activeRules.length} regra(s) executada(s).`,
        status: 'DELIVERED'
      });

      return json({
        success: true,
        message: `${activeRules.length} regra(s) de automação processada(s).`
      });
    }

    if (method === 'GET') {
      const rules = await listModuleRecords(env, MODULES.AUTOMATION_RULES);
      return json({ rules });
    }

    if (method === 'POST' && segments.length === 2) {
      const body = asObject(await parseJsonBody(request));
      const created = await upsertModuleRecord(env, MODULES.AUTOMATION_RULES, {
        id: crypto.randomUUID(),
        ...body,
        active: body.active === undefined ? true : toBool(body.active, true)
      });
      return json(created, 201);
    }

    if ((method === 'PUT' || method === 'PATCH') && segments[2]) {
      const body = asObject(await parseJsonBody(request));
      const id = segments[2];
      const current = await getModuleRecord(env, MODULES.AUTOMATION_RULES, id);
      if (!current) return json({ error: 'Regra não encontrada' }, 404);
      const updated = await upsertModuleRecord(env, MODULES.AUTOMATION_RULES, {
        ...current,
        ...body,
        id,
        active: body.active !== undefined ? toBool(body.active, toBool(current.active, true)) : toBool(current.active, true)
      }, id);
      return json(updated);
    }

    if (method === 'DELETE' && segments[2]) {
      await deleteModuleRecord(env, MODULES.AUTOMATION_RULES, segments[2]);
      return json({ success: true });
    }

    return methodNotAllowed();
  }

  if (segments[1] === 'notifications') {
    if (method === 'GET') {
      const notifications = await listModuleRecords(env, MODULES.NOTIFICATIONS);
      return json({ notifications });
    }
    return methodNotAllowed();
  }

  if (segments[1] && segments[2] === 'execute' && method === 'POST') {
    const workflowId = segments[1];
    const current = await getModuleRecord(env, MODULES.WORKFLOWS, workflowId);
    if (!current) return json({ error: 'Workflow não encontrado' }, 404);

    const executions = toInt(current.executions, 0) + 1;
    await upsertModuleRecord(env, MODULES.WORKFLOWS, {
      ...current,
      executions,
      executionStatus: 'COMPLETED',
      lastExecutionAt: nowIso()
    }, workflowId);

    await upsertModuleRecord(env, MODULES.NOTIFICATIONS, {
      id: crypto.randomUUID(),
      type: 'WORKFLOW',
      title: `Workflow executado: ${current.name}`,
      message: 'Execução concluída com sucesso.',
      channel: 'IN_APP',
      status: 'DELIVERED'
    });

    return json({ success: true, message: 'Workflow executado com sucesso.' });
  }

  if (method === 'GET' && segments.length === 1) {
    const workflows = await listModuleRecords(env, MODULES.WORKFLOWS);
    return json({ workflows });
  }

  return methodNotAllowed();
};

const handleAdvancedWorkflowsRoutes = async (request, env, url, segments) => {
  const method = request.method;

  if (method === 'GET') {
    const workflows = await listModuleRecords(env, MODULES.ADVANCED_WORKFLOWS);
    return json(workflows.map((workflow) => ({
      ...workflow,
      _count: {
        executions: toInt(workflow?.executions || workflow?._count?.executions, 0)
      },
      isActive: workflow.isActive === undefined ? true : toBool(workflow.isActive, true)
    })));
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const created = await upsertModuleRecord(env, MODULES.ADVANCED_WORKFLOWS, {
      id: crypto.randomUUID(),
      ...body,
      isActive: body.isActive === undefined ? true : toBool(body.isActive, true),
      executions: toInt(body.executions, 0)
    });
    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(segments[1] || body.id || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.ADVANCED_WORKFLOWS, id);
    if (!current) return json({ error: 'Workflow não encontrado' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.ADVANCED_WORKFLOWS, {
      ...current,
      ...body,
      id,
      isActive: body.isActive !== undefined ? toBool(body.isActive, toBool(current.isActive, true)) : toBool(current.isActive, true),
      executions: body.executions !== undefined ? toInt(body.executions, toInt(current.executions, 0)) : toInt(current.executions, 0)
    }, id);

    return json(updated);
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(segments[1] || body.id || '').trim();
    if (!id) return badRequest('ID obrigatório');

    await deleteModuleRecord(env, MODULES.ADVANCED_WORKFLOWS, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleIntegrationsRoutes = async (request, env, url, segments) => {
  const method = request.method;

  if (method === 'GET') {
    return json(await listModuleRecords(env, MODULES.INTEGRATIONS));
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const created = await upsertModuleRecord(env, MODULES.INTEGRATIONS, {
      id: crypto.randomUUID(),
      ...body,
      isActive: body.isActive === undefined ? true : toBool(body.isActive, true),
      lastSync: body.lastSync || null
    });
    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.INTEGRATIONS, id);
    if (!current) return json({ error: 'Integração não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.INTEGRATIONS, {
      ...current,
      ...body,
      id,
      isActive: body.isActive !== undefined ? toBool(body.isActive, toBool(current.isActive, true)) : toBool(current.isActive, true)
    }, id);

    return json(updated);
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    await deleteModuleRecord(env, MODULES.INTEGRATIONS, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handleWhatsappRoutes = async (request) => {
  if (request.method !== 'POST') return methodNotAllowed();
  const body = asObject(await parseJsonBody(request));
  return json({
    success: true,
    message: 'Mensagem enviada (simulação).',
    action: body.action || 'send_message',
    timestamp: nowIso()
  });
};

const handleEmailMarketingRoutes = async (request, url) => {
  if (request.method !== 'GET') return methodNotAllowed();
  const type = String(url.searchParams.get('type') || '').toLowerCase();

  if (type === 'campaigns') {
    return json({
      campaigns: [
        { id: crypto.randomUUID(), name: 'Campanha de Recuperação', status: 'ACTIVE', sent: 1240, openRate: 31.5 },
        { id: crypto.randomUUID(), name: 'Oferta B2G', status: 'PAUSED', sent: 540, openRate: 24.1 }
      ],
      total: 2
    });
  }

  return json({ campaigns: [], total: 0 });
};

const handleVoipRoutes = async (request, url) => {
  if (request.method !== 'GET') return methodNotAllowed();
  const type = String(url.searchParams.get('type') || '').toLowerCase();

  if (type === 'statistics') {
    return json({
      callsToday: 42,
      averageDurationSeconds: 188,
      answeredRate: 87.4,
      queueTimeSeconds: 22
    });
  }

  return json({});
};

const handleSolicitacoesRoutes = async (request, env, currentUser, segments) => {
  const method = request.method;

  if (method === 'GET') {
    return json(await listModuleRecords(env, MODULES.SOLICITACOES));
  }

  if (method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    const numero = body.numero || (await createSolicitacaoNumber(env));

    const created = await upsertModuleRecord(env, MODULES.SOLICITACOES, {
      id: crypto.randomUUID(),
      numero,
      titulo: String(body.titulo || body.title || 'Solicitação sem título').trim(),
      descricao: String(body.descricao || body.description || '').trim(),
      status: String(body.status || 'NOVA').toUpperCase(),
      prioridade: String(body.prioridade || body.priority || 'MEDIUM').toUpperCase(),
      tiposPrecificacao: asArray(body.tiposPrecificacao),
      observacoes: String(body.observacoes || '').trim(),
      leadId: body.leadId || null,
      prazoEsperado: body.prazoEsperado || null,
      orcamentoEstimado: body.orcamentoEstimado !== undefined ? toNumber(body.orcamentoEstimado, 0) : null,
      valorSugerido: body.valorSugerido !== undefined ? toNumber(body.valorSugerido, 0) : null,
      custoTotal: body.custoTotal !== undefined ? toNumber(body.custoTotal, 0) : null,
      margemLucro: body.margemLucro !== undefined ? toNumber(body.margemLucro, 0) : null,
      solicitante: {
        id: currentUser?.id || null,
        name: currentUser?.name || 'Usuário',
        email: currentUser?.email || ''
      }
    });

    return json(created, 201);
  }

  if (method === 'PUT' || method === 'PATCH') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.SOLICITACOES, id);
    if (!current) return json({ error: 'Solicitação não encontrada' }, 404);

    const updated = await upsertModuleRecord(env, MODULES.SOLICITACOES, {
      ...current,
      ...body,
      id,
      status: body.status ? String(body.status).toUpperCase() : String(current.status || 'NOVA').toUpperCase(),
      prioridade: body.prioridade
        ? String(body.prioridade).toUpperCase()
        : body.priority
          ? String(body.priority).toUpperCase()
          : String(current.prioridade || 'MEDIUM').toUpperCase()
    }, id);

    return json(updated);
  }

  if (method === 'DELETE') {
    const body = asObject(await parseJsonBody(request));
    const id = String(body.id || segments[1] || '').trim();
    if (!id) return badRequest('ID obrigatório');
    await deleteModuleRecord(env, MODULES.SOLICITACOES, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const handlePdfGeneratorRoutes = async (request, env, url, segments) => {
  if (request.method !== 'POST') return methodNotAllowed();
  if (segments[1] !== 'orcamento') return notFound();

  const body = asObject(await parseJsonBody(request));
  const solicitacao = asObject(body.solicitacao);
  const title = `Orçamento ${String(solicitacao.numero || solicitacao.id || 'CRM')}`;

  const lines = [
    `Título: ${String(solicitacao.titulo || '').trim()}`,
    `Status: ${String(solicitacao.status || '').trim()}`,
    `Cliente: ${String(solicitacao?.company?.name || '').trim()}`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`
  ];

  const pdf = generateSimplePdf(title, lines);

  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="orcamento-${encodeURIComponent(String(solicitacao.numero || solicitacao.id || 'documento'))}.pdf"`
    }
  });
};

const handleDashboardRoutes = async (request, env, url) => {
  if (request.method !== 'GET') return methodNotAllowed();

  const opportunities = await listModuleRecords(env, MODULES.OPPORTUNITIES);
  const users = await loadUsersForView(env);

  const stats = computeOpportunityStats(opportunities);

  const kpis = {
    totalRevenue: stats.wonValue,
    conversionRate: stats.conversionRate,
    avgTicket: stats.avgTicket,
    totalOpportunities: stats.total,
    wonValue: stats.wonValue,
    pipelineValue: stats.totalValue,
    wonOpportunities: stats.won,
    totalCompanies: (await listModuleRecords(env, MODULES.COMPANIES)).length
  };

  const stages = {};
  for (const opportunity of opportunities) {
    const stage = String(opportunity.stage || 'LEAD').toUpperCase();
    if (!stages[stage]) {
      stages[stage] = { stage, _count: { stage: 0 }, _sum: { value: 0 } };
    }
    stages[stage]._count.stage += 1;
    stages[stage]._sum.value += toNumber(opportunity.value, 0);
  }

  const monthlyRevenueMap = new Map();
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthDate.toISOString().slice(0, 7);
    monthlyRevenueMap.set(key, {
      month: `${key}-01`,
      revenue: 0
    });
  }

  for (const opportunity of opportunities.filter((item) => item.stage === 'WON')) {
    const refDate = new Date(opportunity.actualCloseDate || opportunity.updatedAt || opportunity.createdAt || nowIso());
    if (Number.isNaN(refDate.getTime())) continue;
    const key = refDate.toISOString().slice(0, 7);
    if (!monthlyRevenueMap.has(key)) continue;
    monthlyRevenueMap.get(key).revenue += toNumber(opportunity.value, 0);
  }

  const leadSourceMap = new Map();
  for (const opportunity of opportunities) {
    const source = String(opportunity.source || 'Outros');
    leadSourceMap.set(source, (leadSourceMap.get(source) || 0) + 1);
  }

  const lossReasonsMap = new Map();
  for (const opportunity of opportunities.filter((item) => item.stage === 'LOST')) {
    const reason = String(opportunity.lossReason || 'Não informado');
    lossReasonsMap.set(reason, (lossReasonsMap.get(reason) || 0) + 1);
  }

  const sellerPerformance = users.map((user) => {
    const wonRows = opportunities.filter((item) => String(item.ownerId || '') === String(user.id) && item.stage === 'WON');
    return {
      user: user.name,
      won: wonRows.length,
      value: wonRows.reduce((sum, row) => sum + toNumber(row.value, 0), 0)
    };
  });

  return json({
    kpis,
    charts: {
      funnel: Object.values(stages),
      monthlyRevenue: Array.from(monthlyRevenueMap.values()),
      sellerPerformance,
      leadSources: Array.from(leadSourceMap.entries()).map(([source, count]) => ({ source, count })),
      lossReasons: Array.from(lossReasonsMap.entries()).map(([reason, count]) => ({ reason, count }))
    }
  });
};

const handleB2GRoutes = async (request, env, url, segments, currentUser) => {
  const method = request.method;

  if (segments[1] === 'editais') {
    if (method === 'GET' && segments.length === 2) {
      const notices = await listModuleRecords(env, MODULES.B2G_NOTICES);
      notices.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      return json(notices);
    }

    if (method === 'POST' && segments.length === 2) {
      const body = asObject(await parseJsonBody(request));
      const noticeType = String(body.type || 'EDITAL').toUpperCase();
      const created = await upsertModuleRecord(env, MODULES.B2G_NOTICES, {
        id: crypto.randomUUID(),
        type: noticeType,
        title: String(body.title || body.fileName || 'Documento sem título').trim(),
        referenceCode: String(body.referenceCode || '').trim(),
        organization: String(body.organization || 'Órgão não informado').trim(),
        stateCode: String(body.stateCode || '').trim().toUpperCase(),
        modality: String(body.modality || '').trim(),
        objectDescription: String(body.objectDescription || '').trim(),
        estimatedValue: body.estimatedValue === null || body.estimatedValue === undefined || body.estimatedValue === '' ? null : toNumber(body.estimatedValue, 0),
        openingDate: body.openingDate || null,
        proposalDueDate: body.proposalDueDate || null,
        sourceUrl: String(body.sourceUrl || '').trim(),
        tags: asArray(body.tags),
        status: String(body.status || 'ANALISE').toUpperCase(),
        summary: String(body.summary || '').trim(),
        documentation: asArray(body.documentation),
        aiAnalysis: body.aiAnalysis || null,
        createdById: currentUser?.id || null
      });

      await upsertModuleRecord(env, MODULES.B2G_HISTORY, {
        id: crypto.randomUUID(),
        noticeId: created.id,
        action: 'CREATE',
        note: 'Registro criado',
        payload: body,
        authorId: currentUser?.id || null
      });

      return json(created, 201);
    }

    if (segments[2] && segments[3] === 'historico' && method === 'GET') {
      const noticeId = segments[2];
      const history = await listModuleByField(env, MODULES.B2G_HISTORY, 'noticeId', noticeId);
      history.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return json(history);
    }

    if (segments[2] && segments[3] === 'analisar' && method === 'POST') {
      const noticeId = segments[2];
      const body = asObject(await parseJsonBody(request));
      const notice = await getModuleRecord(env, MODULES.B2G_NOTICES, noticeId);
      if (!notice) return json({ error: 'Edital/TR não encontrado' }, 404);

      const aiAnalysis = buildAiAnalysisFromNotice({
        notice,
        instruction: String(body.instruction || '').trim()
      });

      const updated = await upsertModuleRecord(env, MODULES.B2G_NOTICES, {
        ...notice,
        status: 'ANALISE_CONCLUIDA',
        summary: notice.summary || aiAnalysis.resumoExecutivo,
        aiAnalysis
      }, noticeId);

      await upsertModuleRecord(env, MODULES.B2G_HISTORY, {
        id: crypto.randomUUID(),
        noticeId,
        action: 'ANALYZE',
        note: 'Análise IA executada',
        payload: { instruction: body.instruction },
        authorId: currentUser?.id || null
      });

      return json({ notice: updated });
    }

    if (segments[2] && segments[3] === 'converter-oportunidade' && method === 'POST') {
      const noticeId = segments[2];
      const notice = await getModuleRecord(env, MODULES.B2G_NOTICES, noticeId);
      if (!notice) return json({ error: 'Edital/TR não encontrado' }, 404);

      const companies = await listModuleRecords(env, MODULES.COMPANIES);
      let company = companies.find((item) => String(item.name || '').toLowerCase() === String(notice.organization || '').toLowerCase());

      if (!company) {
        company = await upsertModuleRecord(env, MODULES.COMPANIES, {
          id: crypto.randomUUID(),
          name: notice.organization || 'Órgão Público',
          status: 'PROSPECT',
          segment: 'B2G',
          state: notice.stateCode || '',
          leadScore: 65,
          churnRisk: 0,
          contacts: []
        });
      }

      const opportunity = await upsertModuleRecord(env, MODULES.OPPORTUNITIES, {
        id: crypto.randomUUID(),
        title: notice.title || 'Oportunidade B2G',
        projectName: notice.title || 'Oportunidade B2G',
        projectClientType: 'NEW_CLIENT',
        description: notice.objectDescription || notice.summary || 'Oportunidade convertida a partir de análise B2G.',
        value: toNumber(notice.estimatedValue, 0),
        probability: 55,
        stage: 'DIAGNOSIS',
        b2gStage: 'ANALISE',
        source: 'B2G',
        expectedCloseDate: notice.proposalDueDate || null,
        companyId: company.id,
        ownerId: currentUser?.id || null
      });

      await upsertModuleRecord(env, MODULES.B2G_NOTICES, {
        ...notice,
        status: 'OPORTUNIDADE_CRIADA',
        convertedOpportunityId: opportunity.id
      }, noticeId);

      await upsertModuleRecord(env, MODULES.B2G_HISTORY, {
        id: crypto.randomUUID(),
        noticeId,
        action: 'CONVERT_OPPORTUNITY',
        note: 'Resumo convertido em oportunidade',
        payload: { opportunityId: opportunity.id },
        authorId: currentUser?.id || null
      });

      return json({
        success: true,
        opportunity
      });
    }

    if (segments[2] && (method === 'PUT' || method === 'PATCH')) {
      const noticeId = segments[2];
      const notice = await getModuleRecord(env, MODULES.B2G_NOTICES, noticeId);
      if (!notice) return json({ error: 'Edital/TR não encontrado' }, 404);

      const body = asObject(await parseJsonBody(request));
      const updated = await upsertModuleRecord(env, MODULES.B2G_NOTICES, {
        ...notice,
        ...body,
        id: noticeId
      }, noticeId);

      await upsertModuleRecord(env, MODULES.B2G_HISTORY, {
        id: crypto.randomUUID(),
        noticeId,
        action: 'UPDATE',
        note: String(body.changeNote || 'Registro atualizado').trim(),
        payload: body,
        authorId: currentUser?.id || null
      });

      return json(updated);
    }

    if (segments[2] && method === 'DELETE') {
      const noticeId = segments[2];
      await deleteModuleRecord(env, MODULES.B2G_NOTICES, noticeId);

      const history = await listModuleByField(env, MODULES.B2G_HISTORY, 'noticeId', noticeId);
      for (const item of history) {
        await deleteModuleRecord(env, MODULES.B2G_HISTORY, item.id);
      }

      return json({ success: true });
    }

    return notFound();
  }

  if (segments[1] === 'analisar-arquivo' && method === 'POST') {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return badRequest('Arquivo obrigatório');

    const mode = String(formData.get('mode') || 'EDITAL').toUpperCase();
    const instruction = String(formData.get('instruction') || '').trim();
    const aiExtractedData = safeJsonParse(String(formData.get('aiExtractedData') || ''), null);

    const extractedData = aiExtractedData || buildBasicAnalysisExtractedData({
      mode,
      title: file.name,
      organization: 'Órgão não identificado',
      summary: '',
      instruction
    });

    const noticeType = mode === 'TR' ? 'TERMO_REFERENCIA' : 'EDITAL';
    const title = String(file.name || 'Documento analisado').replace(/\.[^.]+$/, '');
    const summary = String(
      extractedData?.trSummary ||
      extractedData?.general?.objectSummary ||
      'Resumo gerado automaticamente a partir do documento enviado.'
    );

    const notice = await upsertModuleRecord(env, MODULES.B2G_NOTICES, {
      id: crypto.randomUUID(),
      type: noticeType,
      title,
      referenceCode: '',
      organization: String(extractedData?.general?.agency || 'Órgão não identificado'),
      stateCode: '',
      modality: String(extractedData?.general?.modality || ''),
      objectDescription: summary,
      estimatedValue: null,
      openingDate: extractedData?.general?.openingDate || null,
      proposalDueDate: extractedData?.deadlines?.proposalDeadline || null,
      sourceUrl: '',
      tags: [],
      status: 'ANALISE_CONCLUIDA',
      summary,
      documentation: [],
      aiAnalysis: {
        generatedAt: nowIso(),
        recomendacao: String(extractedData?.recomendacao || 'GO'),
        scoreAderencia: toNumber(extractedData?.scoreAderencia, 75),
        resumoExecutivo: summary,
        pontosChave: asArray(extractedData?.keyPoints),
        riscos: asArray(extractedData?.risks),
        oportunidades: asArray(extractedData?.opportunities),
        proximasAcoes: asArray(extractedData?.nextActions),
        templateExtractedData: extractedData
      },
      uploadedFileName: file.name,
      uploadedFileSize: file.size
    });

    await upsertModuleRecord(env, MODULES.B2G_HISTORY, {
      id: crypto.randomUUID(),
      noticeId: notice.id,
      action: 'UPLOAD_ANALYZE',
      note: `Arquivo ${file.name} analisado`,
      payload: { fileName: file.name, mode },
      authorId: null
    });

    return json({
      success: true,
      notice,
      upload: {
        fileName: file.name,
        numPages: 1
      }
    });
  }

  return notFound();
};

const handleAiAnalysisRoutes = async (request, env, url, segments) => {
  if (request.method !== 'POST') return methodNotAllowed();

  const modeToken = String(segments[1] || '').toLowerCase();
  const mode = modeToken === 'tr' ? 'TR' : 'EDITAL';
  const body = asObject(await parseJsonBody(request));
  const requestSchema = mode === 'TR' ? ANALYSIS_SCHEMAS.request_tr : ANALYSIS_SCHEMAS.request_edital;
  const requestErrors = validateBySchema(requestSchema, body);
  if (requestErrors.length > 0) {
    return json({
      message: `Payload inválido para ${mode === 'TR' ? 'request_tr' : 'request_edital'}. ${schemaErrorsToMessage(requestErrors)}`,
      errors: requestErrors
    }, 400);
  }

  const extracted = buildBasicAnalysisExtractedData({
    mode,
    title: body.analyzedModelName || body.fileName || 'Documento',
    organization: '',
    summary: '',
    instruction: body.analyzedModelSpecs || ''
  });

  const responseSchema = mode === 'TR' ? ANALYSIS_SCHEMAS.response_tr : ANALYSIS_SCHEMAS.response_edital;
  const responseErrors = validateBySchema(responseSchema, extracted);
  if (responseErrors.length > 0) {
    return json({
      message: `Response fora do schema ${mode === 'TR' ? 'response_tr' : 'response_edital'}. ${schemaErrorsToMessage(responseErrors)}`,
      errors: responseErrors
    }, 500);
  }

  return json(extracted);
};

const handleSavedAnalysesRoutes = async (request, env, url, segments) => {
  const scope = getScopeHeaders(request);

  if (request.method === 'GET') {
    const all = await listModuleRecords(env, MODULES.SAVED_ANALYSES);
    const filtered = all.filter((row) => {
      if (String(row.companyId || '') !== String(scope.companyId || '')) return false;
      if (scope.userRole === 'admin') return true;
      return String(row.userId || '') === String(scope.userId || '');
    });

    if (segments[2]) {
      const row = filtered.find((item) => String(item.id) === String(segments[2]));
      if (!row) return json({ error: 'Resumo salvo não encontrado' }, 404);
      return json(row);
    }

    filtered.sort((a, b) => new Date(b.processedAt || b.createdAt || 0).getTime() - new Date(a.processedAt || a.createdAt || 0).getTime());
    return json(filtered);
  }

  if (request.method === 'POST') {
    const body = asObject(await parseJsonBody(request));
    if (!scope.userId) return badRequest('x-user-id obrigatório');

    const created = await upsertModuleRecord(env, MODULES.SAVED_ANALYSES, {
      id: crypto.randomUUID(),
      companyId: scope.companyId,
      userId: scope.userId,
      userRole: scope.userRole,
      analysisId: String(body.analysisId || `analysis-${Date.now()}`),
      fileName: String(body.fileName || 'resumo.pdf'),
      processedAt: body.processedAt || nowIso(),
      extractedData: body.extractedData || {},
      originalFileDataUri: body.originalFileDataUri || null,
      summaryPdfDataUri: body.summaryPdfDataUri || null
    });

    return json(created, 201);
  }

  if (request.method === 'DELETE') {
    const id = String(segments[2] || '').trim();
    if (!id) return badRequest('ID obrigatório');

    const current = await getModuleRecord(env, MODULES.SAVED_ANALYSES, id);
    if (!current) return json({ error: 'Resumo salvo não encontrado' }, 404);

    if (String(current.companyId || '') !== String(scope.companyId || '')) {
      return json({ error: 'Acesso negado ao resumo salvo' }, 403);
    }
    if (scope.userRole !== 'admin' && String(current.userId || '') !== String(scope.userId || '')) {
      return json({ error: 'Acesso negado ao resumo salvo' }, 403);
    }

    await deleteModuleRecord(env, MODULES.SAVED_ANALYSES, id);
    return json({ success: true });
  }

  return methodNotAllowed();
};

const PUBLIC_LICENSING_PLANS = [
  {
    id: 'plan-mensal',
    code: 'MENSAL',
    name: 'Mensal',
    description: 'Cobranca recorrente mensal',
    billingCycle: 'MONTHLY',
    price: 289,
    currency: 'BRL',
    seatsIncluded: 1,
    sortOrder: 10,
    features: { b2b: true, b2g: true, preSales: true, integrations: true, supportLevel: 'standard' },
    isActive: true
  },
  {
    id: 'plan-trimestral',
    code: 'TRIMESTRAL',
    name: 'Trimestral',
    description: 'Cobranca a cada 3 meses',
    billingCycle: 'QUARTERLY',
    price: 780.3,
    currency: 'BRL',
    seatsIncluded: 3,
    sortOrder: 20,
    features: { b2b: true, b2g: true, preSales: true, integrations: true, supportLevel: 'priority' },
    isActive: true
  },
  {
    id: 'plan-semestral',
    code: 'SEMESTRAL',
    name: 'Semestral',
    description: 'Cobranca a cada 6 meses',
    billingCycle: 'SEMIANNUAL',
    price: 1473.9,
    currency: 'BRL',
    seatsIncluded: 5,
    sortOrder: 30,
    features: { b2b: true, b2g: true, preSales: true, integrations: true, supportLevel: 'priority' },
    isActive: true
  },
  {
    id: 'plan-anual',
    code: 'ANUAL',
    name: 'Anual',
    description: 'Cobranca anual',
    billingCycle: 'ANNUAL',
    price: 2774.4,
    currency: 'BRL',
    seatsIncluded: 10,
    sortOrder: 40,
    features: { b2b: true, b2g: true, preSales: true, integrations: true, supportLevel: 'enterprise' },
    isActive: true
  }
];

const CHECKOUT_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 297,
    description: 'Plano Starter - Até 3 usuários'
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 697,
    description: 'Plano Professional - Até 10 usuários'
  }
};

const resolveCheckoutPlan = (planId) => {
  const normalized = normalizeString(planId, 80).toLowerCase();
  return CHECKOUT_PLANS[normalized] || null;
};

const resolvePublicLicensingPlan = ({ planCode, planId }) => {
  const code = normalizeString(planCode, 80).toUpperCase();
  const id = normalizeString(planId, 120);
  if (id) {
    return PUBLIC_LICENSING_PLANS.find((plan) => plan.id === id) || null;
  }
  if (code) {
    return PUBLIC_LICENSING_PLANS.find((plan) => plan.code === code) || null;
  }
  return PUBLIC_LICENSING_PLANS[0];
};

const isMercadoPagoTestMode = (env) => {
  const accessToken = normalizeString(env?.MERCADO_PAGO_ACCESS_TOKEN, 300);
  const publicKey = normalizeString(env?.MERCADO_PAGO_PUBLIC_KEY, 300);
  return accessToken.startsWith('TEST-') || publicKey.startsWith('TEST-');
};

const hasMercadoPagoMixedMode = (env) => {
  const accessToken = normalizeString(env?.MERCADO_PAGO_ACCESS_TOKEN, 300);
  const publicKey = normalizeString(env?.MERCADO_PAGO_PUBLIC_KEY, 300);
  const tokenIsTest = accessToken.startsWith('TEST-');
  const keyIsTest = publicKey.startsWith('TEST-');
  return tokenIsTest !== keyIsTest;
};

const verifyMercadoPagoPaymentApproved = async (env, paymentId) => {
  const mercadoPagoToken = normalizeString(env.MERCADO_PAGO_ACCESS_TOKEN, 300);
  if (!mercadoPagoToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
  }

  const normalizedPaymentId = normalizeString(paymentId, 80);
  if (!normalizedPaymentId) {
    throw new Error('paymentId inválido');
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(normalizedPaymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${mercadoPagoToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!mpResponse.ok) {
    const mpError = await mpResponse.json().catch(() => ({}));
    const err = new Error('Falha ao consultar pagamento no Mercado Pago');
    err.details = mpError;
    throw err;
  }

  const payment = await mpResponse.json();
  const status = normalizeString(payment?.status, 40).toUpperCase();
  return {
    approved: status === 'APPROVED',
    status,
    id: normalizeString(payment?.id, 80) || normalizedPaymentId,
    externalReference: normalizeString(payment?.external_reference, 180) || null,
    transactionAmount: toNumber(payment?.transaction_amount, 0),
    currencyId: normalizeString(payment?.currency_id, 10) || 'BRL'
  };
};

const handlePublicCheckoutAndLicensing = async (request, env, path) => {
  const method = request.method;

  if (path === PAYMENTS_PUBLIC_CONFIG_PATH) {
    if (method !== 'GET') return methodNotAllowed();
    const publicKey = normalizeString(env.MERCADO_PAGO_PUBLIC_KEY, 300);
    const accessToken = normalizeString(env.MERCADO_PAGO_ACCESS_TOKEN, 300);
    const mixedMode = hasMercadoPagoMixedMode(env);
    return json({
      data: {
        provider: 'mercadopago',
        publicKey: publicKey || null,
        checkoutEnabled: Boolean(publicKey && accessToken),
        environment: isMercadoPagoTestMode(env) ? 'sandbox' : 'production',
        mixedMode
      }
    });
  }

  if (path === LICENSING_PUBLIC_PLANS_PATH) {
    if (method !== 'GET') return methodNotAllowed();
    return json({ data: PUBLIC_LICENSING_PLANS });
  }

  if (path === CHECKOUT_CREATE_PREFERENCE_PATH) {
    if (method !== 'POST') return methodNotAllowed();

    const body = asObject(await parseJsonBody(request));
    const planId = normalizeString(body?.planId, 80);
    const companyData = asObject(body?.companyData);
    const selectedPlan = resolveCheckoutPlan(planId);

    if (!selectedPlan) {
      return badRequest('Plano inválido');
    }

    const responsibleName = normalizeString(companyData.responsibleName, 180);
    const responsibleEmail = normalizeEmail(companyData.responsibleEmail);
    if (!responsibleName || !responsibleEmail) {
      return badRequest('Dados do responsável são obrigatórios');
    }

    const mercadoPagoToken = normalizeString(env.MERCADO_PAGO_ACCESS_TOKEN, 300);
    const subscriptionId = crypto.randomUUID();

    if (!mercadoPagoToken) {
      return json({ error: 'Checkout indisponível: Mercado Pago não configurado neste ambiente.' }, 503);
    }
    if (hasMercadoPagoMixedMode(env)) {
      return json(
        {
          error:
            'Checkout indisponível: chaves do Mercado Pago estão em modo misto (TEST e produção). Configure as duas no mesmo ambiente.'
        },
        503
      );
    }

    const requestOrigin = toAbsoluteHttpUrl(new URL(request.url).origin);
    const corsOriginUrl = toAbsoluteHttpUrl(env.CORS_ORIGIN);
    const frontendUrl =
      toAbsoluteHttpUrl(env.FRONTEND_URL) ||
      corsOriginUrl ||
      requestOrigin ||
      toAbsoluteHttpUrl(getFrontendUrl(env), 'http://localhost:5174');
    const apiUrl = getApiUrl(env);
    const checkoutBaseUrl = `${frontendUrl}/checkout?plan=${encodeURIComponent(selectedPlan.id)}`;

    const testMode = isMercadoPagoTestMode(env);

    const preference = {
      items: [
        {
          title: selectedPlan.name,
          description: selectedPlan.description,
          quantity: 1,
          unit_price: selectedPlan.price,
          currency_id: 'BRL'
        }
      ],
      payer: {
        name: responsibleName,
        email: responsibleEmail,
        phone: {
          number: normalizeString(companyData.responsiblePhone, 40)
        }
      },
      back_urls: {
        success: `${checkoutBaseUrl}&status=success`,
        failure: `${checkoutBaseUrl}&status=failure`,
        pending: `${checkoutBaseUrl}&status=pending`
      },
      external_reference: subscriptionId,
      notification_url: `${apiUrl}/checkout/webhook`
    };

    // In sandbox, hide wallet/credit-line options while keeping credit card.
    if (testMode) {
      preference.payment_methods = {
        excluded_payment_methods: [
          { id: 'consumer_credits' }
        ],
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'bank_transfer' },
          { id: 'atm' },
          { id: 'debit_card' }
        ]
      };
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.json().catch(() => ({}));
      return json(
        {
          error: 'Erro ao criar preferência no Mercado Pago',
          details: mpError
        },
        502
      );
    }

    const mpData = await mpResponse.json();
    // Prefer init_point even in test mode to avoid sporadic sandbox secure-fields issues.
    const paymentUrl = mpData?.init_point || mpData?.sandbox_init_point || null;

    if (!paymentUrl) {
      const reason = testMode
        ? 'URL de pagamento sandbox não recebida. Verifique se o access token TEST- está configurado.'
        : 'URL de pagamento não recebida';
      return json({ error: reason }, 502);
    }

    return json({
      success: true,
      subscriptionId,
      paymentUrl,
      initPoint: mpData?.init_point || paymentUrl,
      sandboxInitPoint: mpData?.sandbox_init_point || null,
      preferenceId: mpData?.id || null
    });
  }

  if (path === CHECKOUT_WEBHOOK_PATH) {
    if (method !== 'POST') return methodNotAllowed();

    const webhookToken = normalizeString(env.MERCADO_PAGO_WEBHOOK_TOKEN, 300);
    if (webhookToken) {
      const reqToken = normalizeString(request.headers.get('x-webhook-token'), 300);
      const queryToken = normalizeString(new URL(request.url).searchParams.get('token'), 300);
      if (reqToken !== webhookToken && queryToken !== webhookToken) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    const payload = asObject(await parseJsonBody(request));
    return json({
      received: true,
      type: normalizeString(payload?.type, 40) || null
    });
  }

  if (path === LICENSING_PUBLIC_CONFIRM_PATH) {
    if (method !== 'POST') return methodNotAllowed();

    const body = asObject(await parseJsonBody(request));
    const paymentId = normalizeString(body?.paymentId || body?.payment_id || body?.collection_id, 80);
    if (!paymentId) {
      return badRequest('paymentId é obrigatório');
    }

    let paymentVerification;
    try {
      paymentVerification = await verifyMercadoPagoPaymentApproved(env, paymentId);
    } catch (error) {
      return json(
        {
          error: 'Falha ao validar pagamento no Mercado Pago',
          details: error?.details || error?.message || 'Erro desconhecido'
        },
        502
      );
    }

    if (!paymentVerification.approved) {
      return json(
        {
          error: 'Pagamento ainda não aprovado',
          paymentStatus: paymentVerification.status || null
        },
        402
      );
    }

    const company = asObject(body?.company);
    const adminUser = asObject(body?.adminUser);

    const companyName = normalizeString(company?.name, 220);
    const companyEmail = normalizeEmail(company?.email);
    const companyDocument = normalizeString(company?.cnpj || company?.document, 32);
    const companyPhone = normalizeString(company?.phone, 40);

    const adminName = normalizeString(adminUser?.name, 180);
    const adminEmail = normalizeEmail(adminUser?.email);
    const adminPasswordInput = normalizeString(adminUser?.password, 120);

    if (!companyName || !adminName || !adminEmail) {
      return badRequest('company.name, adminUser.name e adminUser.email são obrigatórios');
    }

    const existingUser = await findUserByEmail(env, adminEmail);
    if (existingUser?.id) {
      return json({ error: 'Já existe usuário com este email' }, 409);
    }

    const selectedPlan = resolvePublicLicensingPlan({
      planCode: body?.planCode,
      planId: body?.planId
    });

    const companyId = crypto.randomUUID();
    const passwordToUse = adminPasswordInput || generateSetupPassword();
    const passwordHash = await bcrypt.hash(passwordToUse, 10);

    const createdCompany = await upsertModuleRecord(env, MODULES.COMPANIES, {
      id: companyId,
      name: companyName,
      document: companyDocument,
      email: companyEmail,
      phone: companyPhone,
      status: 'ACTIVE',
      segment: 'Licenciamento',
      leadScore: 100,
      notes: `Provisionado via checkout público em ${nowIso()}`,
      currentLicense: {
        planCode: selectedPlan?.code || 'MENSAL',
        planName: selectedPlan?.name || 'Mensal',
        price: selectedPlan?.price || 289,
        status: 'ACTIVE',
        paymentReference:
          normalizeString(body?.paymentReference, 180) ||
          paymentVerification.externalReference ||
          `PAY-${paymentVerification.id}`,
        paymentStatus: paymentVerification.status || 'APPROVED',
        paymentId: paymentVerification.id,
        paidAmount: paymentVerification.transactionAmount,
        paidCurrency: paymentVerification.currencyId,
        startDate: nowIso()
      }
    });

    const createdAdmin = await createUser(env, {
      name: adminName,
      email: adminEmail,
      password: passwordHash,
      role: 'ADMIN',
      companyId
    });

    await saveUserProfile(env, createdAdmin.id, null, 999999, companyId);

    return json(
      {
        data: {
          company: createdCompany,
          license: {
            status: 'ACTIVE',
            plan: selectedPlan
          },
          adminUser: {
            id: createdAdmin.id,
            name: createdAdmin.name,
            email: createdAdmin.email,
            role: createdAdmin.role,
            companyId: createdCompany.id
          },
          credentials: {
            email: createdAdmin.email,
            password: adminPasswordInput ? null : passwordToUse
          },
          next: {
            loginUrl: '/login'
          }
        }
      },
      201
    );
  }

  return null;
};

const handleAuthRoutes = async (request, env, path, url) => {
  const method = request.method;

  if (AUTH_LOGIN_PATHS.has(path)) {
    if (method !== 'POST') return methodNotAllowed();

    const body = await parseJsonBody(request);
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || '');
    if (!email || !password) {
      return badRequest('Email e senha são obrigatórios');
    }

    const user = await findUserByEmail(env, email);
    if (!user || !user.password || Number(user.active || 0) !== 1) {
      return json({ error: 'Credenciais inválidas' }, 401);
    }

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) return json({ error: 'Credenciais inválidas' }, 401);

    if (user.storage === 'columns') {
      await env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(user.id)
        .run();
    } else if (user.storage === 'legacy-json') {
      await persistLegacyUser(env, user.id, {
        ...user.rawData,
        password: BCRYPT_PREFIX.test(user.password) ? user.password : await bcrypt.hash(password, 10),
        lastLogin: nowIso()
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || null,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    };

    const token = await createJwt(payload, getJwtSecret(env));

    return json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId || null
      }
    });
  }

  if (AUTH_REGISTER_PATHS.has(path)) {
    if (method !== 'POST') return methodNotAllowed();

    const body = await parseJsonBody(request);
    const name = String(body?.name || '').trim();
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!name || !email || !password) {
      return badRequest('Nome, email e senha são obrigatórios');
    }

    if (password.length < 6) {
      return badRequest('A senha deve ter pelo menos 6 caracteres');
    }

    if (confirmPassword && password !== confirmPassword) {
      return badRequest('As senhas não conferem');
    }

    const existing = await findUserByEmail(env, email);
    if (existing?.id) {
      return json({ error: 'Email já está em uso' }, 400);
    }

    const created = await createUser(env, {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'USER'
    });

    return json({
      message: 'Usuário criado com sucesso',
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        companyId: created.companyId || null
      }
    }, 201);
  }

  if (AUTH_FORGOT_PASSWORD_PATHS.has(path)) {
    if (method !== 'POST') return methodNotAllowed();

    const body = await parseJsonBody(request);
    const email = normalizeEmail(body?.email);
    const newPassword = String(body?.newPassword || '');
    const confirmPassword = String(body?.confirmPassword || '');
    const recoveryCode = String(body?.recoveryCode || '');
    const masterKey = getAuthMasterKey(env);

    if (!email || !newPassword) {
      return badRequest('Email e nova senha são obrigatórios');
    }

    if (newPassword.length < 6) {
      return badRequest('A nova senha deve ter pelo menos 6 caracteres');
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return badRequest('As senhas não conferem');
    }

    if (!masterKey) {
      return json({ error: 'Recuperação por código indisponível. Contate o administrador.' }, 503);
    }

    if (recoveryCode !== masterKey) {
      return json({ error: 'Código de recuperação inválido' }, 403);
    }

    const user = await findUserByEmail(env, email);
    if (!user?.id) return json({ error: 'Usuário não encontrado' }, 404);

    const hashed = await bcrypt.hash(newPassword, 10);
    if (user.storage === 'columns') {
      await env.DB.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(hashed, user.id)
        .run();
    } else {
      await persistLegacyUser(env, user.id, {
        ...user.rawData,
        password: hashed
      });
    }

    return json({ message: 'Senha redefinida com sucesso' });
  }

  if (AUTH_ME_PATHS.has(path)) {
    if (method !== 'GET') return methodNotAllowed();

    const auth = await requireAuthContext(request, env);
    if (auth.response) return auth.response;

    return json({
      user: {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        role: auth.user.role,
        companyId: auth.user.companyId || null
      }
    });
  }

  if (AUTH_LOGOUT_PATHS.has(path)) {
    if (method !== 'POST') return methodNotAllowed();
    return json({ success: true });
  }

  return null;
};

export default {
  async fetch(request, env) {
    const origin = env.CORS_ORIGIN || '*';
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const segments = path.split('/').filter(Boolean);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    try {
      await ensureSchema(env);

      if (path === HEALTH_PATH) {
        const row = await env.DB.prepare('SELECT 1 AS ok').first();
        return withCors(
          json({
            status: 'ok',
            service: 'crmautomatizadob2g-api-cloudflare',
            db: row?.ok === 1 ? 'ok' : 'unknown',
            timestamp: nowIso()
          }),
          origin
        );
      }

      if (path === SETTINGS_PATH && request.method === 'GET') {
        return withCors(json(await getSettings(env)), origin);
      }

      const publicCheckoutOrLicensingResponse = await handlePublicCheckoutAndLicensing(request, env, path);
      if (publicCheckoutOrLicensingResponse) {
        return withCors(publicCheckoutOrLicensingResponse, origin);
      }

      const authPublicResponse = await handleAuthRoutes(request, env, path, url);
      if (authPublicResponse) {
        return withCors(authPublicResponse, origin);
      }

      // All routes below require auth.
      const auth = await requireAuthContext(request, env);
      if (auth.response) {
        return withCors(auth.response, origin);
      }
      env = withRequestScope(env, auth);
      const currentRole = normalizeRole(auth.user?.role);
      const isMasterSession = currentRole === 'MASTER';
      const canManageCompanySettings = isMasterSession || currentRole === 'ADMIN';

      if (
        (path === SETTINGS_PATH && (request.method === 'PUT' || request.method === 'PATCH')) ||
        (path === SETTINGS_LOGO_PATH && request.method === 'POST')
      ) {
        if (!canManageCompanySettings) {
          return withCors(json({ error: 'Acesso restrito ao usuário ADMIN ou MASTER' }, 403), origin);
        }
      }

      if (path === SETTINGS_PATH && (request.method === 'PUT' || request.method === 'PATCH')) {
        const body = asObject(await parseJsonBody(request));
        const updated = await updateSettings(env, body);
        return withCors(json(updated), origin);
      }

      if (path === SETTINGS_LOGO_PATH && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!(file instanceof File)) {
          return withCors(badRequest('Arquivo de logo não enviado'), origin);
        }

        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const dataUri = `data:${file.type || 'application/octet-stream'};base64,${uint8ToBase64(bytes)}`;
        const updated = await updateSettings(env, { logoUrl: dataUri });
        return withCors(json(updated), origin);
      }

      const first = segments[0] || '';
      const lowerFirst = first.toLowerCase();

      if (first === 'users' || (first === 'auth' && segments[1] === 'users')) {
        if (request.method !== 'GET' && !canManageCompanySettings) {
          return withCors(json({ error: 'Acesso restrito ao usuário ADMIN ou MASTER' }, 403), origin);
        }
        const userSegments =
          first === 'users'
            ? segments
            : ['users', ...segments.slice(2)];
        const response = await handleUsersRoutes(request, env, url, userSegments);
        return withCors(response, origin);
      }

      if (first === 'regions') {
        return withCors(await handleRegionsRoutes(request, env, url, segments), origin);
      }

      if (first === 'companies') {
        return withCors(await handleCompaniesRoutes(request, env, url, segments), origin);
      }

      if (first === 'clients') {
        return withCors(await handleClientsRoutes(request, env), origin);
      }

      if (first === 'opportunities') {
        return withCors(await handleOpportunitiesRoutes(request, env, url, segments, auth.user), origin);
      }

      if (first === 'activities-simple' || first === 'activities') {
        return withCors(await handleActivitiesRoutes(request, env, url, segments, auth.user), origin);
      }

      if (first === 'products') {
        return withCors(await handleProductsRoutes(request, env, url, segments), origin);
      }

      if (first === 'proposal-templates') {
        return withCors(await handleProposalTemplatesRoutes(request, env, url, segments), origin);
      }

      if (first === 'proposals') {
        return withCors(await handleProposalsRoutes(request, env, url, segments), origin);
      }

      if (first === 'contracts') {
        return withCors(await handleContractsRoutes(request, env, url, segments), origin);
      }

      if (first === 'post-sales') {
        return withCors(await handlePostSalesRoutes(request, env, url, segments, auth.user), origin);
      }

      if (lowerFirst === 'leadscoring') {
        return withCors(await handleLeadScoringRoutes(request, env, url), origin);
      }

      if (lowerFirst === 'leaddistribution') {
        return withCors(await handleLeadDistributionRoutes(request, env, url, auth.user), origin);
      }

      if (first === 'sales-targets') {
        return withCors(await handleSalesTargetsRoutes(request, env, url, segments), origin);
      }

      if (first === 'commissions') {
        return withCors(await handleCommissionsRoutes(request, env, url, segments), origin);
      }

      if (first === 'team-commissions') {
        return withCors(await handleTeamCommissionsRoutes(request, env, url), origin);
      }

      if (first === 'workflows') {
        return withCors(await handleWorkflowsRoutes(request, env, url, segments), origin);
      }

      if (first === 'advanced-workflows') {
        return withCors(await handleAdvancedWorkflowsRoutes(request, env, url, segments), origin);
      }

      if (first === 'integrations') {
        return withCors(await handleIntegrationsRoutes(request, env, url, segments), origin);
      }

      if (first === 'whatsapp') {
        return withCors(await handleWhatsappRoutes(request), origin);
      }

      if (first === 'email-marketing') {
        return withCors(await handleEmailMarketingRoutes(request, url), origin);
      }

      if (first === 'voip') {
        return withCors(await handleVoipRoutes(request, url), origin);
      }

      if (first === 'price-tables') {
        return withCors(await routeGenericModuleCrud(request, env, MODULES.PRICE_TABLES, segments[1]), origin);
      }

      if (first === 'competitors') {
        return withCors(await routeGenericModuleCrud(request, env, MODULES.COMPETITORS, segments[1]), origin);
      }

      if (first === 'cross-sell') {
        return withCors(await routeGenericModuleCrud(request, env, MODULES.CROSS_SELL, segments[1]), origin);
      }

      if (first === 'upsell') {
        return withCors(await routeGenericModuleCrud(request, env, MODULES.UPSELL, segments[1]), origin);
      }

      if (first === 'approvals') {
        return withCors(await routeGenericModuleCrud(request, env, MODULES.APPROVALS, segments[1]), origin);
      }

      if (first === 'solicitacoes') {
        return withCors(await handleSolicitacoesRoutes(request, env, auth.user, segments), origin);
      }

      if (first === 'pdf-generator') {
        return withCors(await handlePdfGeneratorRoutes(request, env, url, segments), origin);
      }

      if (first === 'dashboard') {
        return withCors(await handleDashboardRoutes(request, env, url), origin);
      }

      if (first === 'b2g') {
        return withCors(await handleB2GRoutes(request, env, url, segments, auth.user), origin);
      }

      if (first === 'ai-analysis') {
        return withCors(await handleAiAnalysisRoutes(request, env, url, segments), origin);
      }

      if (first === 'analyses' && segments[1] === 'saved') {
        return withCors(await handleSavedAnalysesRoutes(request, env, url, segments), origin);
      }

      return withCors(notFound(), origin);
    } catch (error) {
      return withCors(
        json({
          error: 'Internal error',
          message: error?.message || 'Unexpected error'
        }, 500),
        origin
      );
    }
  }
};
