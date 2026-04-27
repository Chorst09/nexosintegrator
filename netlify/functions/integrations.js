import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { isMaster, normalizeRole } from './lib/permissions.js';

const ALLOWED_TYPES = new Set(['ERP', 'WHATSAPP', 'EMAIL_MARKETING', 'VOIP', 'API_EXTERNAL', 'WEBHOOK']);
const ALLOWED_PROVIDERS = new Set(['TOTVS', 'SAP', 'SENIOR', 'GENERIC_ERP', 'CUSTOM']);
const CRM_SCOPE = 'CRM_PLATFORM';

const CRM_PLATFORM_PRESETS = {
  zoho: { name: 'Zoho CRM', type: 'API_EXTERNAL', provider: 'CUSTOM' },
  bitrix24: { name: 'Bitrix24', type: 'API_EXTERNAL', provider: 'CUSTOM' },
  totvs: { name: 'TOTVS', type: 'ERP', provider: 'TOTVS' },
  ixc: { name: 'IXC Software', type: 'ERP', provider: 'GENERIC_ERP' },
  pipedrive: { name: 'Pipedrive', type: 'API_EXTERNAL', provider: 'CUSTOM' },
  hubspot: { name: 'HubSpot', type: 'API_EXTERNAL', provider: 'CUSTOM' }
};

const IXC_PATH_SUFFIXES = [
  '/',
  '/status',
  '/clientes',
  '/cliente',
  '/clientes?limit=1',
  '/cliente?limit=1'
];

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const cleanText = (value) => String(value || '').trim();

const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'sim', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'nao', 'não', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeType = (value, fallback = 'API_EXTERNAL') => {
  const upper = cleanText(value).toUpperCase();
  if (!upper || !ALLOWED_TYPES.has(upper)) return fallback;
  return upper;
};

const normalizeProvider = (value, fallback = 'CUSTOM') => {
  const upper = cleanText(value).toUpperCase();
  if (!upper || !ALLOWED_PROVIDERS.has(upper)) return fallback;
  return upper;
};

const parseJsonBody = (event) => {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
};

const parsePathSegments = (eventPath = '') => {
  const noQuery = String(eventPath || '').split('?')[0];
  const cleaned = noQuery
    .replace('/.netlify/functions/integrations', '')
    .replace('/api/integrations', '');
  return cleaned.split('/').filter(Boolean);
};

const hasAnyStringValue = (config) =>
  Object.values(asObject(config)).some((value) => typeof value === 'string' && value.trim().length > 0);

const sanitizePlatformConfig = (value) => {
  const source = asObject(value);
  const blockedKeys = new Set(['id', 'status', 'updatedAt', 'lastTestAt', 'lastTestMessage']);
  return Object.entries(source).reduce((acc, [key, val]) => {
    if (!key || blockedKeys.has(key)) return acc;
    if (val === undefined || val === null) return acc;
    acc[key] = typeof val === 'string' ? val.trim() : val;
    return acc;
  }, {});
};

const normalizeUrl = (value) => {
  const raw = cleanText(value);
  if (!raw) return '';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
};

const isCrmPlatformIntegration = (integration) => {
  const metadata = asObject(integration?.metadata);
  return String(metadata.scope || '').toUpperCase() === CRM_SCOPE;
};

const toCrmConfigPayload = (integration) => {
  const metadata = asObject(integration?.metadata);
  const config = asObject(integration?.config);

  return {
    id: integration.id,
    ...config,
    status: cleanText(metadata.status).toLowerCase() || 'disconnected',
    updatedAt: integration.updatedAt,
    lastTestAt: metadata.lastTestAt || null,
    lastTestMessage: metadata.lastTestMessage || null
  };
};

const listAllIntegrations = async (prisma) =>
  prisma.integration.findMany({
    include: {
      syncLogs: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    },
    orderBy: { name: 'asc' }
  });

