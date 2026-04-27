import { handleCORS } from './lib/response.js';

const PNCP_BASE = 'https://pncp.gov.br/api/consulta/v1';

const diasAtras = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10).replaceAll('-', '');
};

const hoje = () => new Date().toISOString().slice(0, 10).replaceAll('-', '');

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const qs = event.queryStringParameters || {};
  const endpoint = qs.endpoint === 'proposta' ? 'proposta' : 'publicacao';

  // Montar URL do PNCP
  const url = new URL(`${PNCP_BASE}/contratacoes/${endpoint}`);

  // dataInicial é obrigatório para publicacao — usar padrão de 30 dias atrás
  const dataInicial = qs.dataInicial || diasAtras(30);
  const dataFinal = qs.dataFinal || hoje();

  if (endpoint === 'publicacao') {
    url.searchParams.set('dataInicial', dataInicial);
  }
  url.searchParams.set('dataFinal', dataFinal);

  if (qs.codigoModalidadeContratacao) {
    url.searchParams.set('codigoModalidadeContratacao', qs.codigoModalidadeContratacao);
  }
  if (qs.uf) url.searchParams.set('uf', qs.uf);
  url.searchParams.set('pagina', qs.pagina || '1');
  url.searchParams.set('tamanhoPagina', String(Math.min(500, Math.max(10, Number(qs.tamanhoPagina || 20)))));

  const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'NexosCRM/2.0' }
    });

    const data = await res.json().catch(() => null);

    // Sempre retornar 200 — erros do PNCP viram data: []
    if (!res.ok || !data) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ data: [], total: 0, erro: data?.message || `PNCP ${res.status}` })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ data: [], total: 0, erro: err.message })
    };
  }
}
