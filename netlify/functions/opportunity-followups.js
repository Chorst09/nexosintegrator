import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { normalizeRole } from './lib/permissions.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = String(event.path || '')
    .split('?')[0]
    .replace('/.netlify/functions/opportunity-followups', '')
    .replace('/api/opportunity-followups', '');

  const segments = path.split('/').filter(Boolean);

  try {
    const user = await authenticateUser(event.headers);
    const role = normalizeRole(user.actualRole || user.role);

    // GET /opportunity-followups/:opportunityId — lista acompanhamentos de uma oportunidade
    if (method === 'GET' && segments.length === 1) {
      const opportunityId = segments[0];

      const followUps = await prisma.opportunityFollowUp.findMany({
        where: { opportunityId },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return success(followUps);
    }

    // POST /opportunity-followups — cria novo acompanhamento
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const opportunityId = String(body.opportunityId || '').trim();
      const content = String(body.content || '').trim();
      const type = String(body.type || 'NOTE').trim().toUpperCase();

      if (!opportunityId || !content) {
        return error('Os campos opportunityId e content são obrigatórios', 400);
      }

      const VALID_TYPES = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'WHATSAPP'];
      const normalizedType = VALID_TYPES.includes(type) ? type : 'NOTE';

      // Verificar se a oportunidade existe
      const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true }
      });
      if (!opportunity) return error('Oportunidade não encontrada', 404);

      const followUp = await prisma.opportunityFollowUp.create({
        data: {
          opportunityId,
          userId: user.id,
          type: normalizedType,
          content
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      return success(followUp, 201);
    }

    // DELETE /opportunity-followups/:id — remove um acompanhamento
    if (method === 'DELETE' && segments.length === 1) {
      const followUpId = segments[0];

      const followUp = await prisma.opportunityFollowUp.findUnique({
        where: { id: followUpId }
      });

      if (!followUp) return error('Acompanhamento não encontrado', 404);

      const isAdminOrMaster = ['ADMIN', 'MASTER'].includes(role);
      const isOwner = followUp.userId === user.id;

      if (!isOwner && !isAdminOrMaster) {
        return error('Você só pode remover seus próprios acompanhamentos', 403);
      }

      await prisma.opportunityFollowUp.delete({ where: { id: followUpId } });
      return success({ message: 'Acompanhamento removido com sucesso' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em opportunity-followups:', err);
    const message = String(err?.message || 'Erro interno');
    if (['Token não fornecido', 'Token inválido', 'Usuário não encontrado'].includes(message)) {
      return error(message, 401);
    }
    if (message === 'Acesso negado') return error(message, 403);
    return error(message, 500);
  }
}
