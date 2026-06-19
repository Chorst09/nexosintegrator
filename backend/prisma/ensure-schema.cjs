const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Opportunity"
      ADD COLUMN IF NOT EXISTS "projectType" TEXT NOT NULL DEFAULT 'SINGLE',
      ADD COLUMN IF NOT EXISTS "projectMonths" INTEGER;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Commission"
      ADD COLUMN IF NOT EXISTS "calculationBase" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "projectType" TEXT NOT NULL DEFAULT 'SINGLE',
      ADD COLUMN IF NOT EXISTS "projectMonths" INTEGER;
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Erro ao verificar schema de comissionamento:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
