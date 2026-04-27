import bcrypt from 'bcryptjs';
import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { normalizeRole, resolveUserAccess, isMaster } from './lib/permissions.js';

const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

const canManageUsers = (user) => {
  const role = normalizeRole(user?.actualRole || user?.role);
  return role === 'ADMIN' || role === 'MASTER';
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  regionId: user.regionId || null,
  region: user.region || null,
  quota: user.quota,
  tenantCompanyId: user.tenantCompanyId || null,
  accessB2B: Boolean(user.accessB2B),
  accessB2G: Boolean(user.accessB2G),
  accessPreSales: Boolean(user.accessPreSales),
  isCompanyOwner: Boolean(user.isCompanyOwner),
  permissionOverrides: user.permissionOverrides || {},
  createdAt: user.createdAt,
  _count: user._count
});

const userSelect = {
  id: true, name: true, email: true, role: true,
  regionId: true, region: { select: { id: true, name: true, code: true } },
  quota: true, tenantCompanyId: true,
  accessB2B: true, accessB2G: true, accessPreSales: true,
  permissionOverrides: true, isCompanyOwner: true, createdAt: true,
  _count: { select: { opportunities: true, activities: true, commissions: true } }
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/users', '').replace('/api/users', '');

  try {
    const reqUser = await authenticateUser(event.headers);

    // GET /users
    if (method === 'GET') {
      const role = event.queryStringParameters?.role;
      const requesterRole = normalizeRole(reqUser?.actualRole || reqUser?.role);

      // Usuários comuns só veem a si mesmos
      if (['USER', 'SELLER', 'PRE_SALES'].includes(requesterRole)) {
        const me = await prisma.user.findUnique({ where: { id: reqUser.id }, select: userSelect });
        return success(me ? [sanitizeUser(me)] : []);
      }

      const where = {};
      if (role) where.role = normalizeRole(role);
      if (!isMaster(reqUser) && reqUser?.tenantCompanyId) {
        where.tenantCompanyId = reqUser.tenantCompanyId;
      }

      const users = await prisma.user.findMany({ where, select: userSelect, orderBy: { name: 'asc' } });
      return success(users.map(sanitizeUser));
    }

    // POST /users - criar usuário
    if (method === 'POST' && path === '') {
      if (!canManageUsers(reqUser)) return error('Acesso negado', 403);

      const body = JSON.parse(event.body || '{}');
      if (!body?.name || !body?.email || !body?.password) {
        return error('Nome, email e senha são obrigatórios', 400);
      }

      const normalizedEmail = normalizeEmail(body.email);
      const role = normalizeRole(body.role || 'USER');

      if (role === 'MASTER' && !isMaster(reqUser)) {
        return error('Apenas MASTER pode criar usuário MASTER', 403);
      }

      const existing = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { id: true }
      });
      if (existing) return error('Email já está em uso', 409);

      const tenantCompanyId = isMaster(reqUser) ? (body.tenantCompanyId || null) : (reqUser?.tenantCompanyId || null);
      const access = resolveUserAccess(role, { accessB2B: body.accessB2B, accessB2G: body.accessB2G, accessPreSales: body.accessPreSales });
      const hashedPassword = await bcrypt.hash(body.password, 10);

      const user = await prisma.user.create({
        data: {
          name: body.name, email: normalizedEmail, password: hashedPassword, role,
          regionId: body.regionId || null, quota: body.quota, tenantCompanyId,
          accessB2B: access.accessB2B, accessB2G: access.accessB2G, accessPreSales: access.accessPreSales,
          permissionOverrides: body.permissionOverrides && typeof body.permissionOverrides === 'object' ? body.permissionOverrides : {},
          isCompanyOwner: Boolean(body.isCompanyOwner) && role === 'ADMIN'
        },
        select: userSelect
      });

      return success(sanitizeUser(user), 201);
    }

    // PUT /users/:id - atualizar usuário
    if (method === 'PUT') {
      if (!canManageUsers(reqUser)) return error('Acesso negado', 403);

      const body = JSON.parse(event.body || '{}');
      const id = path.startsWith('/') ? path.substring(1) : body.id;
      if (!id) return error('ID é obrigatório', 400);

      const current = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, tenantCompanyId: true, isCompanyOwner: true } });
      if (!current) return error('Usuário não encontrado', 404);

      if (!isMaster(reqUser) && current.tenantCompanyId !== reqUser?.tenantCompanyId) {
        return error('Sem permissão para editar usuário de outra empresa', 403);
      }

      const nextRole = body.role ? normalizeRole(body.role) : normalizeRole(current.role);
      if (nextRole === 'MASTER' && !isMaster(reqUser)) return error('Apenas MASTER pode atribuir role MASTER', 403);
      if (current.isCompanyOwner && !isMaster(reqUser) && nextRole !== 'ADMIN') return error('Não é permitido remover role ADMIN do dono da empresa', 403);

      const access = resolveUserAccess(nextRole, { accessB2B: body.accessB2B, accessB2G: body.accessB2G, accessPreSales: body.accessPreSales });

      const updateData = {
        name: body.name, email: body.email ? normalizeEmail(body.email) : undefined,
        role: nextRole, regionId: body.regionId, quota: body.quota,
        accessB2B: access.accessB2B, accessB2G: access.accessB2G, accessPreSales: access.accessPreSales,
        permissionOverrides: body.permissionOverrides && typeof body.permissionOverrides === 'object' ? body.permissionOverrides : undefined,
        isCompanyOwner: body.isCompanyOwner !== undefined ? Boolean(body.isCompanyOwner) : undefined,
        tenantCompanyId: isMaster(reqUser) && body.tenantCompanyId !== undefined ? body.tenantCompanyId : undefined
      };

      if (body.password) updateData.password = await bcrypt.hash(body.password, 10);
      Object.keys(updateData).forEach((k) => { if (updateData[k] === undefined) delete updateData[k]; });

      const user = await prisma.user.update({ where: { id }, data: updateData, select: userSelect });
      return success(sanitizeUser(user));
    }

    // DELETE /users/:id
    if (method === 'DELETE') {
      if (!canManageUsers(reqUser)) return error('Acesso negado', 403);

      const body = JSON.parse(event.body || '{}');
      const id = path.startsWith('/') ? path.substring(1) : body.id;
      if (!id) return error('ID é obrigatório', 400);

      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, tenantCompanyId: true, isCompanyOwner: true } });
      if (!user) return error('Usuário não encontrado', 404);
      if (!isMaster(reqUser) && user.tenantCompanyId !== reqUser?.tenantCompanyId) return error('Sem permissão', 403);
      if (user.isCompanyOwner) return error('Não é permitido excluir o dono da empresa', 403);

      await prisma.user.delete({ where: { id } });
      return success({ message: 'Usuário excluído com sucesso' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em users:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
