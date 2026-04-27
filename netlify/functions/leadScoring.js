import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

// Calcula score de uma empresa baseado em atividades e oportunidades
async function calculateLeadScore(prisma, companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      opportunities: { orderBy: { createdAt: 'desc' }, take: 10 },
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      contacts: true
    }
  });

  if (!company) return 0;

  let score = 0;

  // Pontos por oportunidades
  const openOpps = company.opportunities.filter(o => !['WON', 'LOST'].includes(o.stage));
  const wonOpps = company.opportunities.filter(o => o.stage === 'WON');
  score += Math.min(openOpps.length * 10, 30);
  score += Math.min(wonOpps.length * 15, 30);

  // Pontos por atividades recentes (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentActivities = company.activities.filter(a => new Date(a.createdAt) > thirtyDaysAgo);
  score += Math.min(recentActivities.length * 5, 20);

  // Pontos por contatos
  score += Math.min(company.contacts.length * 5, 10);

  // Pontos por status
  if (company.status === 'ACTIVE') score += 10;
  else if (company.status === 'PROSPECT') score += 5;

  return Math.min(score, 100);
}

function getLeadClassification(score) {
  if (score >= 80) return { label: 'Hot Lead', color: 'red', priority: 'HIGH' };
  if (score >= 60) return { label: 'Warm Lead', color: 'orange', priority: 'MEDIUM' };
  if (score >= 40) return { label: 'Cold Lead', color: 'blue', priority: 'LOW' };
  return { label: 'Low Priority', color: 'gray', priority: 'VERY_LOW' };
}

async function getCompaniesByScoreRange(prisma, min, max, clientType = null) {
  const where = { leadScore: { gte: min, lte: max } };
  if (clientType === 'B2G' || clientType === 'B2B') where.clientType = clientType;
  return prisma.company.findMany({
    where,
    select: { id: true, name: true, leadScore: true, status: true, segment: true, clientType: true },
    orderBy: { leadScore: 'desc' }
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  let prisma;
  try {
    prisma = getPrisma();
  } catch (err) {
    console.error('Erro ao inicializar Prisma:', err);
    return error('Erro de configuração do banco de dados', 500);
  }

  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers);

    // GET
    if (method === 'GET') {
      const { action, companyId, minScore, maxScore } = qs;
      const clientType = qs.clientType || null;

      if (action === 'calculate' && companyId) {
        const score = await calculateLeadScore(prisma, companyId);
        return success({ companyId, score, classification: getLeadClassification(score) });
      }

      if (action === 'range') {
        const companies = await getCompaniesByScoreRange(
          prisma,
          parseInt(minScore) || 0,
          parseInt(maxScore) || 100,
          clientType
        );
        return success(companies.map(c => ({ ...c, classification: getLeadClassification(c.leadScore) })));
      }

      if (action === 'stats') {
        console.log('[leadScoring] Calculando stats para clientType:', clientType);
        const [hot, warm, cold, low] = await Promise.all([
          getCompaniesByScoreRange(prisma, 80, 100, clientType),
          getCompaniesByScoreRange(prisma, 60, 79, clientType),
          getCompaniesByScoreRange(prisma, 40, 59, clientType),
          getCompaniesByScoreRange(prisma, 0, 39, clientType)
        ]);
        console.log('[leadScoring] Stats calculadas:', { hot: hot.length, warm: warm.length, cold: cold.length, low: low.length });
        return success({
          hotLeads: hot.length,
          warmLeads: warm.length,
          coldLeads: cold.length,
          lowPriority: low.length,
          total: hot.length + warm.length + cold.length + low.length,
          companies: { hot, warm, cold, low }
        });
      }

      // Default: retorna empresas com score filtradas por clientType
      const where = { ...(clientType === 'B2G' || clientType === 'B2B' ? { clientType } : {}) };
      const companies = await prisma.company.findMany({
        where,
        select: { id: true, name: true, leadScore: true, status: true, segment: true, clientType: true },
        orderBy: { leadScore: 'desc' },
        take: 50
      });
      return success(companies.map(c => ({ ...c, classification: getLeadClassification(c.leadScore || 0) })));
    }

    // POST
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, companyId } = body;

      if (action === 'update' && companyId) {
        const score = await calculateLeadScore(prisma, companyId);
        await prisma.company.update({ where: { id: companyId }, data: { leadScore: score } });
        return success({ companyId, score, classification: getLeadClassification(score), message: 'Lead score atualizado' });
      }

      if (action === 'recalculate-all') {
        const companies = await prisma.company.findMany({ select: { id: true } });
        const results = await Promise.allSettled(
          companies.map(async (c) => {
            const score = await calculateLeadScore(prisma, c.id);
            await prisma.company.update({ where: { id: c.id }, data: { leadScore: score } });
            return { id: c.id, score };
          })
        );
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        return success({
          message: `Lead scores recalculados: ${successful} sucessos, ${failed} falhas`,
          summary: { successful, failed, total: results.length }
        });
      }

      return error('Action não especificada', 400);
    }

    return error('Método não permitido', 405);
  } catch (err) {
    console.error('[leadScoring] Erro:', err);
    console.error('[leadScoring] Stack:', err.stack);
    return error(err.message || 'Erro interno', 500);
  }
}
