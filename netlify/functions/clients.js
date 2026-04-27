import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS();
  }

  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/clients', '').replace('/api/clients', '');

  try {
    const user = await authenticateUser(event.headers);

    // GET /clients - Listar clientes
    if (path === '' && method === 'GET') {
      const where = {};
      
      // Filtrar por região se for vendedor
      if (user.role === 'SELLER') {
        where.OR = [
          user.regionId ? { regionId: user.regionId } : undefined,
          { opportunities: { some: { ownerId: user.userId } } }
        ].filter(Boolean);
      }

      // Filtrar por tenant se não for MASTER
      if (user.tenantCompanyId && user.role !== 'MASTER') {
        where.tenantCompanyId = user.tenantCompanyId;
      }

      const companies = await prisma.company.findMany({
        where,
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1
          },
          _count: {
            select: {
              opportunities: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Mapear para formato de client (compatibilidade)
      const clients = companies.map(company => ({
        id: company.id,
        name: company.name,
        contact: company.contacts[0]?.name || 'Sem contato',
        email: company.contacts[0]?.email || null,
        phone: company.contacts[0]?.phone || null,
        status: company.status,
        createdAt: company.createdAt,
        deals: company._count.opportunities
      }));

      return success(clients);
    }

    // GET /clients/:id - Buscar cliente específico
    if (path.startsWith('/') && method === 'GET') {
      const id = path.substring(1);
      
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          contacts: true,
          opportunities: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!company) {
        return error('Cliente não encontrado', 404);
      }

      // Verificar permissão
      if (user.tenantCompanyId && user.role !== 'MASTER' && company.tenantCompanyId !== user.tenantCompanyId) {
        return error('Acesso negado', 403);
      }

      return success(company);
    }

    // POST /clients - Criar novo cliente
    if (path === '' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (!body.name) {
        return error('Nome do cliente é obrigatório', 400);
      }

      const regionId = user.role === 'SELLER' ? (user.regionId || null) : (body.regionId || null);

      const company = await prisma.company.create({
        data: {
          name: body.name,
          document: body.document || null,
          segment: body.segment || null,
          status: body.status || 'LEAD',
          regionId,
          tenantCompanyId: user.tenantCompanyId || null,
          contacts: {
            create: {
              name: body.contact || body.contactName || 'Contato Principal',
              email: body.email || body.contactEmail || null,
              phone: body.phone || body.contactPhone || null,
              position: body.contactPosition || null,
              isPrimary: true
            }
          }
        },
        include: {
          contacts: true
        }
      });

      return success({
        id: company.id,
        name: company.name,
        contact: company.contacts[0]?.name || 'Sem contato',
        email: company.contacts[0]?.email || null,
        phone: company.contacts[0]?.phone || null,
        status: company.status,
        createdAt: company.createdAt
      }, 201);
    }

    // PUT /clients/:id - Atualizar cliente
    if (path.startsWith('/') && method === 'PUT') {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');

      // Verificar se existe
      const existing = await prisma.company.findUnique({
        where: { id }
      });

      if (!existing) {
        return error('Cliente não encontrado', 404);
      }

      // Verificar permissão
      if (user.tenantCompanyId && user.role !== 'MASTER' && existing.tenantCompanyId !== user.tenantCompanyId) {
        return error('Acesso negado', 403);
      }

      const updateData = {
        name: body.name,
        document: body.document,
        segment: body.segment,
        status: body.status,
        regionId: body.regionId
      };

      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      const company = await prisma.company.update({
        where: { id },
        data: updateData,
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1
          }
        }
      });

      return success({
        id: company.id,
        name: company.name,
        contact: company.contacts[0]?.name || 'Sem contato',
        email: company.contacts[0]?.email || null,
        phone: company.contacts[0]?.phone || null,
        status: company.status,
        createdAt: company.createdAt
      });
    }

    // DELETE /clients/:id - Deletar cliente
    if (path.startsWith('/') && method === 'DELETE') {
      const id = path.substring(1);

      // Verificar se existe
      const existing = await prisma.company.findUnique({
        where: { id }
      });

      if (!existing) {
        return error('Cliente não encontrado', 404);
      }

      // Verificar permissão
      if (user.tenantCompanyId && user.role !== 'MASTER' && existing.tenantCompanyId !== user.tenantCompanyId) {
        return error('Acesso negado', 403);
      }

      // Verificar se tem oportunidades
      const opportunitiesCount = await prisma.opportunity.count({
        where: { companyId: id }
      });

      if (opportunitiesCount > 0) {
        return error('Não é possível deletar cliente com oportunidades associadas', 400);
      }

      await prisma.company.delete({
        where: { id }
      });

      return success({ message: 'Cliente deletado com sucesso' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro na função clients:', err);
    return error(err.message || 'Erro interno do servidor', 500);
  }
}
