const { PrismaClient } = require('@prisma/client');

const prismaOptions = {
  log: process.env.NODE_ENV !== 'production' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
};

// Connection pool configuration is done via DATABASE_URL parameters:
//   connection_limit=10     — max concurrent connections in pool (default: PG calculates per CPU)
//   pool_timeout=15         — seconds to wait for a connection from pool before throwing (default: 10)
//   statement_cache_size=0  — disabled to reduce memory in serverless/long-running containers
//
// If DATABASE_URL does not already include these params, append them.
const rawUrl = process.env.DATABASE_URL || '';
if (rawUrl && !rawUrl.includes('connection_limit=')) {
  const separator = rawUrl.includes('?') ? '&' : '?';
  prismaOptions.datasources.db.url =
    `${rawUrl}${separator}connection_limit=10&pool_timeout=15&pgbouncer=true&statement_cache_size=0`;
}

const prisma = global.__nexosPrisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  global.__nexosPrisma = prisma;
}

// Graceful shutdown: disconnect Prisma on SIGTERM / SIGINT
const disconnectPrisma = async () => {
  console.log('🔄 Desconectando Prisma...');
  await prisma.$disconnect();
  console.log('✅ Prisma desconectado');
};

process.on('SIGTERM', disconnectPrisma);
process.on('SIGINT', disconnectPrisma);

module.exports = { prisma };
