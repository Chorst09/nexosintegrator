import { prisma } from '../lib/prisma.js';

export default async function handler(req) {
  if (req.method === 'GET') {
    const { type, active } = req.query || {};
    
    const where = {};
    if (type) where.type = type;
    if (active !== undefined) where.isActive = active === 'true';

    const integrations = await prisma.integration.findMany({
      where,
      include: {
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { name: 'asc' }
    });
    
    return Response.json(integrations);
  }

  if (req.method === 'POST') {
    const body = await req.json();
    
    const integration = await prisma.integration.create({
      data: {
        name: body.name,
        type: body.type,
        config: body.config || {},
        isActive: body.isActive !== undefined ? body.isActive : true,
        apiKey: body.apiKey,
        webhookUrl: body.webhookUrl
      }
    });
    
    return Response.json(integration);
  }

  if (req.method === 'PUT') {
    const body = await req.json();
    
    const integration = await prisma.integration.update({
      where: { id: body.id },
      data: {
        name: body.name,
        config: body.config,
        isActive: body.isActive,
        apiKey: body.apiKey,
        webhookUrl: body.webhookUrl,
        lastSync: body.lastSync ? new Date(body.lastSync) : undefined
      }
    });
    
    return Response.json(integration);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    
    await prisma.integration.delete({
      where: { id }
    });
    
    return Response.json({ success: true });
  }

  return new Response('Method not allowed', { status: 405 });
}