import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { normalizeRole, isMaster } from './lib/permissions.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/pre-vendas', '').replace('/api/pre-vendas', '');
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers);
    const role = normalizeRole(user.actualRole || user.role);

    if (method === 'GET') {
      const where = {};
      if (qs.status && qs.status !== 'all') where.status = qs.status;
      if (qs.prioridade) where.prioridade = qs.prioridade;
      if (qs.search) {
        where.OR = [
          { titulo: { contains: qs.search, mode: 'insensitive' } },
          { numero: { contains: qs.search, mode: 'insensitive' } }
        ];
      }

      // Vendedores só veem suas próprias solicitações
      if (role === 'SELLER') where.solicitanteId = user.id;

      const page = parseInt(qs.page || '1');
      const limit = parseInt(qs.limit || '50');
      const skip = (page - 1) * limit;

      const [solicitacoes, total] = await Promise.all([
        prisma.preSalesRequest.findMany({
          where,
          include: {
            solicitante: { select: { id: true, name: true, email: true } },
            lead: { select: { id: true, name: true } },
            opportunity: { select: { id: true, title: true } },
            items: {
              include: { product: { select: { id: true, name: true, price: true } } }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.preSalesRequest.count({ where })
      ]);

      return success({ solicitacoes, total, page, limit });
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.titulo || !body.descricao) return error('Título e descrição são obrigatórios', 400);

      // Gerar número sequencial
      const count = await prisma.preSalesRequest.count();
      const numero = `PV-${String(count + 1).padStart(4, '0')}`;

      const solicitacao = await prisma.preSalesRequest.create({
        data: {
          numero,
          titulo: body.titulo,
          descricao: body.descricao,
          status: 'NOVA',
          prioridade: body.prioridade || 'MEDIUM',
          tiposPrecificacao: body.tiposPrecificacao || ['VENDA'],
          regimeTributario: body.regimeTributario,
          valorSugerido: body.valorSugerido ? parseFloat(body.valorSugerido) : null,
          observacoes: body.observacoes,
          solicitanteId: user.id,
          leadId: body.leadId || null,
          opportunityId: body.opportunityId || null,
          items: body.items ? {
            create: body.items.map(item => ({
              productId: item.productId || null,
              descricao: item.descricao,
              quantidade: item.quantidade || 1,
              custoUnitario: parseFloat(item.custoUnitario || 0),
              precoSugerido: parseFloat(item.precoSugerido || 0),
              margemLucro: parseFloat(item.margemLucro || 0)
            }))
          } : undefined
        },
        include: {
          solicitante: { select: { id: true, name: true } },
          items: true
        }
      });
      return success(solicitacao, 201);
    }

    if (method === 'PUT' && path.startsWith('/')) {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');
      const { id: _id, solicitante, lead, opportunity, items, aprovacoes, ...data } = body;

      const updated = await prisma.preSalesRequest.update({
        where: { id },
        data,
        include: {
          solicitante: { select: { id: true, name: true } },
          items: true
        }
      });
      return success(updated);
    }

    if (method === 'DELETE' && path.startsWith('/')) {
      const id = path.substring(1);
      await prisma.preSalesRequest.delete({ where: { id } });
      return success({ message: 'Solicitação removida' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em pre-vendas:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
