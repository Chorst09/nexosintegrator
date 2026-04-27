import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { isMaster, normalizeRole } from './lib/permissions.js';
import {
  inferOpportunityClientType,
  isCompanyInClientType,
  isOpportunityInClientType,
  normalizeClientType
} from './lib/business-model.js';

const isSchemaDriftError = (err) => {
  const code = String(err?.code || '').toUpperCase();
  if (code === 'P2021' || code === 'P2022') return true;

  const message = String(err?.message || '');
  return (
    /tenantCompanyId/i.test(message) &&
    (/column/i.test(message) || /invocation/i.test(message) || /Unknown arg/i.test(message))
  );
};

const OPPORTUNITY_INCLUDE_DEFAULT = {
  company: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
  owner: { select: { id: true, name: true, email: true } },
  products: { include: { product: true } },
  activities: { orderBy: { createdAt: 'desc' }, take: 3 },
  commission: true
};

const OPPORTUNITY_INCLUDE_DETAIL = {
  ...OPPORTUNITY_INCLUDE_DEFAULT,
  activities: { orderBy: { createdAt: 'desc' }, take: 5 }
};

const COMPANY_SCOPE_SELECT = { id: true, tenantCompanyId: true, clientType: true, segment: true };
const COMPANY_SCOPE_SELECT_LEGACY = { id: true, clientType: true, segment: true };

const fetchCompanyForScope = async (prisma, id) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id },
      select: COMPANY_SCOPE_SELECT
    });
    return { company, tenantScopeSupported: true };
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
    const company = await prisma.company.findUnique({
      where: { id },
      select: COMPANY_SCOPE_SELECT_LEGACY
    });
    return { company, tenantScopeSupported: false };
  }
};

