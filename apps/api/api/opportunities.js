import { prisma } from "../lib/prisma.js";
import { updateCompanyLeadScore } from '../lib/leadScoring.js';
import { syncCompanyStatusWithOpportunityPipeline } from '../lib/companyStatus.js';
import {
  normalizeProjectClientType,
  normalizeProjectName
} from '../lib/opportunityProject.js';

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

const runOptionalCleanup = async (operation) => {
  try {
    await operation();
  } catch (error) {
    if (!isSchemaDriftError(error)) {
      throw error;
    }
  }
};

export default async function handler(req) {
  if (req.method === "GET") {
    const { stage, ownerId } = req.query || {};

    const where = {};
    if (stage) where.stage = stage;
    if (ownerId) where.ownerId = ownerId;
    if (req.user?.role === 'SELLER') where.ownerId = req.user.userId;

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

    const resolvedOwnerId = req.user?.role === 'SELLER' ? req.user.userId : body.ownerId;
    if (!resolvedOwnerId) {
      return new Response('ownerId é obrigatório', { status: 400 });
    }
    
    const opportunity = await prisma.opportunity.create({
      data: {
        title: body.title || normalizeProjectName(body.projectName, 'Oportunidade sem titulo'),
        projectName: normalizeProjectName(body.projectName, body.title || 'Projeto sem nome'),
        projectClientType: normalizeProjectClientType(body.projectClientType),
        description: body.description,
        value: body.value,
        probability: body.probability || 50,
        stage: body.stage || 'LEAD',
        b2gStage: body.b2gStage || null,
        source: body.source,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
        notes: body.notes,
        companyId: body.companyId,
        ownerId: resolvedOwnerId,
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
    
    // Atualizar lead score da empresa
    try {
      await updateCompanyLeadScore(body.companyId);
      await syncCompanyStatusWithOpportunityPipeline(body.companyId);
    } catch (error) {
      console.error('Erro ao atualizar dados derivados da empresa:', error);
    }
    
    return Response.json(opportunity);
  }

  if (req.method === "PUT") {
    const body = await req.json();
    const opportunityId = resolveOpportunityId(req, body);

    if (!opportunityId) {
      return new Response('id é obrigatório', { status: 400 });
    }

    if (req.user?.role === 'SELLER') {
      const existing = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { ownerId: true }
      });
      if (!existing) return new Response('Not found', { status: 404 });
      if (existing.ownerId !== req.user.userId) {
        return new Response('Forbidden', { status: 403 });
      }
    }
    
    const updateData = {};
    if (body.stage) updateData.stage = body.stage;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.projectName !== undefined) {
      updateData.projectName = normalizeProjectName(
        body.projectName,
        body.title || 'Projeto sem nome'
      );
    }
    if (body.projectClientType !== undefined) {
      updateData.projectClientType = normalizeProjectClientType(body.projectClientType);
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.probability !== undefined) updateData.probability = body.probability;
    if (body.b2gStage !== undefined) updateData.b2gStage = body.b2gStage || null;
    if (body.expectedCloseDate) updateData.expectedCloseDate = new Date(body.expectedCloseDate);
    if (body.lossReason) updateData.lossReason = body.lossReason;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    // Se mudou para WON, definir data de fechamento
    if (body.stage === 'WON') {
      updateData.actualCloseDate = new Date();
    }
    
    const opportunity = await prisma.opportunity.update({
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
    
    // Atualizar lead score da empresa
    try {
      await updateCompanyLeadScore(opportunity.companyId);
      await syncCompanyStatusWithOpportunityPipeline(opportunity.companyId);
    } catch (error) {
      console.error('Erro ao atualizar dados derivados da empresa:', error);
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
        ownerId: true,
        companyId: true
      }
    });

    if (!existing) {
      return new Response('Oportunidade não encontrada', { status: 404 });
    }

    if (req.user?.role === 'SELLER' && existing.ownerId !== req.user.userId) {
      return new Response('Forbidden', { status: 403 });
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
      await syncCompanyStatusWithOpportunityPipeline(existing.companyId);
    } catch (error) {
      console.error('Erro ao atualizar dados derivados da empresa após exclusão:', error);
    }

    return Response.json({ success: true, id: opportunityId });
  }

  return new Response("Method not allowed", { status: 405 });
}
