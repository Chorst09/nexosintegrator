import { prisma } from '../lib/prisma.js';
import { updateCompanyLeadScore } from '../lib/leadScoring.js';
import { createOpportunityForLead, DISTRIBUTION_STRATEGIES } from '../lib/leadDistribution.js';

export default async function handler(req) {
  if (req.method === 'GET') {
    const companies = await prisma.company.findMany({
      include: {
        contacts: true,
        opportunities: {
          include: {
            owner: true
          }
        },
        _count: {
          select: {
            opportunities: true,
            activities: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return Response.json(companies);
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const company = await prisma.company.create({
      data: {
        name: body.name,
        document: body.document,
        segment: body.segment,
        size: body.size,
        website: body.website,
        address: body.address,
        city: body.city,
        state: body.state,
        status: body.status || 'LEAD',
        contacts: body.contacts ? {
          create: body.contacts.map(contact => ({
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            position: contact.position,
            isPrimary: contact.isPrimary || false
          }))
        } : undefined
      },
      include: {
        contacts: true
      }
    });
    
    // Calcular lead score automaticamente
    try {
      await updateCompanyLeadScore(company.id);
    } catch (error) {
      console.error('Erro ao calcular lead score:', error);
    }
    
    // Se é um lead, criar oportunidade e distribuir automaticamente
    if (company.status === 'LEAD') {
      try {
        const distributionResult = await createOpportunityForLead(
          company.id, 
          DISTRIBUTION_STRATEGIES.SCORE_BASED
        );
        
        return Response.json({
          ...company,
          autoDistribution: distributionResult
        });
      } catch (error) {
        console.error('Erro na distribuição automática:', error);
        // Retorna a empresa mesmo se a distribuição falhar
        return Response.json(company);
      }
    }
    
    return Response.json(company);
  }

  if (req.method === 'PUT') {
    const body = await req.json();
    const company = await prisma.company.update({
      where: { id: body.id },
      data: {
        name: body.name,
        document: body.document,
        segment: body.segment,
        size: body.size,
        website: body.website,
        address: body.address,
        city: body.city,
        state: body.state,
        status: body.status,
        leadScore: body.leadScore
      },
      include: {
        contacts: true,
        opportunities: true
      }
    });
    
    // Recalcular lead score automaticamente
    try {
      await updateCompanyLeadScore(company.id);
    } catch (error) {
      console.error('Erro ao recalcular lead score:', error);
    }
    
    return Response.json(company);
  }

  return new Response('Method not allowed', { status: 405 });
}