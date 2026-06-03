import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

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

export default async function handler(req) {
  if (req.method === 'GET') {
    const { role, active } = req.query || {};
    const session = getSessionRole(req);
    if (session.error) return session.error;
    const userRole = session.role;
    const isMasterSession = userRole === 'MASTER';
    
    const where = {};
    if (role) where.role = role;
    
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
    
    // Apenas MASTER pode criar usuários MASTER.
    if (!isMasterSession && body.role === 'MASTER') {
      return new Response(
        JSON.stringify({ error: 'Apenas usuários MASTER podem criar usuários MASTER' }),
        { status: 403 }
      );
    }
    
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role || 'SELLER',
        region: body.region,
        quota: body.quota
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        region: true,
        quota: true,
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
    if (!isMasterSession && body.role === 'MASTER') {
      return new Response(
        JSON.stringify({ error: 'Apenas usuários MASTER podem promover usuários para MASTER' }),
        { status: 403 }
      );
    }
    
    const user = await prisma.user.update({
      where: { id: body.id },
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        region: body.region,
        quota: body.quota
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        region: true,
        quota: true,
        createdAt: true
      }
    });
    return Response.json(user);
  }

  return new Response('Method not allowed', { status: 405 });
}
