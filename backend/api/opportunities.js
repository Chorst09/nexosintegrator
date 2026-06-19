import { prisma } from "../lib/prisma.js";
import { updateCompanyLeadScore } from '../lib/leadScoring.js';

const parsePathIdFromUrl = (urlValue) => {
  if (!urlValue) return null;

  const cleanPath = String(urlValue).split('?')[0];
  const segments = cleanPath
    .split('/')
    .filter(Boolean)
    .filter((segment) => !['api', 'opportunities'].includes(segment));
  return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : null;
};

const resolveOpportunityId = (req, body) =>
  body?.id || req.query?.id || parsePathIdFromUrl(req.url);

const isSchemaDriftError = (error) => {
  return error?.code === 'P2021' || error?.code === 'P2022';
};

const isMissingOptionalModelError = (error) => {
  return error instanceof TypeError && /Cannot read properties of undefined/.test(error.message || '');
};

const runOptionalCleanup = async (operation) => {
  try {
    await operation();
  } catch (error) {
    if (!isSchemaDriftError(error) && !isMissingOptionalModelError(error)) {
      throw error;
    }
  }
};

const MONTHLY_PROJECT_MONTHS = [12, 24, 36, 48, 60];

const normalizeProjectType = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  return raw === 'MONTHLY' ? 'MONTHLY' : 'SINGLE';
};

const normalizeProjectMonths = (projectType, value) => {
  if (projectType !== 'MONTHLY') return null;
  const parsed = Number(value);
  return MONTHLY_PROJECT_MONTHS.includes(parsed) ? parsed : 12;
};

const resolveCommissionPercentage = (seller, projectType, projectMonths) => {
  if (!seller) return 0;
  if (projectType === 'MONTHLY') {
    return Number(seller[`commissionProject${projectMonths}`] || 0);
  }
  return Number(seller.commissionSalePercentage || 0);
};

const syncWonOpportunityCommission = async (tx, opportunity) => {
  if (!opportunity?.id || opportunity.stage !== 'WON') return null;

  const seller = await tx.user.findUnique({
    where: { id: opportunity.ownerId },
    select: {
      commissionSalePercentage: true,
      commissionProject12: true,
      commissionProject24: true,
      commissionProject36: true,
      commissionProject48: true,
      commissionProject60: true
    }
  });

  const projectType = normalizeProjectType(opportunity.projectType);
  const projectMonths = normalizeProjectMonths(projectType, opportunity.projectMonths);
  const percentage = resolveCommissionPercentage(seller, projectType, projectMonths);
  const calculationBase = Number(opportunity.value || 0);
  const amount = Number(((calculationBase * percentage) / 100).toFixed(2));
  const existingCommission = await tx.commission.findUnique({
    where: { opportunityId: opportunity.id },
    select: { status: true }
  });
  const nextStatus = existingCommission?.status === 'PAID' ? 'PAID' : 'PENDING';

  return tx.commission.upsert({
    where: { opportunityId: opportunity.id },
    create: {
      opportunityId: opportunity.id,
      sellerId: opportunity.ownerId,
      percentage,
      amount,
      calculationBase,
      projectType,
      projectMonths,
      status: nextStatus
    },
    update: {
      sellerId: opportunity.ownerId,
      percentage,
      amount,
      calculationBase,
      projectType,
      projectMonths,
      status: nextStatus
    }
  });
};

const cancelOpenOpportunityCommission = async (tx, opportunityId) => {
  if (!opportunityId) return;
  await tx.commission.updateMany({
    where: {
      opportunityId,
      status: { not: 'PAID' }
    },
    data: { status: 'CANCELLED' }
  });
};

