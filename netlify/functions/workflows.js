import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser, requireRole } from './lib/auth.js';

const ADMIN_ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'DIRECTOR'];

const parseJsonBody = (event) => {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
};

const getRouteSegments = (eventPath = '', functionName = 'workflows') => {
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

const toInt = (value, fallback = 0) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const token = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'ativo', 'active'].includes(token)) return true;
  if (['false', '0', 'no', 'off', 'inativo', 'inactive'].includes(token)) return false;
  return fallback;
};

const asObject = (value, fallback = {}) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
);

const asArray = (value, fallback = []) => (
  Array.isArray(value) ? value : fallback
);

const normalizeTrigger = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return String(value.event || value.type || value.kind || 'MANUAL');
  }
  return 'MANUAL';
};

const isAutomationRuleWorkflow = (workflow) => {
  const trigger = asObject(workflow?.trigger, null);
  if (!trigger) return false;
  return String(trigger.kind || '').toUpperCase() === 'AUTOMATION_RULE';
};

const mapWorkflow = (workflow) => ({
  id: workflow.id,
  name: workflow.name,
  description: workflow.description || '',
  trigger: normalizeTrigger(workflow.trigger),
  conditions: asArray(workflow.conditions),
  actions: asArray(workflow.actions),
  active: Boolean(workflow.isActive),
  priority: workflow.priority || 'MEDIUM',
  createdAt: workflow.createdAt,
  updatedAt: workflow.updatedAt,
  _count: {
    executions: workflow?._count?.executions || 0
  }
});

const mapAutomationRule = (workflow) => {
  const trigger = asObject(workflow.trigger, {});
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || '',
    type: String(trigger.type || 'LEAD_DISTRIBUTION'),
    schedule: String(trigger.schedule || 'IMMEDIATE'),
    conditions: asObject(workflow.conditions, {}),
    actions: asObject(workflow.actions, {}),
    active: Boolean(workflow.isActive),
    lastRun: trigger.lastRun || null,
    nextRun: trigger.nextRun || null,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt
  };
};

const isAdminLike = (user) => {
  const role = String(user?.actualRole || user?.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'MANAGER' || role === 'DIRECTOR' || role === 'MASTER';
};

const withPaging = (rows, page, limit) => {
  const total = rows.length;
  const start = Math.max(0, (page - 1) * limit);
  const end = start + limit;
  return {
    rows: rows.slice(start, end),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / Math.max(1, limit)))
    }
  };
};

const createNotification = async (prisma, payload) => {
  const recipientId = String(payload.recipientId || '').trim();
  if (!recipientId) return null;

  try {
    return await prisma.notification.create({
      data: {
        type: payload.type || 'SYSTEM',
        title: payload.title || 'Notificação',
        message: payload.message || '',
        channel: payload.channel || 'IN_APP',
        recipientId,
        status: payload.status || 'SENT',
        sentAt: payload.status === 'PENDING' ? null : new Date()
      }
    });
  } catch {
    return null;
  }
};

const listWorkflows = async (prisma, qs) => {
  const activeFilter = qs.active;
  const triggerFilter = String(qs.trigger || '').trim().toUpperCase();
  const page = Math.max(1, toInt(qs.page, 1));
  const limit = Math.max(1, Math.min(100, toInt(qs.limit, 10)));

  const all = await prisma.advancedWorkflow.findMany({
    include: { _count: { select: { executions: true } } },
    orderBy: { createdAt: 'desc' }
  });

  let rows = all.filter((workflow) => !isAutomationRuleWorkflow(workflow));
  if (activeFilter !== undefined) {
    rows = rows.filter((workflow) => Boolean(workflow.isActive) === toBool(activeFilter, true));
  }
  if (triggerFilter) {
    rows = rows.filter((workflow) => normalizeTrigger(workflow.trigger).toUpperCase() === triggerFilter);
  }

  const mapped = rows.map(mapWorkflow);
  const { rows: paged, pagination } = withPaging(mapped, page, limit);
  return { workflows: paged, pagination };
};

