import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { normalizeRole } from './lib/permissions.js';

const ACTIVITY_FLOW_MARKER = '[CRM_ACTIVITY_FLOW]';
const PRE_SALES_TARGET = 'PRE_VENDAS';

const normalizeFlowArea = (value, fallback = 'COMERCIAL') => {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!raw) return fallback;
  if (raw === 'PREVENDAS') return PRE_SALES_TARGET;
  if (raw === 'B2B_PRIVADO') return 'B2B';
  if (raw === 'B2G_GOVERNO') return 'B2G';
  return raw;
};

const getRouteSegments = (eventPath = '', functionName = 'activities-simple') => {
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

const parseFlowFromDescription = (description) => {
  const value = String(description || '');
  const markerIdx = value.indexOf(ACTIVITY_FLOW_MARKER);
  if (markerIdx < 0) {
    return {
      hasMarker: false,
      cleanDescription: value.trim(),
      flow: {
        sourceArea: 'COMERCIAL',
        targetArea: 'COMERCIAL',
        createdFrom: 'LEGACY'
      }
    };
  }

  const cleanDescription = value.slice(0, markerIdx).trim();
  const raw = value.slice(markerIdx + ACTIVITY_FLOW_MARKER.length).trim();
  let flow = {};
  try {
    flow = JSON.parse(raw);
  } catch {
    flow = {};
  }

  return {
    hasMarker: true,
    cleanDescription,
    flow: {
      sourceArea: flow?.sourceArea || 'COMERCIAL',
      targetArea: flow?.targetArea || 'COMERCIAL',
      createdFrom: flow?.createdFrom || 'ATIVIDADES',
      createdByName: flow?.createdByName || ''
    }
  };
};

const generatePreSalesNumber = async (prisma) => {
  const year = new Date().getFullYear();
  const prefix = `PRE-${year}-`;
  const latest = await prisma.preSalesRequest.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { numero: true }
  });

  const current = Number((latest?.numero || '').split('-').pop() || 0);
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const segments = getRouteSegments(event.path, 'activities-simple');
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers || {});
    const role = normalizeRole(user.actualRole || user.role);

    if (method === 'GET') {
      const where = {};

      if (qs.status) where.status = qs.status;
      if (qs.type) where.type = qs.type;
      if (qs.priority) where.priority = qs.priority;
      if (qs.userId) where.assignedToId = qs.userId;
      if (role === 'SELLER') where.assignedToId = user.id;

      const activities = await prisma.activity.findMany({
        where,
        include: {
          company: true,
          opportunity: true,
          assignedTo: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
      });

      return success(activities);
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const parsedDescription = parseFlowFromDescription(body.description || '');
      const explicitSourceArea = normalizeFlowArea(body.sourceArea, '');
      const explicitTargetArea = normalizeFlowArea(body.targetArea, '');
      const shouldInjectFlowMetadata = !parsedDescription.hasMarker && (explicitSourceArea || explicitTargetArea);
      const finalFlow = {
        sourceArea: normalizeFlowArea(
          parsedDescription.hasMarker ? parsedDescription.flow.sourceArea : explicitSourceArea,
          'COMERCIAL'
        ),
        targetArea: normalizeFlowArea(
          parsedDescription.hasMarker ? parsedDescription.flow.targetArea : explicitTargetArea,
          'COMERCIAL'
        ),
        createdFrom: parsedDescription.hasMarker ? parsedDescription.flow.createdFrom : 'ATIVIDADES',
        createdByName: parsedDescription.hasMarker
          ? parsedDescription.flow.createdByName
          : (body.createdByName || user.name || '')
      };

      const descriptionWithFlow = shouldInjectFlowMetadata
        ? `${String(body.description || '').trim()}\n\n${ACTIVITY_FLOW_MARKER}${JSON.stringify({
          ...finalFlow,
          createdAt: new Date().toISOString()
        })}`
        : (body.description || '');

      const requestedAssignedToId = String(body.assignedToId || '').trim();
      let assignedToId = user.id;

      if (role === 'SELLER') {
        assignedToId = user.id;
      } else if (requestedAssignedToId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: requestedAssignedToId },
          select: { id: true }
        });

        assignedToId = assignedUser?.id || user.id;
      }

      const activity = await prisma.activity.create({
        data: {
          type: body.type || 'TASK',
          subject: body.subject || 'Sem título',
          description: descriptionWithFlow,
          status: 'PENDING',
          priority: body.priority || 'MEDIUM',
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          companyId: body.companyId && String(body.companyId).trim() ? String(body.companyId).trim() : null,
          opportunityId:
            body.opportunityId && String(body.opportunityId).trim() ? String(body.opportunityId).trim() : null,
          assignedToId
        },
        include: {
          company: true,
          opportunity: true,
          assignedTo: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      let generatedPreSalesRequestId = null;
      const parsedFlow = parseFlowFromDescription(activity.description);
      const sourceArea = normalizeFlowArea(parsedFlow.flow.sourceArea, finalFlow.sourceArea);
      const targetArea = normalizeFlowArea(parsedFlow.flow.targetArea, finalFlow.targetArea);
      const shouldCreatePreSalesRequest =
        targetArea === PRE_SALES_TARGET &&
        sourceArea !== PRE_SALES_TARGET;

      if (shouldCreatePreSalesRequest) {
        try {
          const activityMarker = `[FLOW_ACTIVITY_ID:${activity.id}]`;
          const existing = await prisma.preSalesRequest.findFirst({
            where: {
              observacoes: {
                contains: activityMarker
              }
            },
            select: { id: true }
          });

          if (!existing) {
            const numero = await generatePreSalesNumber(prisma);
            const request = await prisma.preSalesRequest.create({
              data: {
                numero,
                titulo: activity.subject || 'Solicitação do Comercial',
                descricao: parsedFlow.cleanDescription || activity.description || 'Solicitação recebida via atividade',
                status: 'NOVA',
                prioridade: activity.priority || 'MEDIUM',
                tiposPrecificacao: ['SERVICOS'],
                observacoes: [
                  activityMarker,
                  `Origem: ${sourceArea}`,
                  `Destino: ${targetArea}`,
                  'Solicitação gerada automaticamente a partir de atividade.'
                ].join('\n'),
                solicitanteId: user.id,
                leadId: activity.companyId || null,
                opportunityId: activity.opportunityId || null
              },
              select: { id: true }
            });
            generatedPreSalesRequestId = request.id;
          }
        } catch (preSalesError) {
          console.error('Erro ao gerar solicitação automática de pré-vendas:', preSalesError);
        }
      }

      return success({ success: true, activity, generatedPreSalesRequestId }, 201);
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const id = String(body.id || segments[0] || '').trim();
      if (!id) return error('Id obrigatório', 400);

      const existing = await prisma.activity.findUnique({
        where: { id },
        select: { id: true, assignedToId: true }
      });

      if (!existing) return error('Atividade não encontrada', 404);
      if (role === 'SELLER' && existing.assignedToId !== user.id) {
        return error('Acesso negado', 403);
      }

      const status = String(body.status || '').trim() || undefined;
      const nextData = {};

      if (status) {
        nextData.status = status;
        nextData.completedAt = status === 'COMPLETED' ? new Date() : null;
      }

      if (typeof body.subject === 'string' && body.subject.trim()) {
        nextData.subject = body.subject.trim();
      }

      if (typeof body.description === 'string') {
        nextData.description = body.description;
      }

      if (typeof body.priority === 'string' && body.priority.trim()) {
        nextData.priority = body.priority.trim();
      }

      if (Object.prototype.hasOwnProperty.call(body, 'dueDate')) {
        nextData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      }

      const requestedAssignedToId = String(body.assignedToId || '').trim();
      if (requestedAssignedToId) {
        if (role === 'SELLER' && requestedAssignedToId !== user.id) {
          return error('Acesso negado', 403);
        }

        const assignedUser = await prisma.user.findUnique({
          where: { id: requestedAssignedToId },
          select: { id: true }
        });

        if (assignedUser?.id) {
          nextData.assignedToId = assignedUser.id;
        }
      }

      const activity = await prisma.activity.update({
        where: { id },
        data: nextData,
        include: {
          company: true,
          opportunity: true,
          assignedTo: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return success({ success: true, activity });
    }

    if (method === 'DELETE' && segments.length === 1) {
      const id = segments[0];
      const existing = await prisma.activity.findUnique({
        where: { id },
        select: { id: true, assignedToId: true }
      });

      if (!existing) return error('Atividade não encontrada', 404);
      if (role === 'SELLER' && existing.assignedToId !== user.id) {
        return error('Acesso negado', 403);
      }

      await prisma.activity.delete({ where: { id } });
      return success({ success: true, id });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em activities-simple:', err);
    return error(err?.message || 'Erro interno', /token/i.test(String(err?.message || '')) ? 401 : 500);
  }
}
