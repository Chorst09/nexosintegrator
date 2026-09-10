const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  return prisma.centroCusto.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
  });
}

async function create(nome, codigo) {
  const existing = await prisma.centroCusto.findUnique({ where: { codigo } });
  if (existing) throw new Error('Já existe um centro de custo com este código');

  return prisma.centroCusto.create({
    data: { nome, codigo },
  });
}

module.exports = { list, create };
