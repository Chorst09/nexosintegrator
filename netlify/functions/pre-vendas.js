import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { normalizeRole, isMaster, canAccessModule } from './lib/permissions.js';

const parsePath = (value = '') => {
  return String(value || '')
    .replace('/.netlify/functions/pre-vendas', '')
    .replace('/api/pre-vendas', '')
    .split('?')[0];
};

const toNullableFloat = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getListInclude = () => ({
  solicitante: { select: { id: true, name: true, email: true } },
  lead: { select: { id: true, name: true } },
  opportunity: { select: { id: true, title: true } },
  items: {
    include: { product: { select: { id: true, name: true, price: true } } }
  }
});

const generatePreSalesNumber = async (prisma) => {
  const year = new Date().getFullYear();
  const prefix = `PRE-${year}-`;
  const latest = await prisma.preSalesRequest.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { numero: true }
  });

  const current = Number((latest?.numero || '').split('-').pop() || 0);
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
};

const canManagePreSales = (user) => isMaster(user) || canAccessModule(user, 'PRE_SALES');
const canEditRequest = (user, request) => canManagePreSales(user) || request?.solicitanteId === user.id;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();
  const prisma = getPrisma();
  const method = event.httpMethod;
  const path = parsePath(event.path);
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers || {});
    const role = normalizeRole(user.actualRole || user.role);

    if (method === 'GET') {
      const where = {};
      if (qs.status && qs.status !== 'all') where.status = qs.status;
      if (qs.prioridade) where.prioridade = qs.prioridade;
      if (qs.search) {
        where.OR = [
          { titulo: { contains: qs.search, mode: 'insensitive' } },
          { numero: { contains: qs.search, mode: 'insensitive' } },
          { descricao: { contains: qs.search, mode: 'insensitive' } }
        ];
      }

      if (role === 'SELLER') where.solicitanteId = user.id;

      const page = Math.max(1, parseInt(qs.page || '1', 10) || 1);
      const limit = Math.max(1, parseInt(qs.limit || '50', 10) || 50);
      const skip = (page - 1) * limit;

      const [solicitacoes, total] = await Promise.all([
        prisma.preSalesRequest.findMany({
          where,
          include: getListInclude(),
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.preSalesRequest.count({ where })
      ]);

      return success({
        success: true,
        solicitacoes,
        total,
        data: solicitacoes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.titulo || !body.descricao) return error('Título e descrição são obrigatórios', 400);
      const numero = await generatePreSalesNumber(prisma);
      const tiposPrecificacao = Array.isArray(body.tiposPrecificacao) && body.tiposPrecificacao.length > 0
        ? body.tiposPrecificacao
        : ['VENDA'];

      // Persist rich item metadata (sku, unidade, assignedToId, prazo) inside
      // calculoDetalhes — these fields don't exist in the Prisma schema so we
      // keep them in the JSON blob to avoid requiring a migration.
      const itensSolicitados = Array.isArray(body.items)
        ? body.items.map((i) => ({
          descricao: i.descricao || '',
          quantidade: Number(i.quantidade || 1) || 1,
          sku: i.sku || null,
          unidade: i.unidade || 'UN',
          custoUnitario: Number(i.custoUnitario || 0) || 0
        }))
        : [];

      const baseDetalhes = body.calculoDetalhes && typeof body.calculoDetalhes === 'object'
        ? body.calculoDetalhes : {};

      // Resolve "Para quem está encaminhando" and prazo
      const assignedToId = body.assignedToId || null;
      const prazoStr = body.prazo || null;

      const calculoDetalhes = {
        ...baseDetalhes,
        ...(itensSolicitados.length > 0 ? { itensSolicitados } : {}),
        ...(assignedToId ? { encaminhadoParaId: assignedToId } : {}),
        ...(prazoStr ? { prazo: prazoStr } : {})
      };

      // Validate foreign keys before creating to avoid constraint errors
      let validLeadId = null;
      if (body.leadId) {
        const leadExists = await prisma.company.findUnique({
          where: { id: body.leadId },
          select: { id: true }
        });
        if (leadExists) validLeadId = body.leadId;
      }

      let validOpportunityId = null;
      if (body.opportunityId) {
        const oppExists = await prisma.opportunity.findUnique({
          where: { id: body.opportunityId },
          select: { id: true }
        });
        if (oppExists) validOpportunityId = body.opportunityId;
      }

      const solicitacao = await prisma.preSalesRequest.create({
        data: {
          numero,
          titulo: body.titulo,
          descricao: body.descricao,
          status: 'NOVA',
          prioridade: body.prioridade || 'MEDIUM',
          tiposPrecificacao,
          regimeTributario: body.regimeTributario || null,
          valorSugerido: toNullableFloat(body.valorSugerido),
          custoTotal: toNullableFloat(body.custoTotal),
          margemLucro: toNullableFloat(body.margemLucro),
          calculoDetalhes: Object.keys(calculoDetalhes).length > 0 ? calculoDetalhes : undefined,
          observacoes: body.observacoes || null,
          solicitanteId: user.id,
          leadId: validLeadId,
          opportunityId: validOpportunityId,
          items: Array.isArray(body.items) && body.items.length > 0 ? {
            create: body.items.map((item) => ({
              productId: item.productId || null,
              descricao: item.descricao || null,
              quantidade: Number(item.quantidade || 1) || 1,
              custoUnitario: Number(item.custoUnitario || 0) || 0,
              precoSugerido: Number(item.precoSugerido || 0) || 0,
              margemLucro: Number(item.margemLucro || 0) || 0
            }))
          } : undefined
        },
        include: getListInclude()
      });

      return success({
        success: true,
        message: 'Solicitação criada com sucesso',
        data: solicitacao
      }, 201);
    }

    if (method === 'PUT' && path.startsWith('/')) {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');
      const existing = await prisma.preSalesRequest.findUnique({
        where: { id },
        select: { id: true, solicitanteId: true }
      });

      if (!existing) return error('Solicitação não encontrada', 404);
      if (!canEditRequest(user, existing)) return error('Acesso negado', 403);

      const nextData = {};

      if (typeof body.titulo === 'string' && body.titulo.trim()) nextData.titulo = body.titulo.trim();
      if (typeof body.descricao === 'string') nextData.descricao = body.descricao;
      if (typeof body.status === 'string' && body.status.trim()) nextData.status = body.status.trim();
      if (typeof body.prioridade === 'string' && body.prioridade.trim()) nextData.prioridade = body.prioridade.trim();
      if (Array.isArray(body.tiposPrecificacao)) nextData.tiposPrecificacao = body.tiposPrecificacao;
      if (Object.prototype.hasOwnProperty.call(body, 'regimeTributario')) nextData.regimeTributario = body.regimeTributario || null;
      if (Object.prototype.hasOwnProperty.call(body, 'valorSugerido')) nextData.valorSugerido = toNullableFloat(body.valorSugerido);
      if (Object.prototype.hasOwnProperty.call(body, 'custoTotal')) nextData.custoTotal = toNullableFloat(body.custoTotal);
      if (Object.prototype.hasOwnProperty.call(body, 'margemLucro')) nextData.margemLucro = toNullableFloat(body.margemLucro);
      if (Object.prototype.hasOwnProperty.call(body, 'calculoDetalhes')) nextData.calculoDetalhes = body.calculoDetalhes ?? null;
      if (Object.prototype.hasOwnProperty.call(body, 'observacoes')) nextData.observacoes = body.observacoes || null;
      if (Object.prototype.hasOwnProperty.call(body, 'leadId')) nextData.leadId = body.leadId || null;
      if (Object.prototype.hasOwnProperty.call(body, 'opportunityId')) nextData.opportunityId = body.opportunityId || null;
      if (Object.prototype.hasOwnProperty.call(body, 'dataAprovacao')) nextData.dataAprovacao = body.dataAprovacao ? new Date(body.dataAprovacao) : null;
      if (Object.prototype.hasOwnProperty.call(body, 'dataRejeicao')) nextData.dataRejeicao = body.dataRejeicao ? new Date(body.dataRejeicao) : null;
      if (Object.prototype.hasOwnProperty.call(body, 'aprovadoPorId')) nextData.aprovadoPorId = body.aprovadoPorId || null;
      if (Object.prototype.hasOwnProperty.call(body, 'rejeitadoPorId')) nextData.rejeitadoPorId = body.rejeitadoPorId || null;

      const updated = await prisma.preSalesRequest.update({
        where: { id },
        data: nextData,
        include: getListInclude()
      });

      return success({
        success: true,
        data: updated
      });
    }

    if (method === 'DELETE' && path.startsWith('/')) {
      const id = path.substring(1);
      const existing = await prisma.preSalesRequest.findUnique({
        where: { id },
        select: { id: true, solicitanteId: true }
      });

      if (!existing) return error('Solicitação não encontrada', 404);
      if (!canEditRequest(user, existing)) return error('Acesso negado', 403);

      await prisma.preSalesRequest.delete({ where: { id } });
      return success({ message: 'Solicitação removida' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em pre-vendas:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