export default async function handler(req) {
  if (req.method === "GET") {
    const { stage, ownerId } = req.query || {};
    
    const where = {};
    if (stage) where.stage = stage;
    if (ownerId) where.ownerId = ownerId;

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        company: {
          include: {
            contacts: {
              where: { isPrimary: true },
              take: 1
            }
          }
        },
        owner: {
          select: { id: true, name: true, email: true }
        },
        products: {
          include: {
            product: true
          }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            assignedTo: {
              select: { name: true }
            }
          }
        },
        commission: true
      },
      orderBy: [
        { stage: 'asc' },
        { expectedCloseDate: 'asc' }
      ]
    });
    
    return Response.json(opportunities);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const projectType = normalizeProjectType(body.projectType);
    const projectMonths = normalizeProjectMonths(projectType, body.projectMonths);
    
    const opportunity = await prisma.$transaction(async (tx) => {
      const created = await tx.opportunity.create({
        data: {
          title: body.title,
          projectType,
          projectMonths,
          description: body.description,
          value: body.value,
          probability: body.probability || 50,
          stage: body.stage || 'LEAD',
          source: body.source,
          expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
          notes: body.notes,
          companyId: body.companyId,
          ownerId: body.ownerId,
          products: body.products ? {
            create: body.products.map(p => ({
              productId: p.productId,
              quantity: p.quantity || 1,
              unitPrice: p.unitPrice,
              discount: p.discount || 0
            }))
          } : undefined
        },
        include: {
          company: true,
          owner: {
            select: { id: true, name: true, email: true }
          },
          products: {
            include: {
              product: true
            }
          }
        }
      });

      if (created.stage === 'WON') {
        await syncWonOpportunityCommission(tx, created);
      }

      return created;
    });
    
    // Atualizar lead score da empresa
    try {
      await updateCompanyLeadScore(body.companyId);
    } catch (error) {
      console.error('Erro ao atualizar lead score:', error);
    }
    
    return Response.json(opportunity);
  }

  if (req.method === "PUT") {
    const body = await req.json();
    const opportunityId = resolveOpportunityId(req, body);

    if (!opportunityId) {
      return new Response('id é obrigatório', { status: 400 });
    }
    
    const updateData = {};
    if (body.stage) updateData.stage = body.stage;
    if (body.title) updateData.title = body.title;
    if (body.projectType !== undefined) {
      updateData.projectType = normalizeProjectType(body.projectType);
      updateData.projectMonths = normalizeProjectMonths(updateData.projectType, body.projectMonths);
    } else if (body.projectMonths !== undefined) {
      updateData.projectMonths = normalizeProjectMonths(body.projectType || 'MONTHLY', body.projectMonths);
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.value) updateData.value = body.value;
    if (body.probability !== undefined) updateData.probability = body.probability;
    if (body.expectedCloseDate) updateData.expectedCloseDate = new Date(body.expectedCloseDate);
    if (body.lossReason) updateData.lossReason = body.lossReason;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    // Se mudou para WON, definir data de fechamento
    if (body.stage === 'WON') {
      updateData.actualCloseDate = new Date();
    }
    
    const opportunity = await prisma.$transaction(async (tx) => {
      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data: updateData,
        include: {
          company: true,
          owner: {
            select: { id: true, name: true, email: true }
          },
          products: {
            include: {
              product: true
            }
          }
        }
      });

      if (updated.stage === 'WON') {
        await syncWonOpportunityCommission(tx, updated);
      } else if (body.stage && body.stage !== 'WON') {
        await cancelOpenOpportunityCommission(tx, updated.id);
      }

      return updated;
    });
    
    // Atualizar lead score da empresa
    try {
      await updateCompanyLeadScore(opportunity.companyId);
    } catch (error) {
      console.error('Erro ao atualizar lead score:', error);
    }
    
    return Response.json(opportunity);
  }

  if (req.method === "DELETE") {
    const body = await req.json().catch(() => ({}));
    const opportunityId = resolveOpportunityId(req, body);

    if (!opportunityId) {
      return new Response('id é obrigatório', { status: 400 });
    }

    const existing = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: {
        id: true,
        companyId: true
      }
    });

    if (!existing) {
      return new Response('Oportunidade não encontrada', { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await runOptionalCleanup(() => tx.preSalesRequest.updateMany({
        where: { opportunityId },
        data: { opportunityId: null }
      }));

      await tx.commission.deleteMany({
        where: { opportunityId }
      });

      await tx.competitorComparison.deleteMany({
        where: { opportunityId }
      });

      const proposals = await tx.proposal.findMany({
        where: { opportunityId },
        select: { id: true }
      });
      const proposalIds = proposals.map((item) => item.id);

      if (proposalIds.length > 0) {
        await tx.proposalItem.deleteMany({
          where: { proposalId: { in: proposalIds } }
        });
      }

      await tx.proposal.deleteMany({
        where: { opportunityId }
      });

      await tx.activity.updateMany({
        where: { opportunityId },
        data: { opportunityId: null }
      });

      await tx.opportunityProduct.deleteMany({
        where: { opportunityId }
      });

      await tx.opportunity.delete({
        where: { id: opportunityId }
      });
    });

    try {
      await updateCompanyLeadScore(existing.companyId);
    } catch (error) {
      console.error('Erro ao atualizar lead score após exclusão:', error);
    }

    return Response.json({ success: true, id: opportunityId });
  }

  return new Response("Method not allowed", { status: 405 });
}
