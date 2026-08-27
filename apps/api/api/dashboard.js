import { prisma } from '../lib/prisma.js';

const GENERAL_DASHBOARD_DAYS = 180;

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const countRows = (count) => Array.from({ length: Math.max(0, toNumber(count)) }, () => ({}));

const rangeStartDate = (days = GENERAL_DASHBOARD_DAYS) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const safeQuery = async (operation, fallback) => {
  try {
    return await operation();
  } catch (error) {
    console.warn('Dashboard geral: modulo ignorado por erro na consulta:', error?.message || error);
    return fallback;
  }
};

const leadStatsWhere = (clientType) => ({
  clientType,
  status: { not: 'INACTIVE' }
});

const buildLeadStats = async (clientType) => {
  const [hotLeads, warmLeads, coldLeads, lowPriority] = await Promise.all([
    prisma.company.count({ where: { ...leadStatsWhere(clientType), leadScore: { gte: 80, lte: 100 } } }),
    prisma.company.count({ where: { ...leadStatsWhere(clientType), leadScore: { gte: 60, lte: 79 } } }),
    prisma.company.count({ where: { ...leadStatsWhere(clientType), leadScore: { gte: 40, lte: 59 } } }),
    prisma.company.count({ where: { ...leadStatsWhere(clientType), leadScore: { gte: 0, lte: 39 } } })
  ]);

  return {
    hotLeads,
    warmLeads,
    coldLeads,
    lowPriority,
    total: hotLeads + warmLeads + coldLeads + lowPriority
  };
};

const readPreSalesRegistry = async () => {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'pre_sales_registry_v1' } });
  try {
    const parsed = row?.value ? JSON.parse(row.value) : {};
    return Array.isArray(parsed?.oportunidades) ? parsed.oportunidades : [];
  } catch {
    return [];
  }
};

const buildModuleHealth = (items) =>
  items.map(({ key, label, data, count }) => ({
    key,
    label,
    endpoint: '/api/dashboard?type=general',
    enabled: true,
    status: 'ok',
    count: count ?? (Array.isArray(data) ? data.length : toNumber(data?.total || 0)),
    data,
    error: null
  }));

