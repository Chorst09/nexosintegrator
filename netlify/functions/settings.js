import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

const KEYS = { appName: 'app_name', logoUrl: 'logo_url' };

async function readSettings(prisma) {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [KEYS.appName, KEYS.logoUrl] } },
    select: { key: true, value: true }
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    appName: (map.get(KEYS.appName) || '').trim() || 'NEXOS CRM',
    logoUrl: (map.get(KEYS.logoUrl) || '').trim() || null
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;

  try {
    // GET - público (frontend usa para carregar nome/logo)
    if (method === 'GET') {
      const settings = await readSettings(prisma);
      return success(settings);
    }

    // PUT - requer autenticação
    if (method === 'PUT') {
      const user = await authenticateUser(event.headers);
      const body = JSON.parse(event.body || '{}');
      const { appName, logoUrl } = body;
      const ops = [];

      if (typeof appName === 'string') {
        const v = appName.trim();
        ops.push(v
          ? prisma.systemSetting.upsert({ where: { key: KEYS.appName }, update: { value: v }, create: { key: KEYS.appName, value: v } })
          : prisma.systemSetting.deleteMany({ where: { key: KEYS.appName } })
        );
      }

      if (typeof logoUrl === 'string') {
        const v = logoUrl.trim();
        ops.push(v
          ? prisma.systemSetting.upsert({ where: { key: KEYS.logoUrl }, update: { value: v }, create: { key: KEYS.logoUrl, value: v } })
          : prisma.systemSetting.deleteMany({ where: { key: KEYS.logoUrl } })
        );
      }

      if (ops.length > 0) await Promise.all(ops);
      return success(await readSettings(prisma));
    }

    return error('Método não permitido', 405);
  } catch (err) {
    console.error('Erro em settings:', err);
    return error(err.message || 'Erro interno', 500);
  }
}
