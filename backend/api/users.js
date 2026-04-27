import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req) {
  if (req.method === 'GET') {
    const { role, active } = req.query || {};
    
    // Obter role do usuário logado do token
    const token = req.headers?.authorization?.replace('Bearer ', '');
    let userRole = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role;
      } catch (e) {
        // Token inválido, continuar sem filtro
      }
    }
    
    const where = {};
    if (role) where.role = role;
    
    // Se o usuário é ADMIN, não pode ver usuários MASTER
    if (userRole === 'ADMIN') {
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
    
    // Obter role do usuário logado
    const token = req.headers?.authorization?.replace('Bearer ', '');
    let userRole = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role;
      } catch (e) {
        // Token inválido
      }
    }
    
    // ADMIN não pode criar usuários MASTER
    if (userRole === 'ADMIN' && body.role === 'MASTER') {
      return new Response(
        JSON.stringify({ error: 'Usuários ADMIN não podem criar usuários MASTER' }),
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
    
    // Obter role do usuário logado
    const token = req.headers?.authorization?.replace('Bearer ', '');
    let userRole = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role;
      } catch (e) {
        // Token inválido
      }
    }
    
    // Verificar se está tentando editar um usuário MASTER
    const targetUser = await prisma.user.findUnique({
      where: { id: body.id },
      select: { role: true }
    });
    
    if (targetUser?.role === 'MASTER' && userRole === 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'Usuários ADMIN não podem editar usuários MASTER' }),
        { status: 403 }
      );
    }
    
    // ADMIN não pode mudar role para MASTER
    if (userRole === 'ADMIN' && body.role === 'MASTER') {
      return new Response(
        JSON.stringify({ error: 'Usuários ADMIN não podem criar usuários MASTER' }),
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