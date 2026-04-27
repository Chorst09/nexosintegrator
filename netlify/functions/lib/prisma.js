import { PrismaClient } from '@prisma/client';

const SUPABASE_POOLER_SUFFIX = '.pooler.supabase.com';

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error('DATABASE_URL não configurada');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const isSupabasePooler = parsed.hostname.endsWith(SUPABASE_POOLER_SUFFIX);
  if (!isSupabasePooler) {
    return rawUrl;
  }

  // Supabase session mode (5432) pode estourar limite em ambiente serverless.
  // Para Prisma em Netlify Functions, forçamos transaction mode com pgbouncer.
  if (!parsed.port || parsed.port === '5432') {
    parsed.port = '6543';
  }

  if (!parsed.searchParams.has('pgbouncer')) {
    parsed.searchParams.set('pgbouncer', 'true');
  }

  if (!parsed.searchParams.has('connection_limit')) {
    parsed.searchParams.set('connection_limit', '1');
  }

  if (!parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'require');
  }

  return parsed.toString();
}

const prismaClientSingleton = () => {
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__nexosPrisma ?? prismaClientSingleton();
globalForPrisma.__nexosPrisma = prisma;

export function getPrisma() {
  return prisma;
}

export default getPrisma;
