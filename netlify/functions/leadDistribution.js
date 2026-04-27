import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers);

    if (method === 'GET') {
      const { type } = qs;

      if (type === 'by_seller') {
        const sellers = await prisma.user.findMany({
          where: { role: { in: ['SELLER', 'USER'] } },
          select: {
            id: true, name: true, email: true, regionId: true,
            _count: { select: { opportunities: true, activities: true } }
          }
        });
        return success(sellers.map(s => ({
          ...s,
          opportunitiesCount: s._count.opportunities,
          activitiesCount: s._count.activities
        })));
      }

      if (type === 'by_region') {
        const regions = await prisma.region.findMany({
          where: { isActive: true },
          include: {
            _count: { select: { users: true, companies: true } }
          }
        });
        return success(regions);
      }

      // Default: distribuição geral
      const [totalOpps, sellers] = await Promise.all([
        prisma.opportunity.count({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
        prisma.user.findMany({
          where: { role: { in: ['SELLER', 'USER'] } },
          select: {
            id: true, name: true,
            _count: { select: { opportunities: true } }
          }
        })
      ]);

      return success({
        totalOpenOpportunities: totalOpps,
        sellers: sellers.map(s => ({
          id: s.id,
          name: s.name,
          opportunitiesCount: s._count.opportunities
        }))
      });
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, opportunityId, sellerId } = body;

      if (action === 'assign' && opportunityId && sellerId) {
        const opp = await prisma.opportunity.update({
          where: { id: opportunityId },
          data: { ownerId: sellerId }
        });
        return success({ message: 'Oportunidade atribuída com sucesso', opportunity: opp });
      }

      return error('Action não especificada', 400);
    }

    return error('Método não permitido', 405);
  } catch (err) {
    console.error('Erro em leadDistribution:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