const buildGeneralDashboard = async () => {
  const since = rangeStartDate();
  const opportunitySelect = {
    id: true,
    value: true,
    description: true,
    projectType: true,
    projectMonths: true,
    projectClientType: true,
    stage: true,
    b2gStage: true,
    createdAt: true,
    updatedAt: true,
    owner: { select: { name: true } }
  };

  const [
    opportunitiesB2B,
    opportunitiesB2G,
    companiesB2BCount,
    companiesB2GCount,
    b2gNotices,
    preSalesRows,
    preSalesTotal,
    preSalesPocs,
    activities,
    productsActiveCount,
    sellers,
    proposals,
    contracts,
    commissionsCount,
    salesTargetsCount,
    leadStatsB2B,
    leadStatsB2G,
    workflowsCount,
    automationRulesCount,
    automationNotificationsCount,
    integrationsCount,
    regionsCount,
    prevendasOportunidades
  ] = await Promise.all([
    safeQuery(() => prisma.opportunity.findMany({
      where: {
        company: { clientType: 'B2B' },
        b2gStage: null,
        createdAt: { gte: since }
      },
      select: opportunitySelect,
      orderBy: { updatedAt: 'desc' }
    }), []),
    safeQuery(() => prisma.opportunity.findMany({
      where: {
        OR: [
          { projectClientType: 'B2G' },
          { b2gStage: { not: null } },
          { company: { clientType: 'B2G' } }
        ],
        createdAt: { gte: since }
      },
      select: opportunitySelect,
      orderBy: { updatedAt: 'desc' }
    }), []),
    safeQuery(() => prisma.company.count({ where: { clientType: 'B2B' } }), 0),
    safeQuery(() => prisma.company.count({ where: { clientType: 'B2G' } }), 0),
    safeQuery(() => prisma.bidNotice.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }] },
      select: { id: true, status: true, estimatedValue: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    }), []),
    safeQuery(() => prisma.preSalesRequest.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    }), []),
    safeQuery(() => prisma.preSalesRequest.count(), 0),
    safeQuery(() => prisma.preSalesPoc.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }, { dueDate: { gte: since } }] },
      select: { id: true, status: true, dueDate: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    }), []),
    safeQuery(() => prisma.activity.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }, { dueDate: { gte: since } }] },
      select: { id: true, status: true, dueDate: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    }), []),
    safeQuery(() => prisma.product.count({ where: { active: true } }), 0),
    safeQuery(() => prisma.user.findMany({
      where: { role: 'SELLER' },
      select: { id: true, name: true, _count: { select: { opportunities: true } } },
      orderBy: { name: 'asc' }
    }), []),
    safeQuery(() => prisma.proposal.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }] },
      select: { id: true, createdAt: true, updatedAt: true }
    }), []),
    safeQuery(() => prisma.contract.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }, { startDate: { gte: since } }] },
      select: { id: true, createdAt: true, updatedAt: true, startDate: true }
    }), []),
    safeQuery(() => prisma.commission.count(), 0),
    safeQuery(() => prisma.salesTarget.count(), 0),
    safeQuery(() => buildLeadStats('B2B'), { hotLeads: 0, warmLeads: 0, coldLeads: 0, lowPriority: 0, total: 0 }),
    safeQuery(() => buildLeadStats('B2G'), { hotLeads: 0, warmLeads: 0, coldLeads: 0, lowPriority: 0, total: 0 }),
    safeQuery(() => (prisma.workflow || prisma.advancedWorkflow).count(), 0),
    safeQuery(() => prisma.automationRule.count(), 0),
    safeQuery(() => prisma.notification.count(), 0),
    safeQuery(() => prisma.integration.count(), 0),
    safeQuery(() => prisma.region.count(), 0),
    safeQuery(readPreSalesRegistry, [])
  ]);

  const data = {
    opportunitiesB2B,
    opportunitiesB2G,
    companiesB2B: countRows(companiesB2BCount),
    companiesB2G: countRows(companiesB2GCount),
    b2g: b2gNotices,
    prevendasOportunidades,
    preSales: { rows: preSalesRows, total: preSalesTotal },
    preSalesPocs,
    activities,
    products: countRows(productsActiveCount).map(() => ({ active: true })),
    sellers,
    proposals,
    contracts,
    commissions: countRows(commissionsCount),
    salesTargets: countRows(salesTargetsCount),
    leadStatsB2B,
    leadStatsB2G,
    workflows: countRows(workflowsCount),
    automationRules: countRows(automationRulesCount),
    automationNotifications: countRows(automationNotificationsCount),
    integrations: countRows(integrationsCount),
    regions: countRows(regionsCount)
  };

  return {
    data,
    moduleHealth: buildModuleHealth([
      { key: 'opportunitiesB2B', label: 'Oportunidades B2B', data: opportunitiesB2B },
      { key: 'opportunitiesB2G', label: 'Oportunidades B2G', data: opportunitiesB2G },
      { key: 'companiesB2B', label: 'Empresas B2B', data: data.companiesB2B, count: companiesB2BCount },
      { key: 'companiesB2G', label: 'Empresas B2G', data: data.companiesB2G, count: companiesB2GCount },
      { key: 'b2g', label: 'Editais B2G', data: b2gNotices },
      { key: 'prevendasOportunidades', label: 'Registro Pré-Vendas', data: prevendasOportunidades },
      { key: 'preSales', label: 'Pré-vendas', data: data.preSales, count: preSalesTotal },
      { key: 'preSalesPocs', label: 'POCs Pré-Vendas', data: preSalesPocs },
      { key: 'activities', label: 'Atividades', data: activities },
      { key: 'products', label: 'Produtos', data: data.products, count: productsActiveCount },
      { key: 'sellers', label: 'Equipe comercial', data: sellers },
      { key: 'proposals', label: 'Propostas', data: proposals },
      { key: 'contracts', label: 'Contratos', data: contracts },
      { key: 'commissions', label: 'Comissões', data: data.commissions, count: commissionsCount },
      { key: 'salesTargets', label: 'Metas comerciais', data: data.salesTargets, count: salesTargetsCount },
      { key: 'leadStatsB2B', label: 'Lead scoring B2B', data: leadStatsB2B, count: leadStatsB2B.total },
      { key: 'leadStatsB2G', label: 'Lead scoring B2G', data: leadStatsB2G, count: leadStatsB2G.total },
      { key: 'workflows', label: 'Workflows', data: data.workflows, count: workflowsCount },
      { key: 'automationRules', label: 'Regras de automação', data: data.automationRules, count: automationRulesCount },
      { key: 'automationNotifications', label: 'Notificações automação', data: data.automationNotifications, count: automationNotificationsCount },
      { key: 'integrations', label: 'Integrações', data: data.integrations, count: integrationsCount },
      { key: 'regions', label: 'Regiões', data: data.regions, count: regionsCount }
    ])
  };
};

export default async function handler(req) {
  if (req.method === 'GET') {
    const { type = 'executive', userId, period = '6' } = req.query || {};

    try {
      if (type === 'general') {
        return Response.json(await buildGeneralDashboard());
      }

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

        const b2bOpportunityFilter = { b2gStage: null };

        const baseWhere = { ...b2bOpportunityFilter, company: { clientType: 'B2B' }, ...dateFilter };
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

        // chartsWhere acompanha os filtros do dashboard para manter funil e graficos sincronizados
        const chartsWhere = { ...whereClause };

        // Contagens por temperatura respeitam periodo e gerente, sem travar na temperatura selecionada
        const temperatureCountWhere = { ...baseWhere };
        const monthlyRevenueWhere = {
          ...b2bOpportunityFilter,
          stage: 'WON',
          company: { clientType: 'B2B' },
          updatedAt: { gte: revenueStartDate }
        };
        if (ownerId) monthlyRevenueWhere.ownerId = ownerId;
        if (temperature && temperatureRange[temperature]) {
          monthlyRevenueWhere.probability = {
            gte: temperatureRange[temperature].gte,
            lte: temperatureRange[temperature].lte
          };
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
          opportunities,
          monthlyRevenue
        ] = await Promise.all([
          prisma.company.count({ where: { clientType: 'B2B' } }),
          prisma.opportunity.count({ where: { ...whereClause } }),
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
            where: monthlyRevenueWhere,
            select: {
              updatedAt: true,
              value: true
            }
          })
        ]);

        // Contagens por temperatura do recorte atual de periodo/gerente
        const allProbabilities = await prisma.opportunity.groupBy({
          by: ['probability'],
          where: { ...temperatureCountWhere },
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

        const activeLeads = funnelData
          .filter(item => item.stage === 'LEAD')
          .reduce((sum, item) => sum + (item._count?.stage || 0), 0);

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
            activeLeads,
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
