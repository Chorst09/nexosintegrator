import getPrisma from './lib/prisma.js';
import { authenticateUser } from './lib/auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-company-id, x-user-id, x-user-role',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
};

const ALLOWED_SCOPE_ROLES = new Set(['master', 'admin', 'user']);

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    ...CORS_HEADERS,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const noContent = () => ({
  statusCode: 204,
  headers: CORS_HEADERS,
  body: ''
});

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
};

const normalizeHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' && value[0].trim().length > 0 ? value[0].trim() : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getHeader = (headers = {}, name) => {
  const wanted = String(name || '').toLowerCase();
  const found = Object.entries(headers).find(([key]) => String(key || '').toLowerCase() === wanted);
  return found ? found[1] : null;
};

const getRouteSegments = (eventPath = '', functionName = 'analyses') => {
  const candidates = [`/.netlify/functions/${functionName}`, `/api/${functionName}`];
  let normalized = String(eventPath || '');

  for (const prefix of candidates) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }

  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1);

  return normalized.split('/').filter(Boolean);
};

const getScopeFromHeaders = (headers = {}) => {
  const companyId = normalizeHeaderValue(getHeader(headers, 'x-company-id'));
  const userId = normalizeHeaderValue(getHeader(headers, 'x-user-id'));
  const roleRaw = (normalizeHeaderValue(getHeader(headers, 'x-user-role')) || 'user').toLowerCase();
  const role = ALLOWED_SCOPE_ROLES.has(roleRaw) ? roleRaw : 'user';

  if (!companyId || !userId) return null;
  return { companyId, userId, role };
};

const hasAccess = (record, scope) => {
  if (!record || !scope) return false;
  if (scope.role === 'master') return true;
  if (scope.role === 'admin') return record.companyId === scope.companyId;
  return record.companyId === scope.companyId && record.createdByUserId === scope.userId;
};

const buildListWhere = (scope) => {
  if (scope.role === 'master') return {};
  if (scope.role === 'admin') return { companyId: scope.companyId };
  return {
    companyId: scope.companyId,
    createdByUserId: scope.userId
  };
};

const parseSavePayload = (body = {}) => {
  const analysisId = typeof body.analysisId === 'string' ? body.analysisId.trim() : '';
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const processedAt = typeof body.processedAt === 'string' ? body.processedAt.trim() : '';

  if (!analysisId) return { error: 'analysisId obrigatorio.' };
  if (!fileName) return { error: 'fileName obrigatorio.' };
  if (!processedAt) return { error: 'processedAt obrigatorio.' };

  if (!body.extractedData || typeof body.extractedData !== 'object' || Array.isArray(body.extractedData)) {
    return { error: 'extractedData obrigatorio.' };
  }

  const analysisType = body.extractedData.analysisType;
  if (analysisType && analysisType !== 'edital' && analysisType !== 'tr') {
    return { error: 'extractedData.analysisType deve ser "edital" ou "tr".' };
  }

  return {
    analysisId,
    fileName,
    processedAt,
    extractedData: body.extractedData,
    originalFileDataUri:
      typeof body.originalFileDataUri === 'string' || body.originalFileDataUri === null
        ? body.originalFileDataUri
        : null,
    summaryPdfDataUri:
      typeof body.summaryPdfDataUri === 'string' || body.summaryPdfDataUri === null
        ? body.summaryPdfDataUri
        : null
  };
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const prisma = getPrisma();

  try {
    await authenticateUser(event.headers || {});

    const scope = getScopeFromHeaders(event.headers || {});
    if (!scope) {
      return json(401, { message: 'Headers x-company-id e x-user-id sao obrigatorios.' });
    }

    const segments = getRouteSegments(event.path, 'analyses');
    const method = event.httpMethod;

    if (segments[0] !== 'saved') {
      return json(404, { message: 'Rota não encontrada.' });
    }

    if (method === 'GET' && segments.length === 1) {
      const records = await prisma.savedAnalysis.findMany({
        where: buildListWhere(scope),
        orderBy: [{ createdAt: 'desc' }]
      });
      return json(200, records);
    }

    if (method === 'GET' && segments.length === 2) {
      const id = String(segments[1] || '').trim();
      if (!id) return json(400, { message: 'Id obrigatorio.' });

      const record = await prisma.savedAnalysis.findUnique({ where: { id } });
      if (!record || !hasAccess(record, scope)) {
        return json(404, { message: 'Registro nao encontrado.' });
      }

      return json(200, record);
    }

    if (method === 'POST' && segments.length === 1) {
      const body = parseBody(event);
      const parsed = parseSavePayload(body);
      if (parsed.error) {
        return json(400, { message: parsed.error });
      }

      const existing = await prisma.savedAnalysis.findFirst({
        where: {
          companyId: scope.companyId,
          analysisId: parsed.analysisId
        }
      });

      if (existing) {
        if (!hasAccess(existing, scope)) {
          return json(403, { message: 'Sem permissao para atualizar este registro.' });
        }

        const updated = await prisma.savedAnalysis.update({
          where: { id: existing.id },
          data: {
            fileName: parsed.fileName,
            processedAt: parsed.processedAt,
            extractedData: parsed.extractedData,
            originalFileDataUri: parsed.originalFileDataUri,
            summaryPdfDataUri: parsed.summaryPdfDataUri
          }
        });

        return json(200, updated);
      }

      const created = await prisma.savedAnalysis.create({
        data: {
          analysisId: parsed.analysisId,
          companyId: scope.companyId,
          createdByUserId: scope.userId,
          fileName: parsed.fileName,
          processedAt: parsed.processedAt,
          extractedData: parsed.extractedData,
          originalFileDataUri: parsed.originalFileDataUri,
          summaryPdfDataUri: parsed.summaryPdfDataUri
        }
      });

      return json(200, created);
    }

    if (method === 'DELETE' && segments.length === 2) {
      const id = String(segments[1] || '').trim();
      if (!id) return json(400, { message: 'Id obrigatorio.' });

      const record = await prisma.savedAnalysis.findUnique({ where: { id } });
      if (!record || !hasAccess(record, scope)) {
        return json(404, { message: 'Registro nao encontrado.' });
      }

      await prisma.savedAnalysis.delete({ where: { id } });
      return noContent();
    }

    return json(404, { message: 'Rota não encontrada.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao processar análises salvas.';
    const statusCode = /token/i.test(String(message)) ? 401 : 500;
    return json(statusCode, { message });
  }
}
