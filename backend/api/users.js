import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = (() => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) throw new Error('JWT_SECRET precisa estar configurado');
  return secret;
})();

const getSessionRole = (req) => {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (!token) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Token de acesso requerido' }),
        { status: 401 }
      )
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { role: decoded?.role || null };
  } catch {
    return {
      error: new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 403 }
      )
    };
  }
};

const normalizeRole = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'PRE-VENDAS' || raw === 'PREVENDAS') return 'PRE_SALES';
  if (raw === 'USUARIO') return 'USER';
  return raw || 'SELLER';
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const resolveUserAccess = (role, input = {}) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'MASTER' || normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER') {
    return { accessB2B: true, accessB2G: true, accessPreSales: true };
  }

  if (normalizedRole === 'DIRECTOR') {
    return { accessB2B: true, accessB2G: true, accessPreSales: false };
  }

  if (normalizedRole === 'PRE_SALES') {
    return { accessB2B: false, accessB2G: false, accessPreSales: true };
  }

  const accessB2B = input.accessB2B !== undefined ? Boolean(input.accessB2B) : true;
  const accessB2G = input.accessB2G !== undefined ? Boolean(input.accessB2G) : false;

  return {
    accessB2B: accessB2B || !accessB2G,
    accessB2G,
    accessPreSales: false
  };
};

export default async function handler(req) {
  if (req.method === 'GET') {
    const { role, active } = req.query || {};
    const session = getSessionRole(req);
    if (session.error) return session.error;
    const userRole = session.role;
    const isMasterSession = userRole === 'MASTER';
    
    const where = {};
    if (role) where.role = normalizeRole(role);
    
    if (!isMasterSession && role === 'MASTER') {
      return Response.json([]);
    }

    // Apenas MASTER pode listar usuários MASTER.
    if (!isMasterSession && !role) {
      where.role = { not: 'MASTER' };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        region: true,
        quota: true,
        accessB2B: true,
        accessB2G: true,
        accessPreSales: true,
        commissionSalePercentage: true,
        commissionProject12: true,
        commissionProject24: true,
        commissionProject36: true,
        commissionProject48: true,
        commissionProject60: true,
        createdAt: true,
        _count: {
          select: {
            opportunities: true,
            activities: true,
            commissions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    return Response.json(users);
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const session = getSessionRole(req);
    if (session.error) return session.error;
    const userRole = session.role;
    const isMasterSession = userRole === 'MASTER';
    const role = normalizeRole(body.role || 'SELLER');
    
    // Apenas MASTER pode criar usuários MASTER.
    if (!isMasterSession && role === 'MASTER') {
      return new Response(
        JSON.stringify({ error: 'Apenas usuários MASTER podem criar usuários MASTER' }),
        { status: 403 }
      );
    }

    if (!body?.name || !body?.email || !body?.password) {
      return Response.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const email = normalizeEmail(body.email);
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return Response.json({ error: 'Email já está em uso' }, { status: 409 });
    }

    const access = resolveUserAccess(role, body);
    const hashedPassword = await bcrypt.hash(body.password, 10);
    
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        password: hashedPassword,
        role,
        regionId: body.regionId || null,
        quota: body.quota,
        accessB2B: access.accessB2B,
        accessB2G: access.accessB2G,
        accessPreSales: access.accessPreSales,
        commissionSalePercentage: body.commissionSalePercentage ?? null,
        commissionProject12: body.commissionProject12 ?? null,
        commissionProject24: body.commissionProject24 ?? null,
        commissionProject36: body.commissionProject36 ?? null,
        commissionProject48: body.commissionProject48 ?? null,
        commissionProject60: body.commissionProject60 ?? null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        region: true,
        quota: true,
        accessB2B: true,
        accessB2G: true,
        accessPreSales: true,
        commissionSalePercentage: true,
        commissionProject12: true,
        commissionProject24: true,
        commissionProject36: true,
        commissionProject48: true,
        commissionProject60: true,
        createdAt: true
      }
    });
    return Response.json(user);
  }

  if (req.method === 'PUT') {
    const body = await req.json();
    const session = getSessionRole(req);
    if (session.error) return session.error;
    const userRole = session.role;
    const isMasterSession = userRole === 'MASTER';
    
    // Verificar se está tentando editar um usuário MASTER
    const targetUser = await prisma.user.findUnique({
      where: { id: body.id },
      select: { role: true }
    });
    
    if (targetUser?.role === 'MASTER' && !isMasterSession) {
      return new Response(
        JSON.stringify({ error: 'Apenas usuários MASTER podem editar usuários MASTER' }),
        { status: 403 }
      );
    }
    
    // Apenas MASTER pode promover usuários para MASTER.
    const nextRole = body.role ? normalizeRole(body.role) : normalizeRole(targetUser?.role);

    if (!isMasterSession && nextRole === 'MASTER') {
      return new Response(
        JSON.stringify({ error: 'Apenas usuários MASTER podem promover usuários para MASTER' }),
        { status: 403 }
      );
    }

    const access = resolveUserAccess(nextRole, body);

    const updateData = {
      name: body.name,
      email: body.email ? normalizeEmail(body.email) : undefined,
      role: nextRole,
      regionId: body.regionId || null,
      quota: body.quota,
      accessB2B: access.accessB2B,
      accessB2G: access.accessB2G,
      accessPreSales: access.accessPreSales,
      commissionSalePercentage: body.commissionSalePercentage ?? null,
      commissionProject12: body.commissionProject12 ?? null,
      commissionProject24: body.commissionProject24 ?? null,
      commissionProject36: body.commissionProject36 ?? null,
      commissionProject48: body.commissionProject48 ?? null,
      commissionProject60: body.commissionProject60 ?? null
    };

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    
    const user = await prisma.user.update({
      where: { id: body.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        region: true,
        quota: true,
        accessB2B: true,
        accessB2G: true,
        accessPreSales: true,
        commissionSalePercentage: true,
        commissionProject12: true,
        commissionProject24: true,
        commissionProject36: true,
        commissionProject48: true,
        commissionProject60: true,
        createdAt: true
      }
    });
    return Response.json(user);
  }

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    const id = body?.id || req.query?.id;
    const session = getSessionRole(req);
    if (session.error) return session.error;
    const userRole = session.role;
    const isMasterSession = userRole === 'MASTER';

    if (!id) {
      return Response.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Verificar se está tentando excluir um usuário MASTER
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true }
    });

    if (!targetUser) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (targetUser.role === 'MASTER' && !isMasterSession) {
      return new Response(
        JSON.stringify({ error: 'Apenas usuários MASTER podem excluir usuários MASTER' }),
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return Response.json({ message: 'Usuário excluído com sucesso' });
  }

  return new Response('Method not allowed', { status: 405 });
}
