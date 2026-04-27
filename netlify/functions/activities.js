import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { normalizeRole } from './lib/permissions.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/activities', '').replace('/api/activities', '');
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers);
    const role = normalizeRole(user.actualRole || user.role);

    if (method === 'GET') {
      const where = {};
      if (qs.status) where.status = qs.status;
      if (qs.type) where.type = qs.type;
      if (qs.userId) where.assignedToId = qs.userId;
      if (role === 'SELLER') where.assignedToId = user.id;

      const activities = await prisma.activity.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          opportunity: { select: { id: true, title: true } },
          assignedTo: { select: { id: true, name: true, email: true } }
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }]
      });
      return success(activities);
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const assignedToId = role === 'SELLER' ? user.id : (body.assignedToId || user.id);
      if (!assignedToId) return error('assignedToId é obrigatório', 400);

      const activity = await prisma.activity.create({
        data: {
          type: body.type || 'TASK',
          subject: body.subject || 'Atividade',
          description: body.description || '',
          status: 'PENDING',
          priority: body.priority || 'MEDIUM',
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          companyId: body.companyId || null,
          opportunityId: body.opportunityId || null,
          assignedToId
        },
        include: {
          company: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } }
        }
      });
      return success(activity, 201);
    }

    if (method === 'PUT' && path.startsWith('/')) {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');
      const { id: _id, company, opportunity, assignedTo, ...data } = body;
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.completedAt) data.completedAt = new Date(data.completedAt);

      const activity = await prisma.activity.update({
        where: { id },
        data,
        include: {
          company: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } }
        }
      });
      return success(activity);
    }

    if (method === 'DELETE' && path.startsWith('/')) {
      const id = path.substring(1);
      await prisma.activity.delete({ where: { id } });
      return success({ message: 'Atividade removida' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em activities:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
