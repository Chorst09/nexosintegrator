import { prisma } from '../lib/prisma.js';
import { updateCompanyLeadScore } from '../lib/leadScoring.js';
import { createOpportunityForLead, DISTRIBUTION_STRATEGIES } from '../lib/leadDistribution.js';

const parsePathIdFromUrl = (urlValue) => {
  if (!urlValue) return null;

  const cleanPath = String(urlValue).split('?')[0];
  const segments = cleanPath
    .split('/')
    .filter(Boolean)
    .filter((segment) => !['api', 'companies'].includes(segment));
  return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : null;
};

const resolveCompanyId = (req, body) =>
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

export default async function handler(req) {
  if (req.method === 'GET') {
    const clientType = String(req.query?.clientType || '').toUpperCase();
    const where = clientType === 'B2B' || clientType === 'B2G' ? { clientType } : {};
    const id = resolveCompanyId(req, {});
    
    if (id) {
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          contacts: true,
          opportunities: {
            include: {
              owner: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          activities: {
            include: {
              assignedTo: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              opportunities: true,
              activities: true,
              contracts: true
            }
          }
        }
      });
      
      if (!company) {
        return new Response('Empresa não encontrada', { status: 404 });
      }
      
      return Response.json(company);
    }
    
    const companies = await prisma.company.findMany({
      where,
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
    const autoDistribute = body.autoDistribute !== false;
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
        leadScore: Number.isFinite(Number(body.leadScore)) ? Number(body.leadScore) : undefined,
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
    if (company.status === 'LEAD' && autoDistribute) {
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
    const companyId = resolveCompanyId(req, body);

    if (!companyId) return new Response('id é obrigatório', { status: 400 });

    const company = await prisma.company.update({
      where: { id: companyId },
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

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    const companyId = resolveCompanyId(req, body);

    if (!companyId) return new Response('id é obrigatório', { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true }
    });

    if (!company) return new Response('Empresa não encontrada', { status: 404 });

    await prisma.$transaction(async (tx) => {
      const companyOpportunities = await tx.opportunity.findMany({
        where: { companyId },
        select: { id: true }
      });
      const opportunityIds = companyOpportunities.map((item) => item.id);

      if (opportunityIds.length > 0) {
        await runOptionalCleanup(() => tx.preSalesRequest.updateMany({
          where: { opportunityId: { in: opportunityIds } },
          data: { opportunityId: null }
        }));

        await tx.commission.deleteMany({
          where: { opportunityId: { in: opportunityIds } }
        });

        await tx.competitorComparison.deleteMany({
          where: { opportunityId: { in: opportunityIds } }
        });

        const proposals = await tx.proposal.findMany({
          where: { opportunityId: { in: opportunityIds } },
          select: { id: true }
        });
        const proposalIds = proposals.map((item) => item.id);

        if (proposalIds.length > 0) {
          await tx.proposalItem.deleteMany({
            where: { proposalId: { in: proposalIds } }
          });
        }

        await tx.proposal.deleteMany({
          where: { opportunityId: { in: opportunityIds } }
        });

        await tx.activity.updateMany({
          where: { opportunityId: { in: opportunityIds } },
          data: { opportunityId: null }
        });

        await tx.opportunityProduct.deleteMany({
          where: { opportunityId: { in: opportunityIds } }
        });

        await tx.opportunity.deleteMany({
          where: { id: { in: opportunityIds } }
        });
      }

      const companyContracts = await tx.contract.findMany({
        where: { companyId },
        select: { id: true }
      });
      const contractIds = companyContracts.map((item) => item.id);

      if (contractIds.length > 0) {
        await runOptionalCleanup(() => tx.customerOnboarding.updateMany({
          where: { contractId: { in: contractIds } },
          data: { contractId: null }
        }));

        await runOptionalCleanup(() => tx.nPSSurvey.updateMany({
          where: { contractId: { in: contractIds } },
          data: { contractId: null }
        }));

        await runOptionalCleanup(() => tx.contractAttachment.deleteMany({
          where: { contractId: { in: contractIds } }
        }));

        await tx.contract.deleteMany({
          where: { id: { in: contractIds } }
        });
      }

      await tx.activity.updateMany({
        where: { companyId },
        data: { companyId: null }
      });

      await tx.contact.deleteMany({
        where: { companyId }
      });

      await runOptionalCleanup(() => tx.supportTicket.updateMany({
        where: { companyId },
        data: { companyId: null }
      }));

      await runOptionalCleanup(() => tx.nPSSurvey.updateMany({
        where: { companyId },
        data: { companyId: null }
      }));

      await runOptionalCleanup(() => tx.preSalesRequest.updateMany({
        where: { leadId: companyId },
        data: { leadId: null }
      }));

      await runOptionalCleanup(() => tx.onboardingStep.deleteMany({
        where: {
          onboarding: {
            companyId
          }
        }
      }));

      await runOptionalCleanup(() => tx.customerOnboarding.deleteMany({
        where: { companyId }
      }));

      await runOptionalCleanup(() => tx.churnAlert.deleteMany({
        where: { companyId }
      }));

      await runOptionalCleanup(() => tx.companyDocument.deleteMany({
        where: { companyId }
      }));

      await tx.company.delete({
        where: { id: companyId }
      });
    });

    return Response.json({ success: true, message: 'Empresa excluída com sucesso' });
  }

  return new Response('Method not allowed', { status: 405 });
}
