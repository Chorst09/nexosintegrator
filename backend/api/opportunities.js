import { prisma } from "../lib/prisma.js";
import { updateCompanyLeadScore } from '../lib/leadScoring.js';

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
    
    const opportunity = await prisma.opportunity.create({
      data: {
        title: body.title,
        description: body.description,
        value: body.value,
        probability: body.probability || 50,
        stage: body.stage || 'LEAD',
        source: body.source,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
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
    
    const updateData = {};
    if (body.stage) updateData.stage = body.stage;
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.value) updateData.value = body.value;
    if (body.probability !== undefined) updateData.probability = body.probability;
    if (body.expectedCloseDate) updateData.expectedCloseDate = new Date(body.expectedCloseDate);
    if (body.lossReason) updateData.lossReason = body.lossReason;
    
    // Se mudou para WON, definir data de fechamento
    if (body.stage === 'WON') {
      updateData.actualCloseDate = new Date();
    }
    
    const opportunity = await prisma.opportunity.update({
      where: { id: body.id },
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
    } catch (error) {
      console.error('Erro ao atualizar lead score:', error);
    }
    
    return Response.json(opportunity);
  }

  return new Response("Method not allowed", { status: 405 });
}

