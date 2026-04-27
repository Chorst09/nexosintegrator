import { prisma } from '../lib/prisma.js';

export default async function handler(req) {
  if (req.method === 'GET') {
    const { role, active } = req.query || {};
    
    const where = {};
    if (role) where.role = role;

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
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password, // Em produção, hash a senha
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