const listAutomationRules = async (prisma, qs) => {
  const activeFilter = qs.active;
  const typeFilter = String(qs.type || '').trim().toUpperCase();
  const page = Math.max(1, toInt(qs.page, 1));
  const limit = Math.max(1, Math.min(100, toInt(qs.limit, 10)));

  const all = await prisma.advancedWorkflow.findMany({
    orderBy: { createdAt: 'desc' }
  });

  let rows = all.filter(isAutomationRuleWorkflow);
  if (activeFilter !== undefined) {
    rows = rows.filter((workflow) => Boolean(workflow.isActive) === toBool(activeFilter, true));
  }
  if (typeFilter) {
    rows = rows.filter((workflow) => {
      const trigger = asObject(workflow.trigger, {});
      return String(trigger.type || '').toUpperCase() === typeFilter;
    });
  }

  const mapped = rows.map(mapAutomationRule);
  const { rows: paged, pagination } = withPaging(mapped, page, limit);
  return { rules: paged, pagination };
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};
  const segments = getRouteSegments(event.path, 'workflows');

  try {
    const user = await authenticateUser(event.headers || {});

    // /workflows/automation-rules/*
    if (segments[0] === 'automation-rules') {
      if (method === 'GET' && segments.length === 1) {
        return success(await listAutomationRules(prisma, qs));
      }

      if (method === 'POST' && segments.length === 1) {
        requireRole(user, ADMIN_ALLOWED_ROLES);
        const body = parseJsonBody(event);
        if (!body?.name) return error('Nome da regra é obrigatório', 400);

        const created = await prisma.advancedWorkflow.create({
          data: {
            name: String(body.name).trim(),
            description: String(body.description || '').trim() || null,
            type: 'CONDITIONAL',
            category: 'GENERAL',
            trigger: {
              kind: 'AUTOMATION_RULE',
              type: String(body.type || 'LEAD_DISTRIBUTION'),
              schedule: String(body.schedule || 'IMMEDIATE')
            },
            conditions: asObject(body.conditions, {}),
            actions: asObject(body.actions, {}),
            escalationRules: null,
            priority: 'MEDIUM',
            isActive: body.active === undefined ? true : toBool(body.active, true)
          }
        });

        return success(mapAutomationRule(created), 201);
      }

      if ((method === 'PUT' || method === 'PATCH') && segments.length === 2) {
        requireRole(user, ADMIN_ALLOWED_ROLES);
        const id = segments[1];
        const current = await prisma.advancedWorkflow.findUnique({ where: { id } });
        if (!current || !isAutomationRuleWorkflow(current)) return error('Regra não encontrada', 404);

        const body = parseJsonBody(event);
        const trigger = {
          ...asObject(current.trigger, {}),
          kind: 'AUTOMATION_RULE',
          type: body.type !== undefined ? String(body.type || 'LEAD_DISTRIBUTION') : asObject(current.trigger, {}).type || 'LEAD_DISTRIBUTION',
          schedule: body.schedule !== undefined ? String(body.schedule || 'IMMEDIATE') : asObject(current.trigger, {}).schedule || 'IMMEDIATE'
        };

        const updated = await prisma.advancedWorkflow.update({
          where: { id },
          data: {
            name: body.name !== undefined ? String(body.name || '').trim() : current.name,
            description: body.description !== undefined ? (String(body.description || '').trim() || null) : current.description,
            trigger,
            conditions: body.conditions !== undefined ? asObject(body.conditions, {}) : current.conditions,
            actions: body.actions !== undefined ? asObject(body.actions, {}) : current.actions,
            isActive: body.active !== undefined ? toBool(body.active, Boolean(current.isActive)) : current.isActive
          }
        });

        return success(mapAutomationRule(updated));
      }

      if (method === 'POST' && segments[1] === 'execute-pending') {
        requireRole(user, ADMIN_ALLOWED_ROLES);
        const data = await listAutomationRules(prisma, {});
        const activeRules = data.rules.filter((rule) => rule.active);

        await createNotification(prisma, {
          type: 'SYSTEM',
          title: 'Execução de automações',
          message: `${activeRules.length} regra(s) de automação processada(s).`,
          channel: 'IN_APP',
          recipientId: user.userId,
          status: 'DELIVERED'
        });

        return success({
          success: true,
          message: `${activeRules.length} regra(s) de automação processada(s).`
        });
      }

      return error('Rota não encontrada', 404);
    }

    // /workflows/notifications/*
    if (segments[0] === 'notifications') {
      if (method === 'GET' && segments.length === 1) {
        const page = Math.max(1, toInt(qs.page, 1));
        const limit = Math.max(1, Math.min(100, toInt(qs.limit, 10)));
        const where = {};
        if (qs.type) where.type = String(qs.type);
        if (qs.channel) where.channel = String(qs.channel);
        if (qs.status) where.status = String(qs.status);
        if (!isAdminLike(user)) where.recipientId = user.userId;

        const [rows, total] = await Promise.all([
          prisma.notification.findMany({
            where,
            include: {
              recipient: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.notification.count({ where })
        ]);

        return success({
          notifications: rows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.max(1, Math.ceil(total / limit))
          }
        });
      }

      if (method === 'POST' && segments.length === 1) {
        const body = parseJsonBody(event);
        if (!body?.title || !body?.message) {
          return error('Título e mensagem são obrigatórios', 400);
        }

        let recipientId = String(body.recipientId || '').trim();
        if (!recipientId || !isAdminLike(user)) {
          recipientId = user.userId;
        }

        const created = await prisma.notification.create({
          data: {
            type: body.type || 'SYSTEM',
            title: String(body.title).trim(),
            message: String(body.message).trim(),
            channel: body.channel || 'IN_APP',
            recipientId,
            status: 'SENT',
            sentAt: new Date()
          },
          include: {
            recipient: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        return success(created, 201);
      }

      if (method === 'PUT' && segments.length === 3 && segments[2] === 'read') {
        const id = segments[1];
        const current = await prisma.notification.findUnique({ where: { id } });
        if (!current) return error('Notificação não encontrada', 404);
        if (!isAdminLike(user) && current.recipientId !== user.userId) {
          return error('Acesso negado', 403);
        }

        const updated = await prisma.notification.update({
          where: { id },
          data: {
            readAt: new Date(),
            status: current.status === 'SENT' || current.status === 'DELIVERED' ? 'READ' : current.status
          }
        });

        return success(updated);
      }

      return error('Rota não encontrada', 404);
    }

    // /workflows/:id/execute
    if (method === 'POST' && segments.length === 2 && segments[1] === 'execute') {
      const workflowId = segments[0];
      const current = await prisma.advancedWorkflow.findUnique({ where: { id: workflowId } });
      if (!current || isAutomationRuleWorkflow(current)) {
        return error('Workflow não encontrado', 404);
      }
      if (!current.isActive) {
        return error('Workflow está inativo', 400);
      }

      const body = parseJsonBody(event);
      const triggerData = asObject(body.triggerData, {});

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId,
          triggeredById: user.userId,
          triggerData,
          status: 'RUNNING'
        }
      });

      const resultPayload = {
        ok: true,
        actionsPlanned: Array.isArray(current.actions) ? current.actions.length : 0
      };

      const completed = await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          results: resultPayload,
          completedAt: new Date()
        }
      });

      await createNotification(prisma, {
        type: 'WORKFLOW',
        title: `Workflow executado: ${current.name}`,
        message: 'Execução concluída com sucesso.',
        channel: 'IN_APP',
        recipientId: user.userId,
        status: 'DELIVERED'
      });

      return success({ execution: completed });
    }

    // /workflows
    if (method === 'GET' && segments.length === 0) {
      return success(await listWorkflows(prisma, qs));
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    if (/token/i.test(message)) return error(message, 401);
    if (/acesso negado/i.test(message)) return error(message, 403);
    console.error('Erro em workflows:', err);
    return error(message, 500);
  }
}

