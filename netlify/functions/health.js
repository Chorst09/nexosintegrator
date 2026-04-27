import { success, handleCORS } from './lib/response.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS();
  }

  return success({
    status: 'ok',
    service: 'nexoscrm-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
}
