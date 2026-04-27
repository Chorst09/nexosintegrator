import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { isMaster, normalizeRole } from './lib/permissions.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/licensing', '').replace('/api/licensing', '');

  try {
    // ===== ROTAS PÚBLICAS (sem autenticação) =====

    // GET /licensing/public/plans
    if (path === '/public/plans' && method === 'GET') {
      const plans = await prisma.licensePlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });
      return success(plans);
    }

    // POST /licensing/public/checkout/confirm - Criar empresa + admin + licença
    if (path === '/public/checkout/confirm' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { company, adminUser, planCode, paymentId, paymentReference } = body;

      if (!company?.name || !company?.email || !company?.cnpj) {
        return error('Dados da empresa incompletos', 400);
      }
      if (!adminUser?.name || !adminUser?.email || !adminUser?.password) {
        return error('Dados do administrador incompletos', 400);
      }

      // Verificar se CNPJ já existe
      const existingCompany = await prisma.tenantCompany.findFirst({ where: { cnpj: company.cnpj } });
      if (existingCompany) return error('CNPJ já cadastrado', 409);

      // Verificar se email do admin já existe
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: adminUser.email.toLowerCase(), mode: 'insensitive' } }
      });
      if (existingUser) return error('Email do administrador já está em uso', 409);

      // Buscar plano
      const plan = await prisma.licensePlan.findFirst({
        where: { code: planCode || 'MENSAL', isActive: true }
      });

      // Criar empresa tenant
      const tenant = await prisma.tenantCompany.create({
        data: {
          name: company.name,
          cnpj: company.cnpj,
          email: company.email,
          phone: company.phone || null,
          status: 'ACTIVE'
        }
      });

      // Criar licença se plano existir
      if (plan) {
        const startDate = new Date();
        const endDate = new Date();
        if (plan.billingCycle === 'MONTHLY') endDate.setMonth(endDate.getMonth() + 1);
        else if (plan.billingCycle === 'QUARTERLY') endDate.setMonth(endDate.getMonth() + 3);
        else if (plan.billingCycle === 'SEMIANNUAL') endDate.setMonth(endDate.getMonth() + 6);
        else endDate.setFullYear(endDate.getFullYear() + 1);

        await prisma.companyLicense.create({
          data: {
            tenantCompanyId: tenant.id,
            planId: plan.id,
            status: 'ACTIVE',
            seats: plan.seatsIncluded || 1,
            startDate,
            endDate,
            priceAtPurchase: plan.price,
            paymentReference: paymentReference || paymentId || null,
            paymentStatus: 'CONFIRMED',
            paymentConfirmedAt: new Date()
          }
        });
      }

      // Criar usuário admin
      const bcryptLib = await import('bcryptjs');
      const hashedPassword = await bcryptLib.default.hash(adminUser.password, 10);
      const newUser = await prisma.user.create({
        data: {
          name: adminUser.name,
          email: adminUser.email.toLowerCase(),
          password: hashedPassword,
          role: 'ADMIN',
          tenantCompanyId: tenant.id,
          accessB2B: true,
          accessB2G: true,
          accessPreSales: true,
          isCompanyOwner: true
        }
      });

      return success({
        message: 'Empresa criada com sucesso',
        company: { id: tenant.id, name: tenant.name },
        user: { id: newUser.id, email: newUser.email, role: newUser.role }
      }, 201);
    }

    // ===== ROTAS AUTENTICADAS =====
    const user = await authenticateUser(event.headers);
    const role = normalizeRole(user.actualRole || user.role);
    const isAdmin = role === 'MASTER' || role === 'ADMIN';

    // GET /licensing/plans
    if (path === '/plans' && method === 'GET') {
      const plans = await prisma.licensePlan.findMany({ orderBy: { sortOrder: 'asc' } });
      return success(plans);
    }

    // GET /licensing/companies
    if (path === '/companies' && method === 'GET') {
      if (!isAdmin) return error('Acesso negado', 403);
      const companies = await prisma.tenantCompany.findMany({
        include: {
          licenses: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { users: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return success(companies);
    }

    // POST /licensing/companies
    if (path === '/companies' && method === 'POST') {
      if (!isMaster(user)) return error('Acesso negado', 403);
      const body = JSON.parse(event.body || '{}');
      const tenant = await prisma.tenantCompany.create({
        data: { name: body.name, legalName: body.legalName, cnpj: body.cnpj, email: body.email, phone: body.phone, status: body.status || 'PROSPECT', notes: body.notes }
      });
      return success(tenant, 201);
    }

    // GET /licensing/companies/:id/users
    const usersMatch = path.match(/^\/companies\/([^/]+)\/users$/);
    if (usersMatch && method === 'GET') {
      if (!isAdmin) return error('Acesso negado', 403);
      const companyId = usersMatch[1];
      const users = await prisma.user.findMany({
        where: { tenantCompanyId: companyId },
        select: { id: true, name: true, email: true, role: true, createdAt: true, accessB2B: true, accessB2G: true, accessPreSales: true }
      });
      return success(users);
    }

    // GET/POST /licensing/companies/:id/license
    const licenseMatch = path.match(/^\/companies\/([^/]+)\/license$/);
    if (licenseMatch) {
      if (!isAdmin) return error('Acesso negado', 403);
      const companyId = licenseMatch[1];

      if (method === 'GET') {
        const license = await prisma.companyLicense.findFirst({
          where: { tenantCompanyId: companyId },
          include: { plan: true },
          orderBy: { createdAt: 'desc' }
        });
        return success(license);
      }

      if (method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const license = await prisma.companyLicense.create({
          data: {
            tenantCompanyId: companyId,
            planId: body.planId,
            status: body.status || 'ACTIVE',
            seats: body.seats || 1,
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            priceAtPurchase: body.priceAtPurchase || 0
          },
          include: { plan: true }
        });
        return success(license, 201);
      }
    }

    // DELETE /licensing/companies/:id
    const deleteMatch = path.match(/^\/companies\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      if (!isMaster(user)) return error('Acesso negado', 403);
      const companyId = deleteMatch[1];
      await prisma.tenantCompany.delete({ where: { id: companyId } });
      return success({ message: 'Empresa removida' });
    }

    // GET /licensing/permissions/templates
    if (path === '/permissions/templates' && method === 'GET') {
      return success({
        MASTER: { dashboard: true, leads: true, oportunidades: true, precificacao: true, administracaoLicenciamento: true, administracaoUsuarios: true, billing: true, integrations: true },
        ADMIN: { dashboard: true, leads: true, oportunidades: true, precificacao: true, administracaoLicenciamento: true, administracaoUsuarios: true, billing: true, integrations: true },
        MANAGER: { dashboard: true, leads: true, oportunidades: true, precificacao: true, administracaoLicenciamento: false, administracaoUsuarios: true, billing: false, integrations: true },
        SELLER: { dashboard: true, leads: true, oportunidades: true, precificacao: false, administracaoLicenciamento: false, administracaoUsuarios: false, billing: false, integrations: false },
        USER: { dashboard: true, leads: true, oportunidades: true, precificacao: false, administracaoLicenciamento: false, administracaoUsuarios: false, billing: false, integrations: false },
        PRE_SALES: { dashboard: true, leads: true, oportunidades: true, precificacao: true, administracaoLicenciamento: false, administracaoUsuarios: false, billing: false, integrations: false }
      });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em licensing:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
