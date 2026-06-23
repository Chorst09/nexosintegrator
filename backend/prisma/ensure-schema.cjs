const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PRE_SALES';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "accessB2B" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "accessB2G" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "accessPreSales" BOOLEAN NOT NULL DEFAULT false;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Opportunity"
      ADD COLUMN IF NOT EXISTS "number" TEXT,
      ADD COLUMN IF NOT EXISTS "b2gStage" TEXT,
      ADD COLUMN IF NOT EXISTS "projectType" TEXT NOT NULL DEFAULT 'SINGLE',
      ADD COLUMN IF NOT EXISTS "projectMonths" INTEGER;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_number_key"
      ON "Opportunity"("number");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Opportunity_b2gStage_idx"
      ON "Opportunity"("b2gStage");
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
