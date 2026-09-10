/**
 * Service de Contas a Receber
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateCreateContaReceber, validateMarcarComoPago } = require('../validators/contasReceber.validator');
const { calcularStatusComputado } = require('../utils/statusCalculator');
const auditoriaService = require('./auditoria.service');
const { addDays } = require('../utils/dateUtils');

/**
 * Lista contas a receber com filtros
 */
async function list(filters = {}, pagination = { page: 1, limit: 20 }) {
  const { status, clienteId, origem, dataInicio, dataFim, page, limit } = { ...pagination, ...filters };
  
  const where = {};
  if (status) where.status = status;
  if (clienteId) where.clienteId = clienteId;
  if (origem) where.origem = origem;
  if (dataInicio || dataFim) {
    where.dataVencimento = {};
    if (dataInicio) where.dataVencimento.gte = new Date(dataInicio);
    if (dataFim) where.dataVencimento.lte = new Date(dataFim);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.contaReceber.findMany({
      where,
      include: {
        cliente: { select: { id: true, name: true } },
        categoria: true,
        criadoPor: { select: { id: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contaReceber.count({ where }),
  ]);

  // Aplica status computado
  const dataComStatus = data.map(conta => ({
    ...conta,
    statusComputado: calcularStatusComputado(conta),
  }));

  return {
    data: dataComStatus,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Busca conta por ID
 */
async function getById(id) {
  const conta = await prisma.contaReceber.findUnique({
    where: { id },
    include: {
      cliente: true,
      categoria: true,
      opportunity: true,
      criadoPor: { select: { id: true, name: true } },
      auditoria: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!conta) return null;

  return {
    ...conta,
    statusComputado: calcularStatusComputado(conta),
  };
}

/**
 * Cria conta manualmente
 */
async function create(data, userId) {
  validateCreateContaReceber(data);

  // Verifica se cliente existe
  const cliente = await prisma.company.findUnique({ where: { id: data.clienteId } });
  if (!cliente) {
    throw new Error('Cliente não encontrado');
  }

  const conta = await prisma.contaReceber.create({
    data: {
      valor: data.valor,
      dataVencimento: new Date(data.dataVencimento),
      clienteId: data.clienteId,
      categoriaId: data.categoriaId,
      origem: 'MANUAL',
      descricao: data.descricao,
      criadoPorId: userId,
    },
    include: {
      cliente: true,
      categoria: true,
    },
  });

  // Registra auditoria
  await auditoriaService.registrarCriacao('ContaReceber', conta.id, userId, conta);

  return conta;
}

/**
 * Cria conta a partir de oportunidade ganha (evento)
 */
async function createFromOpportunity(event, userId = 'system') {
  const { eventId, data } = event;

  // Verifica idempotência
  if (eventId) {
    const existing = await prisma.contaReceber.findUnique({ where: { eventId } });
    if (existing) {
      console.log(`Evento ${eventId} já processado. Retornando conta existente.`);
      return existing;
    }
  }

  // Busca categoria baseada na origem
  const categoriaNome = data.source === 'B2B' ? 'Vendas B2B' : 'Vendas B2G';
  const categoria = await prisma.categoriaFinanceira.findFirst({
    where: { nome: categoriaNome },
  });

  if (!categoria) {
    throw new Error(`Categoria "${categoriaNome}" não encontrada`);
  }

  // Calcula data de vencimento
  const prazo = data.prazoRecebimento || 30;
  const dataVencimento = addDays(new Date(data.dataFechamento), prazo);

  const conta = await prisma.contaReceber.create({
    data: {
      valor: data.valor,
      dataVencimento,
      clienteId: data.clienteId,
      categoriaId: categoria.id,
      origem: data.source || 'B2B',
      opportunityId: data.opportunityId,
      opportunityNumber: data.opportunityNumber,
      opportunityValue: data.valor,
      opportunityDate: new Date(data.dataFechamento),
      eventId,
      criadoPorId: userId,
      descricao: `Conta a receber gerada automaticamente da oportunidade ${data.opportunityNumber || data.opportunityId}`,
    },
    include: {
      cliente: true,
      categoria: true,
    },
  });

  await auditoriaService.registrarCriacao('ContaReceber', conta.id, userId, { eventId, ...data });

  return conta;
}

/**
 * Marca conta como paga
 */
async function marcarComoPago(id, dataRecebimento, userId) {
  const conta = await prisma.contaReceber.findUnique({ where: { id } });
  if (!conta) {
    throw new Error('Conta não encontrada');
  }

  if (conta.status === 'PAGO') {
    throw new Error('Conta já está paga');
  }

  validateMarcarComoPago(id, dataRecebimento, conta.createdAt);

  const updated = await prisma.contaReceber.update({
    where: { id },
    data: {
      status: 'PAGO',
      dataRecebimento: new Date(dataRecebimento),
    },
  });

  await auditoriaService.registrarMudancaStatus('ContaReceber', id, userId, conta.status, 'PAGO');

  return updated;
}

/**
 * Exclui conta
 */
async function deleteById(id, userId) {
  const conta = await prisma.contaReceber.findUnique({ where: { id } });
  if (!conta) {
    throw new Error('Conta não encontrada');
  }

  if (conta.status === 'PAGO') {
    throw new Error('Não é possível excluir uma conta com status PAGO');
  }

  await auditoriaService.registrarExclusao('ContaReceber', id, userId);
  await prisma.contaReceber.delete({ where: { id } });
}

module.exports = {
  list,
  getById,
  create,
  createFromOpportunity,
  marcarComoPago,
  deleteById,
  calcularStatusComputado,
};
