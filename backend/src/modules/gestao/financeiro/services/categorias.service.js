const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  return prisma.categoriaFinanceira.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
  });
}

async function create(nome, tipo) {
  const existing = await prisma.categoriaFinanceira.findUnique({ where: { nome } });
  if (existing) throw new Error('Já existe uma categoria com este nome');

  return prisma.categoriaFinanceira.create({
    data: { nome, tipo },
  });
}

async function desativar(id) {
  return prisma.categoriaFinanceira.update({
    where: { id },
    data: { ativo: false },
  });
}

module.exports = { list, create, desativar };
