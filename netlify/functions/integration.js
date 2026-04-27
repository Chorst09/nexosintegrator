import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

// Stub para integração - retorna dados vazios para não quebrar o frontend
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const path = event.path.replace('/.netlify/functions/integration', '').replace('/api/integration', '');

  try {
    // Rotas públicas OAuth
    if (path.startsWith('/oauth')) {
      return error('OAuth não configurado', 501);
    }

    const user = await authenticateUser(event.headers);

    // GET /integration/admin/partners
    if (path === '/admin/partners' && event.httpMethod === 'GET') {
      return success([]);
    }

    // GET /integration/openapi
    if (path === '/openapi') {
      return success({ openapi: '3.0.0', info: { title: 'NexosCRM API', version: '1.0.0' }, paths: {} });
    }

    return success([]);
  } catch (err) {
    return error(err.message || 'Erro interno', 500);
  }
}