const listCrmIntegrations = async (prisma) => {
  const rows = await prisma.integration.findMany({ orderBy: { updatedAt: 'desc' } });
  return rows.filter((item) => isCrmPlatformIntegration(item));
};

const findCrmIntegrationByPlatform = async (prisma, platformId) => {
  const platform = cleanText(platformId).toLowerCase();
  if (!platform) return null;

  const rows = await listCrmIntegrations(prisma);
  return rows.find((item) => {
    const metadata = asObject(item.metadata);
    return cleanText(metadata.platformId).toLowerCase() === platform;
  }) || null;
};

const ensureIntegrationsAccess = (user) => {
  const role = normalizeRole(user.actualRole || user.role);
  if (isMaster(user)) return;
  if (['ADMIN', 'MANAGER', 'DIRECTOR'].includes(role)) return;
  if (user?.permissions?.integrations) return;
  throw new Error('Acesso negado');
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const isUnauthorizedStatus = (status) => status === 401 || status === 403;

const isReachableStatus = (status) => status >= 200 && status < 500 && !isUnauthorizedStatus(status);

const buildIxcAuthCandidates = (config) => {
  const token = cleanText(config.apiToken);
  const user = cleanText(config.apiUser);
  const password = cleanText(config.apiPassword);

  const candidates = [];

  if (token) {
    candidates.push({
      label: 'Bearer',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Alguns ambientes IXC usam token em Basic.
    candidates.push({
      label: 'Basic token',
      headers: {
        Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`
      }
    });
  }

  if (user && password) {
    candidates.push({
      label: 'Basic user/pass',
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
      }
    });
  }

  if (user && token) {
    candidates.push({
      label: 'Basic user/token',
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`
      }
    });
  }

  if (candidates.length === 0) {
    candidates.push({ label: 'Sem autenticação', headers: {} });
  }

  return candidates;
};

const testIxcConnection = async (config) => {
  const baseUrl = normalizeUrl(config.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Informe uma Base URL válida do IXC para testar a conexão.');
  }

  const authCandidates = buildIxcAuthCandidates(config);
  const uniqueUrls = [...new Set(IXC_PATH_SUFFIXES.map((suffix) => `${baseUrl}${suffix}`.replace(/([^:]\/)\/+/, '$1')))] ;

  const errors = [];
  let unauthorizedCount = 0;

  for (const auth of authCandidates) {
    for (const endpoint of uniqueUrls) {
      try {
        const response = await fetchWithTimeout(
          endpoint,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...auth.headers
            }
          },
          12000
        );

        if (isUnauthorizedStatus(response.status)) {
          unauthorizedCount += 1;
          continue;
        }

        if (isReachableStatus(response.status)) {
          return {
            message: `Conexão com IXC validada (${response.status}) em ${endpoint}.`,
            details: {
              endpoint,
              statusCode: response.status,
              authStrategy: auth.label
            }
          };
        }
      } catch (err) {
        errors.push(err);
      }
    }
  }

  if (unauthorizedCount > 0 && unauthorizedCount >= authCandidates.length) {
    throw new Error('IXC respondeu com autenticação inválida (401/403). Revise token/usuário/senha.');
  }

  if (errors.length > 0) {
    throw new Error('Não foi possível alcançar a API do IXC. Verifique a Base URL e regras de rede/firewall.');
  }

  throw new Error('Falha ao validar conexão com IXC. Confirme endpoint e credenciais.');
};

const testGenericConnection = async (platformId, config) => {
  const baseUrl = normalizeUrl(config.apiBaseUrl || config.webhookUrl);
  if (!baseUrl) {
    if (!hasAnyStringValue(config)) {
      throw new Error('Preencha as credenciais antes de testar.');
    }

    return {
      message: `Configuração de ${platformId.toUpperCase()} validada. Endpoint não informado para teste remoto.`
    };
  }

  const token = cleanText(config.apiToken || config.apiKey);
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetchWithTimeout(baseUrl, { method: 'GET', headers }, 10000);
  if (isUnauthorizedStatus(response.status)) {
    throw new Error(`Credenciais inválidas para ${platformId.toUpperCase()} (${response.status}).`);
  }

  if (isReachableStatus(response.status)) {
    return {
      message: `Conexão com ${platformId.toUpperCase()} validada (${response.status}).`,
      details: { endpoint: baseUrl, statusCode: response.status }
    };
  }

  throw new Error(`Endpoint de ${platformId.toUpperCase()} indisponível (${response.status}).`);
};

const testPlatformConnection = async (platformId, config) => {
  if (platformId === 'ixc') {
    return testIxcConnection(config);
  }

  return testGenericConnection(platformId, config);
};

const saveCrmIntegration = async ({ prisma, platformId, config, status, message, userId }) => {
  const preset = CRM_PLATFORM_PRESETS[platformId];
  if (!preset) throw new Error('Plataforma CRM não suportada.');

  const existing = await findCrmIntegrationByPlatform(prisma, platformId);
  const nowIso = new Date().toISOString();

  const metadata = {
    ...(asObject(existing?.metadata)),
    scope: CRM_SCOPE,
    platformId,
    status,
    lastTestAt: nowIso,
    lastTestMessage: message || null,
    updatedBy: userId || null
  };

  const payload = {
    name: `Conector CRM - ${preset.name}`,
    type: preset.type,
    provider: preset.provider,
    config,
    metadata,
    isActive: true,
    apiKey: cleanText(config.apiToken || config.apiKey) || null,
    webhookUrl: cleanText(config.webhookUrl || '') || null,
    lastSync: null
  };

  const saved = existing
    ? await prisma.integration.update({ where: { id: existing.id }, data: payload })
    : await prisma.integration.create({ data: payload });

  return toCrmConfigPayload(saved);
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const segments = parsePathSegments(event.path);
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers);
    ensureIntegrationsAccess(user);

    // --- CRM platform configs ---
    if (segments[0] === 'crm-configs') {
      if (method === 'GET' && segments.length === 1) {
        const rows = await listCrmIntegrations(prisma);
        const payload = rows.reduce((acc, row) => {
          const metadata = asObject(row.metadata);
          const platformId = cleanText(metadata.platformId).toLowerCase();
          if (!platformId) return acc;
          acc[platformId] = toCrmConfigPayload(row);
          return acc;
        }, {});
        return success(payload);
      }

      const platformId = cleanText(segments[1]).toLowerCase();
      if (!platformId || !CRM_PLATFORM_PRESETS[platformId]) {
        return error('Plataforma CRM não encontrada.', 404);
      }

      if ((method === 'PUT' || method === 'PATCH') && segments.length === 2) {
        const body = parseJsonBody(event);
        const incoming = sanitizePlatformConfig(body.config || body);
        const resolvedStatus = cleanText(body.status).toLowerCase() || (hasAnyStringValue(incoming) ? 'pending' : 'disconnected');

        const savedConfig = await saveCrmIntegration({
          prisma,
          platformId,
          config: incoming,
          status: resolvedStatus,
          message: 'Configuração salva.',
          userId: user.id
        });

        return success(savedConfig);
      }

      if (method === 'POST' && segments[2] === 'test') {
        const body = parseJsonBody(event);
        const existing = await findCrmIntegrationByPlatform(prisma, platformId);
        const bodyConfig = sanitizePlatformConfig(body.config || body);
        const currentConfig = sanitizePlatformConfig(existing?.config || {});
        const mergedConfig = { ...currentConfig, ...bodyConfig };

        if (!hasAnyStringValue(mergedConfig)) {
          return error('Preencha as credenciais antes de testar.', 400);
        }

        try {
          const result = await testPlatformConnection(platformId, mergedConfig);
          const savedConfig = await saveCrmIntegration({
            prisma,
            platformId,
            config: mergedConfig,
            status: 'connected',
            message: result.message,
            userId: user.id
          });

          return success({
            ok: true,
            status: 'connected',
            message: result.message,
            details: result.details || null,
            savedConfig
          });
        } catch (testError) {
          const savedConfig = await saveCrmIntegration({
            prisma,
            platformId,
            config: mergedConfig,
            status: 'error',
            message: testError.message || 'Falha ao validar conexão.',
            userId: user.id
          });

          return error(testError.message || 'Falha ao testar conexão.', 400, { savedConfig });
        }
      }

      return error('Rota de configuração CRM não encontrada.', 404);
    }

    // --- Custom integrations CRUD ---
    if (method === 'GET') {
      const rows = await listAllIntegrations(prisma);
      const type = cleanText(qs.type).toUpperCase();
      const hasActiveFilter = qs.active !== undefined;
      const activeFilter = hasActiveFilter ? toBool(qs.active, true) : null;

      const filtered = rows.filter((item) => {
        if (isCrmPlatformIntegration(item)) return false;
        if (type && String(item.type || '').toUpperCase() !== type) return false;
        if (hasActiveFilter && Boolean(item.isActive) !== activeFilter) return false;
        return true;
      });

      return success(filtered);
    }

    if (method === 'POST') {
      const body = parseJsonBody(event);

      const created = await prisma.integration.create({
        data: {
          name: cleanText(body.name) || 'Integração sem nome',
          type: normalizeType(body.type, 'WEBHOOK'),
          provider: normalizeProvider(body.provider, 'CUSTOM'),
          config: asObject(body.config),
          isActive: body.isActive === undefined ? true : toBool(body.isActive, true),
          apiKey: cleanText(body.apiKey) || null,
          webhookUrl: cleanText(body.webhookUrl) || null,
          metadata: asObject(body.metadata),
          lastSync: body.lastSync ? new Date(body.lastSync) : null
        }
      });

      return success(created, 201);
    }

    if (method === 'PUT' || method === 'PATCH') {
      const body = parseJsonBody(event);
      const id = cleanText(segments[0] || body.id);
      if (!id) return error('ID obrigatório', 400);

      const current = await prisma.integration.findUnique({ where: { id } });
      if (!current) return error('Integração não encontrada', 404);

      if (isCrmPlatformIntegration(current)) {
        return error('Esta integração é gerenciada pelo módulo CRM e deve ser editada por /crm-configs.', 400);
      }

      const updated = await prisma.integration.update({
        where: { id },
        data: {
          name: body.name !== undefined ? cleanText(body.name) || current.name : undefined,
          type: body.type !== undefined ? normalizeType(body.type, current.type) : undefined,
          provider: body.provider !== undefined ? normalizeProvider(body.provider, current.provider) : undefined,
          config: body.config !== undefined ? asObject(body.config) : undefined,
          isActive: body.isActive !== undefined ? toBool(body.isActive, Boolean(current.isActive)) : undefined,
          apiKey: body.apiKey !== undefined ? cleanText(body.apiKey) || null : undefined,
          webhookUrl: body.webhookUrl !== undefined ? cleanText(body.webhookUrl) || null : undefined,
          metadata: body.metadata !== undefined ? asObject(body.metadata) : undefined,
          lastSync: body.lastSync !== undefined ? (body.lastSync ? new Date(body.lastSync) : null) : undefined
        }
      });

      return success(updated);
    }

    if (method === 'DELETE') {
      const body = parseJsonBody(event);
      const id = cleanText(segments[0] || body.id);
      if (!id) return error('ID obrigatório', 400);

      const current = await prisma.integration.findUnique({ where: { id } });
      if (!current) return error('Integração não encontrada', 404);

      if (isCrmPlatformIntegration(current)) {
        return error('Esta integração é gerenciada pelo módulo CRM e não pode ser removida por esta rota.', 400);
      }

      await prisma.integration.delete({ where: { id } });
      return success({ success: true });
    }

    return error('Método não permitido', 405);
  } catch (err) {
    return error(err.message || 'Erro interno', 500);
  }
}
