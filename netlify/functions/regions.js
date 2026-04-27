import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { isMaster } from './lib/permissions.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/regions', '').replace('/api/regions', '');

  try {
    const user = await authenticateUser(event.headers);

    if (method === 'GET') {
      const regions = await prisma.region.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return success(regions);
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name || !body.code) return error('Nome e código são obrigatórios', 400);
      const region = await prisma.region.create({ data: { name: body.name, code: body.code, state: body.state, city: body.city, country: body.country || 'Brasil' } });
      return success(region, 201);
    }

    if (method === 'PUT' && path.startsWith('/')) {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');
      const region = await prisma.region.update({ where: { id }, data: body });
      return success(region);
    }

    if (method === 'DELETE' && path.startsWith('/')) {
      const id = path.substring(1);
      await prisma.region.update({ where: { id }, data: { isActive: false } });
      return success({ message: 'Região desativada' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    return error(err.message || 'Erro interno', 500);
  }
}