const buildWhereClause = ({ stage, ownerId, role, user, includeTenantFilter }) => {
  const filters = [];
  if (stage) filters.push({ stage });
  if (ownerId) filters.push({ ownerId });
  if (role === 'SELLER') filters.push({ ownerId: user.id });

  if (includeTenantFilter && !isMaster(user) && user.tenantCompanyId) {
    filters.push({ company: { tenantCompanyId: user.tenantCompanyId } });
  }

  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
  return { AND: filters };
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = String(event.path || '')
    .split('?')[0]
    .replace('/.netlify/functions/opportunities', '')
    .replace('/api/opportunities', '');
  const qs = event.queryStringParameters || {};
  const pathId = path.startsWith('/') && path.length > 1
    ? decodeURIComponent(path.substring(1)).trim()
    : '';

  try {
    const user = await authenticateUser(event.headers);
    const role = normalizeRole(user.actualRole || user.role);

    if (method === 'GET') {
      // GET /:id
      if (path.startsWith('/') && path.length > 1) {
        const id = pathId;
        const opp = await prisma.opportunity.findUnique({
          where: { id },
          include: OPPORTUNITY_INCLUDE_DETAIL
        });
        if (!opp) return error('Oportunidade não encontrada', 404);

        if (qs.clientType && !isOpportunityInClientType(opp, qs.clientType, opp.company || null)) {
          return error('Oportunidade não encontrada', 404);
        }

        return success({
          ...opp,
          clientType: inferOpportunityClientType(opp, opp.company || null)
        });
      }

      const baseWhere = buildWhereClause({
        stage: qs.stage,
        ownerId: qs.ownerId,
        role,
        user,
        includeTenantFilter: true
      });

      let opportunities;
      try {
        opportunities = await prisma.opportunity.findMany({
          where: baseWhere,
          include: OPPORTUNITY_INCLUDE_DEFAULT,
          orderBy: [{ stage: 'asc' }, { expectedCloseDate: 'asc' }]
        });
      } catch (err) {
        if (!isSchemaDriftError(err)) throw err;

        // Banco legado sem Company.tenantCompanyId: reexecuta sem filtro de tenant.
        const fallbackWhere = buildWhereClause({
          stage: qs.stage,
          ownerId: qs.ownerId,
          role,
          user,
          includeTenantFilter: false
        });
        opportunities = await prisma.opportunity.findMany({
          where: fallbackWhere,
          include: OPPORTUNITY_INCLUDE_DEFAULT,
          orderBy: [{ stage: 'asc' }, { expectedCloseDate: 'asc' }]
        });
      }
      const normalizedClientType = normalizeClientType(qs.clientType);
      const rows = opportunities
        .map((item) => ({
          ...item,
          clientType: inferOpportunityClientType(item, item.company || null)
        }))
        .filter((item) =>
          !normalizedClientType || isOpportunityInClientType(item, normalizedClientType, item.company || null)
        );

      return success(rows);
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const title = String(body.title || '').trim();
      const companyId = String(body.companyId || '').trim();
      const numericValue = Number(body.value);
      const requestedClientType = normalizeClientType(body.clientType || qs.clientType);

      if (!title || !companyId || !Number.isFinite(numericValue)) {
        return error('Título, empresa e valor são obrigatórios', 400);
      }

      const { company, tenantScopeSupported } = await fetchCompanyForScope(prisma, companyId);
      if (!company) return error('Empresa não encontrada', 404);

      if (
        tenantScopeSupported &&
        !isMaster(user) &&
        user.tenantCompanyId &&
        String(company.tenantCompanyId || '') !== String(user.tenantCompanyId)
      ) {
        return error('Empresa fora do escopo do usuário', 403);
      }

      if (requestedClientType && !isCompanyInClientType(company, requestedClientType)) {
        return error(`A empresa selecionada não pertence ao pipeline ${requestedClientType}.`, 400);
      }

      if (body.b2gStage && !isCompanyInClientType(company, 'B2G')) {
        return error('Não é permitido definir etapa B2G para empresa que não é B2G.', 400);
      }

      const opp = await prisma.opportunity.create({
        data: {
          title,
          description: body.description,
          value: numericValue,
          probability: body.probability || 50,
          stage: body.stage || 'LEAD',
          source: body.source,
          expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
          companyId,
          ownerId: body.ownerId || user.id,
          projectName: body.projectName,
          projectClientType: body.projectClientType,
          b2gStage: body.b2gStage ? String(body.b2gStage).toUpperCase() : null
        },
        include: {
          company: true,
          owner: { select: { id: true, name: true } }
        }
      });
      return success(
        {
          ...opp,
          clientType: inferOpportunityClientType(opp, opp.company || null)
        },
        201
      );
    }

    if (method === 'PUT' && path.startsWith('/')) {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (parseErr) {
        console.error('Erro ao parsear body do PUT:', parseErr.message);
        return error('Body JSON inválido', 400);
      }
      console.log('[PUT] body keys:', Object.keys(body));
      console.log('[PUT] body.source:', body.source, '| body.stage:', body.stage, '| body.b2gStage:', body.b2gStage);
      const id = String(body.id || pathId || '').trim();
      if (!id) return error('ID da oportunidade não informado', 400);
      const requestedClientType = normalizeClientType(body.clientType || qs.clientType);

      // Extrair apenas campos válidos do schema Opportunity
      const VALID_FIELDS = new Set([
        'title', 'projectName', 'projectClientType', 'description', 'value',
        'probability', 'stage', 'b2gStage', 'source', 'expectedCloseDate',
        'actualCloseDate', 'lossReason', 'companyId', 'ownerId'
      ]);

      const data = {};
      for (const [key, val] of Object.entries(body)) {
        if (VALID_FIELDS.has(key) && val !== undefined) {
          data[key] = val;
        }
      }

      // Garantir que description seja sempre string
      if (data.description !== undefined && typeof data.description !== 'string') {
        data.description = JSON.stringify(data.description);
      }
      // Truncar description se muito longa (Postgres TEXT suporta, mas evitar problemas)
      if (typeof data.description === 'string' && data.description.length > 50000) {
        data.description = data.description.slice(0, 50000);
      }

      if (data.value !== undefined) {
        const parsed = parseFloat(data.value);
        data.value = Number.isFinite(parsed) ? parsed : 0;
      }
      if (data.probability !== undefined) {
        const parsed = parseInt(data.probability);
        data.probability = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 50;
      }
      if (data.expectedCloseDate) {
        const d = new Date(data.expectedCloseDate);
        data.expectedCloseDate = isNaN(d.getTime()) ? null : d;
      } else if (data.expectedCloseDate === '' || data.expectedCloseDate === null) {
        data.expectedCloseDate = null;
      }
      if (data.actualCloseDate) {
        const d = new Date(data.actualCloseDate);
        data.actualCloseDate = isNaN(d.getTime()) ? null : d;
      } else if (data.actualCloseDate === '' || data.actualCloseDate === null) {
        data.actualCloseDate = null;
      }
      if (data.b2gStage !== undefined) {
        data.b2gStage = data.b2gStage ? String(data.b2gStage).toUpperCase() : null;
      }
      // Enums: garantir null em vez de string vazia
      if (data.source === '' || data.source === null) delete data.source;
      if (data.stage === '' || data.stage === null) delete data.stage;
      if (data.lossReason === '') data.lossReason = null;

      const current = await prisma.opportunity.findUnique({
        where: { id },
        select: { id: true, companyId: true }
      });
      if (!current) return error('Oportunidade não encontrada', 404);

      const targetCompanyId = String(data.companyId || current.companyId || '').trim();
      if (!targetCompanyId) return error('Empresa da oportunidade inválida', 400);

      const { company: targetCompany, tenantScopeSupported } = await fetchCompanyForScope(prisma, targetCompanyId);
      if (!targetCompany) return error('Empresa da oportunidade não encontrada', 404);

      if (
        tenantScopeSupported &&
        !isMaster(user) &&
        user.tenantCompanyId &&
        String(targetCompany.tenantCompanyId || '') !== String(user.tenantCompanyId)
      ) {
        return error('Empresa fora do escopo do usuário', 403);
      }

      if (requestedClientType && !isCompanyInClientType(targetCompany, requestedClientType)) {
        // Log para debug — não bloquear se empresa B2G criada automaticamente
        console.warn('[opportunities PUT] clientType mismatch:', {
          requestedClientType,
          companyClientType: targetCompany?.clientType,
          companySegment: targetCompany?.segment
        });
        // Só bloqueia se a empresa for explicitamente B2B e o pipeline for B2G
        const companyIsExplicitlyB2B = String(targetCompany?.clientType || '').toUpperCase() === 'B2B';
        const pipelineIsB2G = requestedClientType === 'B2G';
        if (companyIsExplicitlyB2B && pipelineIsB2G) {
          return error(`A empresa selecionada não pertence ao pipeline ${requestedClientType}.`, 400);
        }
      }

      if (data.b2gStage && !isCompanyInClientType(targetCompany, 'B2G')) {
        // Só bloqueia se empresa for explicitamente B2B
        const companyIsExplicitlyB2B = String(targetCompany?.clientType || '').toUpperCase() === 'B2B';
        if (companyIsExplicitlyB2B) {
          return error('Não é permitido definir etapa B2G para empresa que não é B2G.', 400);
        }
      }

      console.log('[opportunities PUT] data keys:', Object.keys(data));
      console.log('[opportunities PUT] data.value:', data.value, typeof data.value);
      console.log('[opportunities PUT] data.stage:', data.stage);
      console.log('[opportunities PUT] data.source:', data.source);
      let opp;
      try {
        opp = await prisma.opportunity.update({
          where: { id },
          data,
          include: {
            company: true,
            owner: { select: { id: true, name: true } }
          }
        });
      } catch (prismaErr) {
        console.error('[opportunities PUT] Prisma error:', prismaErr.message);
        console.error('[opportunities PUT] data enviado:', JSON.stringify(data));
        // Retorna o data para debug
        return error(`Prisma error: ${prismaErr.message} | data keys: ${Object.keys(data).join(',')}`, 500);
      }
      return success({
        ...opp,
        clientType: inferOpportunityClientType(opp, opp.company || null)
      });
    }

    if (method === 'DELETE' && path.startsWith('/')) {
      const body = JSON.parse(event.body || '{}');
      const id = String(body.id || pathId || '').trim();
      if (!id) return error('ID da oportunidade não informado', 400);
      await prisma.opportunity.delete({ where: { id } });
      return success({ message: 'Oportunidade removida' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em opportunities:', err);
    console.error('Erro code:', err?.code);
    console.error('Erro meta:', JSON.stringify(err?.meta || {}));
    const message = String(err?.message || 'Erro interno');
    if (message === 'Token não fornecido' || message === 'Token inválido' || message === 'Usuário não encontrado') {
      return error(message, 401);
    }
    if (message === 'Acesso negado') {
      return error(message, 403);
    }
    // Retorna mensagem detalhada para facilitar debug
    const detail = err?.meta ? ` [${JSON.stringify(err.meta)}]` : '';
    const dataKeys = err?.message?.includes('invocation') ? ` | Verifique os campos enviados` : '';
    return error(message + detail + dataKeys, 500);
  }
}
