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
        const execMonthsBack = parseInt(period) || 6;
        const execStartDate = new Date(Date.now() - execMonthsBack * 30 * 24 * 60 * 60 * 1000);
        const execRevenueRows = await prisma.opportunity.findMany({
          where: {
            stage: 'WON',
            actualCloseDate: { gte: execStartDate, not: null }
          },
          select: {
            actualCloseDate: true,
            value: true
          }
        });
        const execByMonth = new Map();
        for (const opp of execRevenueRows) {
          if (!opp.actualCloseDate) continue;
          const d = new Date(opp.actualCloseDate);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const prev = execByMonth.get(key) || { month: new Date(d.getFullYear(), d.getMonth(), 1), revenue: 0, deals: 0 };
          prev.revenue += opp.value || 0;
          prev.deals += 1;
          execByMonth.set(key, prev);
        }
        const monthlyRevenue = [...execByMonth.values()].sort((a, b) => a.month - b.month);

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
            monthlyRevenue,
            sellerPerformance: sellerData,
            leadSources,
            lossReasons
          }
        });
      }

      if (type === 'b2b') {
        // Dashboard B2B com filtros
        const { ownerId, temperature, period = '6' } = req.query || {};

        // Parse do periodo: '30d' -> 1 mes, 'month' -> 1 mes, 'quarter' -> 3, etc.
        const parsePeriod = (p) => {
          if (!p) return 6;
          const num = parseInt(p);
          if (p.endsWith('d')) {
            const days = Number.isFinite(num) ? num : 30;
            return Math.max(1, Math.round(days / 30));
          }
          if (p === 'month') return 1;
          if (p === 'quarter') return 3;
          if (p === 'year') return 12;
          if (p === 'custom') return 6;
          return Number.isFinite(num) ? num : 6;
        };
        const periodMonths = parsePeriod(period);
        const dateFilter = periodMonths
          ? { createdAt: { gte: new Date(Date.now() - periodMonths * 30 * 24 * 60 * 60 * 1000) } }
          : {};

        const monthsBack = periodMonths || 6;
        const revenueStartDate = new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000);

        const baseWhere = { company: { clientType: 'B2B' }, ...dateFilter };
        if (ownerId) baseWhere.ownerId = ownerId;

        // Mapear temperatura para faixas de probabilidade
        const temperatureRange = {
          '0': { gte: 0, lte: 0 },
          '25': { gte: 1, lte: 25 },
          '50': { gte: 26, lte: 50 },
          '75': { gte: 51, lte: 75 },
          '100': { gte: 76, lte: 100 }
        };

        // whereClause inclui temperatura (para KPIs e lista de oportunidades)
        const whereClause = { ...baseWhere };
        if (temperature && temperatureRange[temperature]) {
          whereClause.probability = {
            gte: temperatureRange[temperature].gte,
            lte: temperatureRange[temperature].lte
          };
        }

        // chartsWhere nao inclui temperatura (para funnel, fontes, performance)
        const chartsWhere = { ...baseWhere };

        // Where sem dateFilter para contagens de temperatura (mostra tudo)
        const whereNoDate = { company: { clientType: 'B2B' } };
        if (ownerId) whereNoDate.ownerId = ownerId;

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
          opportunities,
          monthlyRevenue
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
            where: { ...chartsWhere },
            _count: { stage: true },
            _sum: { value: true },
            orderBy: { stage: 'asc' }
          }),
          prisma.opportunity.groupBy({
            by: ['source'],
            where: { ...chartsWhere, source: { not: null } },
            _count: { source: true }
          }),
          prisma.opportunity.groupBy({
            by: ['ownerId'],
            where: { ...chartsWhere, stage: 'WON' },
            _count: { ownerId: true },
            _sum: { value: true }
          }),
          prisma.opportunity.findMany({
            where: whereClause,
            include: { company: true, owner: true },
            orderBy: { updatedAt: 'desc' },
            take: 200
          }),
          prisma.opportunity.findMany({
            where: {
              stage: 'WON',
              company: { clientType: 'B2B' },
              updatedAt: { gte: revenueStartDate }
            },
            select: {
              updatedAt: true,
              value: true
            }
          })
        ]);

        // Contagens por temperatura (sempre do total, sem filtro de data)
        const allProbabilities = await prisma.opportunity.groupBy({
          by: ['probability'],
          where: { ...whereNoDate },
          _count: { probability: true }
        });

        const temperatureCounts = {
          0: allProbabilities.filter(s => s.probability === 0).reduce((sum, s) => sum + s._count.probability, 0),
          25: allProbabilities.filter(s => s.probability >= 1 && s.probability <= 25).reduce((sum, s) => sum + s._count.probability, 0),
          50: allProbabilities.filter(s => s.probability >= 26 && s.probability <= 50).reduce((sum, s) => sum + s._count.probability, 0),
          75: allProbabilities.filter(s => s.probability >= 51 && s.probability <= 75).reduce((sum, s) => sum + s._count.probability, 0),
          100: allProbabilities.filter(s => s.probability >= 76 && s.probability <= 100).reduce((sum, s) => sum + s._count.probability, 0)
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

        // Forecast: projecao baseada no pipeline mensalizado
        const avgMonthlyWon = Array.isArray(monthlyRevenue) && monthlyRevenue.length > 0
          ? monthlyRevenue.reduce((s, m) => s + parseFloat(m.revenue || 0), 0) / monthlyRevenue.length
          : 0;
        const forecastMonths = [];
        const today = new Date();
        for (let i = 0; i < 6; i += 1) {
          const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
          const target = Math.round(avgMonthlyWon * 1.1 * (1 + i * 0.02));
          forecastMonths.push({
            month: m.toISOString().slice(0, 10),
            forecast: Math.round((pipelineAgg._sum.value || 0) / Math.max(6 - i, 1)),
            target: Math.max(target, 1)
          });
        }

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
            monthlyRevenue: (() => {
              const byMonth = new Map();
              for (const opp of monthlyRevenue) {
                const d = new Date(opp.updatedAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const prev = byMonth.get(key) || { month: new Date(d.getFullYear(), d.getMonth(), 1), revenue: 0, deals: 0 };
                prev.revenue += opp.value || 0;
                prev.deals += 1;
                byMonth.set(key, prev);
              }
              return [...byMonth.values()].sort((a, b) => a.month - b.month);
            })(),
            leadSources,
            sellerPerformance: sellerData,
            forecast: forecastMonths
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