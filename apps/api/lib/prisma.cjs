const { PrismaClient } = require('@prisma/client');

const prisma = global.__nexosPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__nexosPrisma = prisma;
}

module.exports = { prisma };
