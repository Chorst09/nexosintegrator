/**
 * Service de Contas a Pagar
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateCreateContaPagar, validateMarcarComoPago } = require('../validators/contasPagar.validator');
const { calcularStatusComputado } = require('../utils/statusCalculator');
const auditoriaService = require('./auditoria.service');
const { addDays } = require('../utils/dateUtils');

async function list(filters = {}, pagination = { page: 1, limit: 20 }) {
  const { status, fornecedor, categoriaId, centroCustoId, dataInicio, dataFim, page, limit } = { ...pagination, ...filters };
  
  const where = {};
  if (status) where.status = status;
  if (fornecedor) where.fornecedor = { contains: fornecedor, mode: 'insensitive' };
  if (categoriaId) where.categoriaId = categoriaId;
  if (centroCustoId) where.centroCustoId = centroCustoId;
  if (dataInicio || dataFim) {
    where.dataVencimento = {};
    if (dataInicio) where.dataVencimento.gte = new Date(dataInicio);
    if (dataFim) where.dataVencimento.lte = new Date(dataFim);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.contaPagar.findMany({
      where,
      include: {
        categoria: true,
        centroCusto: true,
        criadoPor: { select: { id: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contaPagar.count({ where }),
  ]);

  const dataComStatus = data.map(conta => ({
    ...conta,
    statusComputado: calcularStatusComputado(conta),
  }));

  return {
    data: dataComStatus,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const conta = await prisma.contaPagar.findUnique({
    where: { id },
    include: {
      categoria: true,
      centroCusto: true,
      commission: true,
      criadoPor: { select: { id: true, name: true } },
      auditoria: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!conta) return null;

  return { ...conta, statusComputado: calcularStatusComputado(conta) };
}

async function create(data, userId) {
  validateCreateContaPagar(data);

  const conta = await prisma.contaPagar.create({
    data: {
      valor: data.valor,
      dataVencimento: new Date(data.dataVencimento),
      fornecedor: data.fornecedor,
      categoriaId: data.categoriaId,
      centroCustoId: data.centroCustoId,
      origem: 'MANUAL',
      descricao: data.descricao,
      criadoPorId: userId,
    },
    include: { categoria: true, centroCusto: true },
  });

  await auditoriaService.registrarCriacao('ContaPagar', conta.id, userId, conta);
  return conta;
}

async function createFromCommission(event, userId = 'system') {
  const { eventId, data } = event;

  if (eventId) {
    const existing = await prisma.contaPagar.findUnique({ where: { eventId } });
    if (existing) {
      console.log(`Evento ${eventId} já processado.`);
      return existing;
    }
  }

  const categoria = await prisma.categoriaFinanceira.findFirst({
    where: { nome: 'Comissões de Vendas' },
  });

  const centroCusto = await prisma.centroCusto.findFirst({
    where: { codigo: 'COM' },
  });

  const prazo = data.prazoVencimento || 7;
  const dataVencimento = addDays(new Date(), prazo);

  const conta = await prisma.contaPagar.create({
    data: {
      valor: data.valor,
      dataVencimento,
      fornecedor: data.sellerNome || 'Vendedor',
      categoriaId: categoria.id,
      centroCustoId: centroCusto?.id,
      origem: 'COMISSAO',
      commissionId: data.commissionId,
      sellerId: data.sellerId,
      sellerNome: data.sellerNome,
      commissionValor: data.valor,
      eventId,
      criadoPorId: userId,
      descricao: `Comissão do vendedor ${data.sellerNome}`,
    },
    include: { categoria: true, centroCusto: true },
  });

  await auditoriaService.registrarCriacao('ContaPagar', conta.id, userId, { eventId, ...data });
  return conta;
}

async function marcarComoPago(id, dataPagamento, userId) {
  const conta = await prisma.contaPagar.findUnique({ where: { id } });
  if (!conta) throw new Error('Conta não encontrada');
  if (conta.status === 'PAGO') throw new Error('Conta já está paga');

  validateMarcarComoPago(id, dataPagamento, conta.createdAt);

  const updated = await prisma.contaPagar.update({
    where: { id },
    data: {
      status: 'PAGO',
      dataPagamento: new Date(dataPagamento),
    },
  });

  await auditoriaService.registrarMudancaStatus('ContaPagar', id, userId, conta.status, 'PAGO');

  // Se é comissão, emitir evento para módulo de comissões
  if (conta.origem === 'COMISSAO' && conta.commissionId) {
    // TODO: Emitir evento payable.paid
    console.log(`Emitindo evento payable.paid para comissão ${conta.commissionId}`);
  }

  return updated;
}

async function deleteById(id, userId) {
  const conta = await prisma.contaPagar.findUnique({ where: { id } });
  if (!conta) throw new Error('Conta não encontrada');
  if (conta.status === 'PAGO') throw new Error('Não é possível excluir uma conta com status PAGO');

  await auditoriaService.registrarExclusao('ContaPagar', id, userId);
  await prisma.contaPagar.delete({ where: { id } });
}

module.exports = {
  list,
  getById,
  create,
  createFromCommission,
  marcarComoPago,
  deleteById,
  calcularStatusComputado,
};
