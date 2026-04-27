import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { isMaster } from './lib/permissions.js';
import {
  buildCompanyClientTypeWhere,
  inferCompanyClientType,
  isCompanyInClientType,
  normalizeClientType
} from './lib/business-model.js';

const extractUnknownArgument = (err) => {
  const message = String(err?.message || '');
  const match = message.match(/Unknown argument `([^`]+)`/);
  return match?.[1] || null;
};

const isSchemaDriftError = (err) => {
  const code = String(err?.code || '').toUpperCase();
  if (code === 'P2021' || code === 'P2022') return true;

  const message = String(err?.message || '');
  return (
    /Unknown argument/i.test(message) ||
    /Unknown field/i.test(message) ||
    /does not exist/i.test(message) ||
    /Cannot read properties of undefined/i.test(message)
  );
};

const runOptionalCleanup = async (operation) => {
  try {
    await operation();
  } catch (err) {
    if (!isSchemaDriftError(err)) throw err;
  }
};

const findManyCompaniesWithFallback = async (prisma, baseWhere) => {
  const where = { ...(baseWhere || {}) };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.company.findMany({
        where,
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          _count: { select: { opportunities: true } }
        },
        orderBy: { name: 'asc' }
      });
    } catch (err) {
      const unknownArg = extractUnknownArgument(err);
      if (!unknownArg || !(unknownArg in where)) throw err;
      delete where[unknownArg];
    }
  }

  throw new Error('Falha ao listar empresas por incompatibilidade de schema');
};

const createCompanyWithFallback = async (prisma, baseData) => {
  const data = { ...(baseData || {}) };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await prisma.company.create({
        data,
        include: { contacts: true }
      });
    } catch (err) {
      const unknownArg = extractUnknownArgument(err);
      if (!unknownArg || !(unknownArg in data)) throw err;
      delete data[unknownArg];
    }
  }

  throw new Error('Falha ao criar empresa por incompatibilidade de schema');
};

const updateCompanyWithFallback = async (prisma, id, baseData) => {
  const data = { ...(baseData || {}) };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await prisma.company.update({
        where: { id },
        data,
        include: { contacts: true }
      });
    } catch (err) {
      const unknownArg = extractUnknownArgument(err);
      if (!unknownArg || !(unknownArg in data)) throw err;
      delete data[unknownArg];
    }
  }

  throw new Error('Falha ao atualizar empresa por incompatibilidade de schema');
};

const extractPathId = (pathValue) => {
  const normalized = String(pathValue || '')
    .replace(/^\/+/, '')
    .trim();

  if (!normalized) return null;
  return decodeURIComponent(normalized.split('/')[0] || '');
};

const resolveCompanyId = ({ path = '', query = {}, body = null } = {}) => {
  const queryId = typeof query?.id === 'string' && query.id.trim()
    ? query.id.trim()
    : null;
  const pathId = extractPathId(path);
  const bodyId = typeof body?.id === 'string' && body.id.trim()
    ? body.id.trim()
    : null;

  return pathId || queryId || bodyId || null;
};

const deleteCompanyWithCleanup = async (prisma, companyId) => {
  // Ambiente serverless + pgbouncer pode falhar com transações interativas (P2028).
  // Aqui usamos sequência explícita para manter o fluxo estável em produção.
  const companyOpportunities = await prisma.opportunity.findMany({
    where: { companyId },
    select: { id: true }
  });
  const opportunityIds = companyOpportunities.map((item) => item.id);

  if (opportunityIds.length > 0) {
    await runOptionalCleanup(() => prisma.preSalesRequest.updateMany({
      where: { opportunityId: { in: opportunityIds } },
      data: { opportunityId: null }
    }));

    await runOptionalCleanup(() => prisma.commission.deleteMany({
      where: { opportunityId: { in: opportunityIds } }
    }));

    await runOptionalCleanup(() => prisma.competitorComparison.deleteMany({
      where: { opportunityId: { in: opportunityIds } }
    }));

    await runOptionalCleanup(async () => {
      const proposals = await prisma.proposal.findMany({
        where: { opportunityId: { in: opportunityIds } },
        select: { id: true }
      });
      const proposalIds = proposals.map((item) => item.id);

      if (proposalIds.length > 0) {
        await prisma.proposalItem.deleteMany({
          where: { proposalId: { in: proposalIds } }
        });
      }

      await prisma.proposal.deleteMany({
        where: { opportunityId: { in: opportunityIds } }
      });
    });

    await prisma.activity.updateMany({
      where: { opportunityId: { in: opportunityIds } },
      data: { opportunityId: null }
    });

    await runOptionalCleanup(() => prisma.opportunityProduct.deleteMany({
      where: { opportunityId: { in: opportunityIds } }
    }));

    await runOptionalCleanup(() => prisma.integrationOrder.updateMany({
      where: { opportunityId: { in: opportunityIds } },
      data: { opportunityId: null }
    }));

    await prisma.opportunity.deleteMany({
      where: { id: { in: opportunityIds } }
    });
  }

  await runOptionalCleanup(async () => {
    const companyContracts = await prisma.contract.findMany({
      where: { companyId },
      select: { id: true }
    });
    const contractIds = companyContracts.map((item) => item.id);

    if (contractIds.length === 0) return;

    await runOptionalCleanup(() => prisma.customerOnboarding.updateMany({
      where: { contractId: { in: contractIds } },
      data: { contractId: null }
    }));

    await runOptionalCleanup(() => prisma.nPSSurvey.updateMany({
      where: { contractId: { in: contractIds } },
      data: { contractId: null }
    }));

    await runOptionalCleanup(() => prisma.contractAttachment.deleteMany({
      where: { contractId: { in: contractIds } }
    }));

    await prisma.contract.deleteMany({
      where: { id: { in: contractIds } }
    });
  });

  await prisma.activity.updateMany({
    where: { companyId },
    data: { companyId: null }
  });

  await prisma.contact.deleteMany({
    where: { companyId }
  });

  await runOptionalCleanup(() => prisma.integrationOrder.updateMany({
    where: { companyId },
    data: { companyId: null }
  }));

  await runOptionalCleanup(() => prisma.supportTicket.updateMany({
    where: { companyId },
    data: { companyId: null }
  }));

  await runOptionalCleanup(() => prisma.nPSSurvey.updateMany({
    where: { companyId },
    data: { companyId: null }
  }));

  await runOptionalCleanup(() => prisma.preSalesRequest.updateMany({
    where: { leadId: companyId },
    data: { leadId: null }
  }));

  await runOptionalCleanup(() => prisma.onboardingStep.deleteMany({
    where: {
      onboarding: {
        companyId
      }
    }
  }));

  await runOptionalCleanup(() => prisma.customerOnboarding.deleteMany({
    where: { companyId }
  }));

  await runOptionalCleanup(() => prisma.churnAlert.deleteMany({
    where: { companyId }
  }));

  await runOptionalCleanup(() => prisma.companyDocument.deleteMany({
    where: { companyId }
  }));

  await prisma.company.delete({
    where: { id: companyId }
  });
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/companies', '').replace('/api/companies', '');
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers);

    if (method === 'GET') {
      // Busca por ID via query param
      const companyId = resolveCompanyId({ path, query: qs });
      if (companyId) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          include: { contacts: true, _count: { select: { opportunities: true } } }
        });
        if (!company) return success([]);

        const hydrated = {
          ...company,
          clientType: inferCompanyClientType(company)
        };
        if (qs.clientType && !isCompanyInClientType(hydrated, qs.clientType)) {
          return success([]);
        }
        return success([hydrated]);
      }

      const filters = [];
      if (!isMaster(user) && user.tenantCompanyId) {
        filters.push({ tenantCompanyId: user.tenantCompanyId });
      }

      const clientTypeFilter = buildCompanyClientTypeWhere(qs.clientType);
      if (clientTypeFilter) filters.push(clientTypeFilter);

      const where = filters.length === 0
        ? {}
        : (filters.length === 1 ? filters[0] : { AND: filters });

      const companies = await findManyCompaniesWithFallback(prisma, where);
      return success(
        companies.map((item) => ({
          ...item,
          clientType: inferCompanyClientType(item)
        }))
      );
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name) return error('Nome é obrigatório', 400);

      const normalizedClientType = normalizeClientType(body.clientType);
      const inferredClientType = normalizedClientType || inferCompanyClientType(body, 'B2B');

      const company = await createCompanyWithFallback(prisma, {
        name: body.name, document: body.document, segment: body.segment,
        clientType: inferredClientType, size: body.size,
        website: body.website, address: body.address, city: body.city,
        state: body.state, country: body.country || 'Brasil',
        regionId: body.regionId || null, status: body.status || 'LEAD',
        tenantCompanyId: user.tenantCompanyId || null,
        contacts: body.contactName ? {
          create: { name: body.contactName, email: body.contactEmail || null, phone: body.contactPhone || null, isPrimary: true }
        } : undefined
      });
      return success(
        {
          ...company,
          clientType: inferCompanyClientType(company)
        },
        201
      );
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const id = resolveCompanyId({ path, query: qs, body });
      if (!id) return error('ID da empresa é obrigatório', 400);

      const { contactName, contactEmail, contactPhone, ...companyData } = body;
      delete companyData.id;

      if (companyData.clientType !== undefined) {
        const normalized = normalizeClientType(companyData.clientType);
        if (normalized) companyData.clientType = normalized;
        else delete companyData.clientType;
      } else if (companyData.segment !== undefined) {
        const inferredBySegment = inferCompanyClientType({ segment: companyData.segment }, null);
        if (inferredBySegment) companyData.clientType = inferredBySegment;
      }

      const company = await updateCompanyWithFallback(prisma, id, companyData);
      return success({
        ...company,
        clientType: inferCompanyClientType(company)
      });
    }

    if (method === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const id = resolveCompanyId({ path, query: qs, body });
      if (!id) return error('ID da empresa é obrigatório', 400);

      const existingCompany = await prisma.company.findUnique({
        where: { id },
        select: { id: true, name: true }
      });
      if (!existingCompany) return error('Empresa não encontrada', 404);

      try {
        await deleteCompanyWithCleanup(prisma, id);
      } catch (err) {
        const errorCode = String(err?.code || '').toUpperCase();
        if (errorCode === 'P2003') {
          return error('Não foi possível excluir: a empresa possui vínculos ativos em outros módulos.', 409);
        }
        if (errorCode === 'P2028') {
          return error('Não foi possível concluir a exclusão agora. Tente novamente em alguns segundos.', 503);
        }
        throw err;
      }

      return success({ message: 'Empresa removida' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em companies:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
