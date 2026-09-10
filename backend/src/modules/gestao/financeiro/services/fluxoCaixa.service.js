const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { groupByMonth, groupByWeek } = require('../utils/dateUtils');

async function gerarFluxo(dataInicio, dataFim, agrupamento = 'mes') {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  // Entradas previstas
  const entradas = await prisma.contaReceber.aggregate({
    where: {
      status: 'PENDENTE',
      dataVencimento: { gte: inicio, lte: fim },
    },
    _sum: { valor: true },
  });

  // Saídas previstas
  const saidas = await prisma.contaPagar.aggregate({
    where: {
      status: 'PENDENTE',
      dataVencimento: { gte: inicio, lte: fim },
    },
    _sum: { valor: true },
  });

  const entradasPrevistas = entradas._sum.valor || 0;
  const saidasPrevistas = saidas._sum.valor || 0;
  const saldoFinalProjetado = entradasPrevistas - saidasPrevistas;

  // Contas vencidas
  const hoje = new Date();
  const [receberVencidas, pagarVencidas] = await Promise.all([
    prisma.contaReceber.count({
      where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
    }),
    prisma.contaPagar.count({
      where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
    }),
  ]);

  return {
    periodo: { inicio, fim },
    saldoInicial: 0,
    entradasPrevistas,
    saidasPrevistas,
    saldoFinalProjetado,
    contasVencidas: {
      receber: receberVencidas,
      pagar: pagarVencidas,
    },
  };
}

module.exports = { gerarFluxo };
