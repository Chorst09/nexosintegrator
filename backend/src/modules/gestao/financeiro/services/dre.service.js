const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function gerarDRE(dataInicio, dataFim, agruparPor = null) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  // Receitas: Contas Receber PAGO no período
  const receitas = await prisma.contaReceber.groupBy({
    by: agruparPor === 'categoria' ? ['categoriaId'] : [],
    where: {
      status: 'PAGO',
      dataRecebimento: { gte: inicio, lte: fim },
    },
    _sum: { valor: true },
  });

  const receitasBrutas = receitas.reduce((sum, r) => sum + (r._sum.valor || 0), 0);

  // Custos Diretos: Comissões PAGO
  const comissoes = await prisma.contaPagar.aggregate({
    where: {
      status: 'PAGO',
      dataPagamento: { gte: inicio, lte: fim },
      origem: 'COMISSAO',
    },
    _sum: { valor: true },
  });

  const custosDiretos = comissoes._sum.valor || 0;

  // Despesas Operacionais: Outras despesas PAGO
  const despesas = await prisma.contaPagar.aggregate({
    where: {
      status: 'PAGO',
      dataPagamento: { gte: inicio, lte: fim },
      origem: { not: 'COMISSAO' },
    },
    _sum: { valor: true },
  });

  const despesasOperacionais = despesas._sum.valor || 0;

  const lucroBruto = receitasBrutas - custosDiretos;
  const lucroLiquido = lucroBruto - despesasOperacionais;

  return {
    periodo: { inicio, fim },
    receitasBrutas,
    deducoesReceitas: 0,
    receitasLiquidas: receitasBrutas,
    custosDiretos,
    lucroBruto,
    despesasOperacionais,
    lucroLiquido,
  };
}

module.exports = { gerarDRE };
