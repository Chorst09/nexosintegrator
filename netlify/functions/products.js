import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/products', '').replace('/api/products', '');
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers);

    if (method === 'GET') {
      if (path.startsWith('/') && path.length > 1) {
        const id = path.substring(1);
        const product = await prisma.product.findUnique({
          where: { id },
          include: { prices: { include: { priceTable: { select: { id: true, name: true } } } } }
        });
        if (!product) return error('Produto não encontrado', 404);
        return success(product);
      }

      const where = {};
      if (qs.active !== undefined) where.active = qs.active === 'true';
      if (qs.category) where.category = qs.category;

      const products = await prisma.product.findMany({
        where,
        include: {
          _count: { select: { opportunities: true, proposals: true } }
        },
        orderBy: { name: 'asc' }
      });
      return success(products);
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name || body.price === undefined) return error('Nome e preço são obrigatórios', 400);

      const product = await prisma.product.create({
        data: {
          name: body.name,
          description: body.description,
          category: body.category,
          price: parseFloat(body.price),
          margin: body.margin ? parseFloat(body.margin) : null,
          active: body.active !== false
        }
      });
      return success(product, 201);
    }

    if (method === 'PUT' && path.startsWith('/')) {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');
      const { id: _id, _count, prices, ...data } = body;
      if (data.price) data.price = parseFloat(data.price);
      if (data.margin) data.margin = parseFloat(data.margin);

      const product = await prisma.product.update({ where: { id }, data });
      return success(product);
    }

    if (method === 'DELETE' && path.startsWith('/')) {
      const id = path.substring(1);
      await prisma.product.update({ where: { id }, data: { active: false } });
      return success({ message: 'Produto desativado' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em products:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
