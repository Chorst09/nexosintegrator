import { prisma } from '../lib/prisma.js';

export default async function handler(req) {
  if (req.method === 'GET') {
    const { type = 'executive', userId, period = '6' } = req.query || {};

    try {
      if (type === 'executive') {
        // Dashboard Executivo
        const [
          totalCompanies,
          totalOpportunities,
          wonOpportunities,
          lostOpportunities,
          pipelineValue,
          wonValue,
          avgTicket,
          totalActivities,
          overdueActivities,
          totalProposals,
          totalCommissions
        ] = await Promise.all([
          prisma.company.count(),
          prisma.opportunity.count({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
          prisma.opportunity.count({ where: { stage: 'WON' } }),
          prisma.opportunity.count({ where: { stage: 'LOST' } }),
          prisma.opportunity.aggregate({
            where: { stage: { notIn: ['WON', 'LOST'] } },
            _sum: { value: true }
          }),
          prisma.opportunity.aggregate({
            where: { stage: 'WON' },
            _sum: { value: true }
          }),
          prisma.opportunity.aggregate({
            where: { stage: 'WON' },
            _avg: { value: true }
          }),
          prisma.activity.count(),
          prisma.activity.count({
            where: {
              dueDate: { lt: new Date() },
              status: { notIn: ['COMPLETED', 'CANCELLED'] }
            }
          }),
          prisma.proposal.count(),
          prisma.commission.aggregate({
            where: { status: 'APPROVED' },
            _sum: { amount: true }
          })
        ]);

        const conversion = (wonOpportunities + lostOpportunities) > 0 
          ? (wonOpportunities / (wonOpportunities + lostOpportunities)) * 100 
          : 0;

        // Funil por etapa
        const funnelData = await prisma.opportunity.groupBy({
          by: ['stage'],
          _count: { stage: true },
          _sum: { value: true },
          orderBy: {
            stage: 'asc'
          }
        });

        // Receita mensal (últimos X meses)
        const monthsBack = parseInt(period);
        const monthlyRevenue = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "actualCloseDate") as month,
            SUM(value) as revenue,
            COUNT(*) as deals
          FROM "Opportunity" 
          WHERE stage = 'WON' 
            AND "actualCloseDate" >= NOW() - INTERVAL '${monthsBack} months'
            AND "actualCloseDate" IS NOT NULL
          GROUP BY DATE_TRUNC('month', "actualCloseDate")
          ORDER BY month ASC
        `;

        // Performance por vendedor
        const sellerPerformance = await prisma.opportunity.groupBy({
          by: ['ownerId'],
          where: { stage: 'WON' },
          _count: { ownerId: true },
          _sum: { value: true }
        });

        // Buscar nomes dos vendedores
        const sellerIds = sellerPerformance.map(s => s.ownerId);
        const sellers = await prisma.user.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, name: true }
        });

        const sellerData = sellerPerformance.map(perf => {
          const seller = sellers.find(s => s.id === perf.ownerId);
          return {
            sellerId: perf.ownerId,
            sellerName: seller?.name || 'Desconhecido',
            deals: perf._count.ownerId,
            revenue: perf._sum.value || 0
          };
        });

        // Origem de leads
        const leadSources = await prisma.opportunity.groupBy({
          by: ['source'],
          _count: { source: true },
          where: { source: { not: null } }
        });

        // Motivos de perda
        const lossReasons = await prisma.opportunity.groupBy({
          by: ['lossReason'],
          _count: { lossReason: true },
          where: { 
            stage: 'LOST',
            lossReason: { not: null }
          }
        });

        return Response.json({
          kpis: {
            totalCompanies,
            totalOpportunities,
            wonOpportunities,
            lostOpportunities,
            pipelineValue: pipelineValue._sum.value || 0,
            wonValue: wonValue._sum.value || 0,
            avgTicket: avgTicket._avg.value || 0,
            conversionRate: Math.round(conversion * 100) / 100,
            totalActivities,
            overdueActivities,
            totalProposals,
            totalCommissions: totalCommissions._sum.amount || 0
          },
          charts: {
            funnel: funnelData,
            monthlyRevenue: monthlyRevenue.map(m => ({
              month: m.month,
              revenue: parseFloat(m.revenue) || 0,
              deals: parseInt(m.deals) || 0
            })),
            sellerPerformance: sellerData,
            leadSources,
            lossReasons
          }
        });
      }

      if (type === 'b2b') {
        // Dashboard B2B com filtros
        const { ownerId, temperature } = req.query || {};

        const whereClause = { clientType: 'B2B' };
        if (ownerId) whereClause.ownerId = ownerId;

        // Mapear temperatura para stages
        const stageMap = {
          '0': ['LEAD', 'QUALIFICATION'],
          '25': ['DIAGNOSIS', 'PROPOSAL'],
          '50': ['NEGOTIATION'],
          '75': ['WON'],
          '100': ['LOST']
        };

        if (temperature && stageMap[temperature]) {
          whereClause.stage = { in: stageMap[temperature] };
        }

        const [
          totalCompanies,
          totalOpportunities,
          wonOpportunities,
          lostOpportunities,
          pipelineAgg,
          wonAgg,
          avgTicketAgg,
          funnelData,
          leadSources,
          sellerPerformance,
          opportunities
        ] = await Promise.all([
          prisma.company.count({ where: { clientType: 'B2B' } }),
          prisma.opportunity.count({ where: { ...whereClause, stage: { notIn: ['WON', 'LOST'] } } }),
          prisma.opportunity.count({ where: { ...whereClause, stage: 'WON' } }),
          prisma.opportunity.count({ where: { ...whereClause, stage: 'LOST' } }),
          prisma.opportunity.aggregate({
            where: { ...whereClause, stage: { notIn: ['WON', 'LOST'] } },
            _sum: { value: true }
          }),
          prisma.opportunity.aggregate({
            where: { ...whereClause, stage: 'WON' },
            _sum: { value: true }
          }),
          prisma.opportunity.aggregate({
            where: { ...whereClause, stage: 'WON' },
            _avg: { value: true }
          }),
          prisma.opportunity.groupBy({
            by: ['stage'],
            where: { clientType: 'B2B', ...(ownerId ? { ownerId } : {}) },
            _count: { stage: true },
            _sum: { value: true },
            orderBy: { stage: 'asc' }
          }),
          prisma.opportunity.groupBy({
            by: ['source'],
            where: { clientType: 'B2B', source: { not: null }, ...(ownerId ? { ownerId } : {}) },
            _count: { source: true }
          }),
          prisma.opportunity.groupBy({
            by: ['ownerId'],
            where: { clientType: 'B2B', stage: 'WON', ...(ownerId ? { ownerId } : {}) },
            _count: { ownerId: true },
            _sum: { value: true }
          }),
          prisma.opportunity.findMany({
            where: whereClause,
            include: { company: true, owner: true },
            orderBy: { updatedAt: 'desc' },
            take: 200
          })
        ]);

        // Contagens por temperatura
        const allStages = await prisma.opportunity.groupBy({
          by: ['stage'],
          where: { clientType: 'B2B', ...(ownerId ? { ownerId } : {}) },
          _count: { stage: true }
        });

        const temperatureCounts = {
          0: allStages.filter(s => ['LEAD', 'QUALIFICATION'].includes(s.stage)).reduce((sum, s) => sum + s._count.stage, 0),
          25: allStages.filter(s => ['DIAGNOSIS', 'PROPOSAL'].includes(s.stage)).reduce((sum, s) => sum + s._count.stage, 0),
          50: allStages.filter(s => ['NEGOTIATION'].includes(s.stage)).reduce((sum, s) => sum + s._count.stage, 0),
          75: allStages.filter(s => s.stage === 'WON').reduce((sum, s) => sum + s._count.stage, 0),
          100: allStages.filter(s => s.stage === 'LOST').reduce((sum, s) => sum + s._count.stage, 0)
        };

        // Nomes dos vendedores
        const sellerIds = sellerPerformance.map(s => s.ownerId);
        const sellers = await prisma.user.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, name: true }
        });

        const sellerData = sellerPerformance.map(perf => {
          const seller = sellers.find(s => s.id === perf.ownerId);
          return {
            sellerId: perf.ownerId,
            sellerName: seller?.name || 'Desconhecido',
            deals: perf._count.ownerId,
            revenue: perf._sum.value || 0
          };
        });

        const conversion = (wonOpportunities + lostOpportunities) > 0
          ? (wonOpportunities / (wonOpportunities + lostOpportunities)) * 100
          : 0;

        return Response.json({
          kpis: {
            pipelineValue: pipelineAgg._sum.value || 0,
            wonValue: wonAgg._sum.value || 0,
            conversionRate: Math.round(conversion * 100) / 100,
            avgTicket: avgTicketAgg._avg.value || 0,
            totalOpportunities,
            wonOpportunities,
            lostOpportunities,
            totalCompanies
          },
          charts: {
            funnel: funnelData,
            leadSources,
            sellerPerformance: sellerData
          },
          temperatureCounts,
          opportunities
        });
      }

      if (type === 'seller' && userId) {
        // Dashboard do Vendedor
        const [
          myOpportunities,
          myActivities,
          myCommissions,
          myQuota,
          myProposals
        ] = await Promise.all([
          prisma.opportunity.findMany({
            where: { ownerId: userId, stage: { not: 'LOST' } },
            include: { company: true }
          }),
          prisma.activity.findMany({
            where: { 
              assignedToId: userId,
              status: { in: ['PENDING', 'IN_PROGRESS'] }
            },
            include: { company: true, opportunity: true },
            orderBy: { dueDate: 'asc' },
            take: 10
          }),
          prisma.commission.aggregate({
            where: { sellerId: userId, status: 'APPROVED' },
            _sum: { amount: true }
          }),
          prisma.user.findUnique({
            where: { id: userId },
            select: { quota: true }
          }),
          prisma.proposal.count({
            where: {
              opportunity: { ownerId: userId }
            }
          })
        ]);

        const pipelineValue = myOpportunities.reduce((sum, opp) => sum + opp.value, 0);
        const wonValue = myOpportunities
          .filter(opp => opp.stage === 'WON')
          .reduce((sum, opp) => sum + opp.value, 0);

        return Response.json({
          kpis: {
            pipelineValue,
            wonValue,
            quota: myQuota?.quota || 0,
            quotaAchievement: myQuota?.quota ? (wonValue / myQuota.quota) * 100 : 0,
            pendingActivities: myActivities.length,
            totalCommissions: myCommissions._sum.amount || 0,
            totalProposals: myProposals
          },
          opportunities: myOpportunities,
          activities: myActivities
        });
      }

      if (type === 'manager') {
        // Dashboard do Gestor
        const [
          teamPerformance,
          pipelineByStage,
          activitiesOverdue,
          conversionBySource
        ] = await Promise.all([
          prisma.opportunity.groupBy({
            by: ['ownerId'],
            _count: { ownerId: true },
            _sum: { value: true },
            where: { stage: { notIn: ['LOST'] } }
          }),
          prisma.opportunity.groupBy({
            by: ['stage'],
            _count: { stage: true },
            _sum: { value: true }
          }),
          prisma.activity.count({
            where: {
              dueDate: { lt: new Date() },
              status: { notIn: ['COMPLETED', 'CANCELLED'] }
            }
          }),
          prisma.opportunity.groupBy({
            by: ['source'],
            _count: { source: true },
            where: { 
              source: { not: null },
              stage: 'WON'
            }
          })
        ]);

        return Response.json({
          kpis: {
            teamSize: teamPerformance.length,
            activitiesOverdue,
            totalPipeline: pipelineByStage.reduce((sum, stage) => sum + (stage._sum.value || 0), 0)
          },
          charts: {
            teamPerformance,
            pipelineByStage,
            conversionBySource
          }
        });
      }

      return Response.json({ error: 'Invalid dashboard type' }, { status: 400 });

    } catch (error) {
      console.error('Dashboard error:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}