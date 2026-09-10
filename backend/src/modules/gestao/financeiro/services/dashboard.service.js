const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { firstDayOfMonth, lastDayOfMonth } = require('../utils/dateUtils');

async function gerarDashboard() {
  const hoje = new Date();
  const inicioMes = firstDayOfMonth(hoje);
  const fimMes = lastDayOfMonth(hoje);

  // Total a receber (PENDENTE)
  const totalReceberAgg = await prisma.contaReceber.aggregate({
    where: { status: 'PENDENTE' },
    _sum: { valor: true },
  });
  const totalReceber = totalReceberAgg._sum.valor || 0;

  // Total a pagar (PENDENTE)
  const totalPagarAgg = await prisma.contaPagar.aggregate({
    where: { status: 'PENDENTE' },
    _sum: { valor: true },
  });
  const totalPagar = totalPagarAgg._sum.valor || 0;

  // Receitas do mês (PAGO)
  const receitasMesAgg = await prisma.contaReceber.aggregate({
    where: {
      status: 'PAGO',
      dataRecebimento: { gte: inicioMes, lte: fimMes },
    },
    _sum: { valor: true },
  });
  const receitasMes = receitasMesAgg._sum.valor || 0;

  // Despesas do mês (PAGO)
  const despesasMesAgg = await prisma.contaPagar.aggregate({
    where: {
      status: 'PAGO',
      dataPagamento: { gte: inicioMes, lte: fimMes },
    },
    _sum: { valor: true },
  });
  const despesasMes = despesasMesAgg._sum.valor || 0;

  // Contas vencidas
  const [receberVencidas, pagarVencidas] = await Promise.all([
    prisma.contaReceber.count({
      where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
    }),
    prisma.contaPagar.count({
      where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
    }),
  ]);

  return {
    totalReceber,
    totalPagar,
    saldoProjetado: totalReceber - totalPagar,
    receitasMes,
    despesasMes,
    contasVencidas: {
      receber: receberVencidas,
      pagar: pagarVencidas,
    },
  };
}

module.exports = { gerarDashboard };
