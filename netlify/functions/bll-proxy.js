import { handleCORS } from './lib/response.js';
import { scrapeAllPortals, checkCredentials } from './scrapers/index.js';

// BLL - Bolsa de Licitações e Leilões
// Proxy para busca de licitações no BLL e outros portais

const BLL_BASE = 'https://bll.org.br';
const BLL_API = 'https://bll.org.br/api';

// Credenciais configuradas (podem ser sobrescritas por variáveis de ambiente ou headers)
const getBllCredentials = (headers = {}) => {
  // Prioridade: headers > env
  const email = headers['x-bll-email'] || process.env.BLL_EMAIL || '';
  const password = headers['x-bll-password'] || process.env.BLL_PASSWORD || '';
  
  console.log('[bll-proxy] Credenciais configuradas:', {
    hasEmail: !!email,
    hasPassword: !!password,
    source: headers['x-bll-email'] ? 'headers' : process.env.BLL_EMAIL ? 'env' : 'none'
  });
  
  return { email, password };
};

let bllToken = null;
let bllTokenExpiry = 0;

async function loginBLL(headers = {}) {
  // Verificar se token ainda é válido (cache de 30 min)
  if (bllToken && Date.now() < bllTokenExpiry) {
    console.log('[bll-proxy] Usando token em cache');
    return bllToken;
  }

  const { email, password } = getBllCredentials(headers);
  
  if (!email || !password) {
    console.warn('[bll-proxy] Credenciais não configuradas. Configure BLL_EMAIL e BLL_PASSWORD.');
    return null;
  }

  try {
    console.log('[bll-proxy] Tentando login no BLL...');
    // Tentar login via API do BLL
    const response = await fetch(`${BLL_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NexosCRM/2.0)'
      },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data?.token || data?.access_token) {
        bllToken = data.token || data.access_token;
        bllTokenExpiry = Date.now() + 30 * 60 * 1000; // 30 min
        return bllToken;
      }
    }

    // Tentar endpoint alternativo
    const response2 = await fetch(`${BLL_BASE}/fornecedor/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NexosCRM/2.0)'
      },
      body: new URLSearchParams({ email, password }).toString()
    });

    if (response2.ok) {
      const data2 = await response2.json().catch(() => null);
      if (data2?.token || data2?.access_token) {
        bllToken = data2.token || data2.access_token;
        bllTokenExpiry = Date.now() + 30 * 60 * 1000;
        return bllToken;
      }
    }
  } catch (err) {
    console.error('[bll-proxy] Erro no login:', err.message);
  }

  return null;
}

async function buscarBLL({ objeto, uf, pagina = 1, tamanhoPagina = 20, headers = {} }) {
  const token = await loginBLL(headers);

  const params = new URLSearchParams();
  if (objeto) params.set('q', objeto);
  if (uf) params.set('uf', uf);
  params.set('page', pagina);
  params.set('per_page', tamanhoPagina);
  params.set('status', 'aberto');

  const requestHeaders = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; NexosCRM/2.0)'
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Tentar diferentes endpoints da API BLL
  const endpoints = [
    `${BLL_BASE}/api/licitacoes?${params}`,
    `${BLL_BASE}/api/v1/licitacoes?${params}`,
    `${BLL_BASE}/api/processos?${params}`,
    `${BLL_BASE}/licitacoes/busca?${params}`
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: requestHeaders });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          const items = Array.isArray(data) ? data
            : Array.isArray(data?.data) ? data.data
            : Array.isArray(data?.licitacoes) ? data.licitacoes
            : Array.isArray(data?.items) ? data.items
            : [];

          return items.map(item => ({
            id: item.id || item.codigo || `bll-${Date.now()}-${Math.random()}`,
            objetoCompra: item.objeto || item.descricao || item.titulo || item.title || '',
            orgaoEntidade: { razaoSocial: item.orgao || item.entidade || item.cliente || '' },
            modalidadeNome: item.modalidade || item.tipo || 'Pregão Eletrônico',
            valorTotalEstimado: item.valor || item.valorEstimado || null,
            dataAberturaProposta: item.dataAbertura || item.data_abertura || item.abertura || null,
            dataEncerramentoProposta: item.dataEncerramento || item.data_encerramento || null,
            unidadeOrgao: { ufSigla: item.uf || item.estado || uf || '' },
            linkSistemaOrigem: item.link || item.url || `https://bll.org.br/licitacao/${item.id || ''}`,
            fonte: 'BLL',
            numeroCompra: item.numero || item.codigo || ''
          }));
        }
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const qs = event.queryStringParameters || {};
  const headers = event.headers || {};
  const portal = (qs.portal || 'bll').toLowerCase();

  console.log(`[bll-proxy] Buscando no portal: ${portal}`);

  // Ação especial: verificar credenciais
  if (qs.action === 'check-credentials') {
    const status = checkCredentials(headers);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status })
    };
  }

  // Ação especial: testar login/configuração da fonte
  if (qs.action === 'login') {
    const status = checkCredentials(headers);
    const configured = Boolean(status?.[portal]?.configured);
    let autenticado = configured;

    if (portal === 'bll' && configured) {
      autenticado = Boolean(await loginBLL(headers));
    }

    return {
      statusCode: autenticado ? 200 : 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-BLL-Email, X-BLL-Password, X-BNC-Email, X-BNC-Password, X-ConLicitacao-Email, X-ConLicitacao-Password',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        portal: portal.toUpperCase(),
        configured,
        autenticado,
        message: autenticado
          ? 'Fonte autenticada/configurada para busca'
          : 'Credenciais ausentes ou inválidas'
      })
    };
  }

  try {
    let results = [];
    let usedScraper = false;
    let fonte = portal.toUpperCase();

    // Tentar API primeiro (só BLL tem API)
    if (portal === 'bll') {
      try {
        results = await buscarBLL({
          objeto: qs.objeto || qs.q || '',
          uf: qs.uf || '',
          pagina: parseInt(qs.pagina || '1'),
          tamanhoPagina: parseInt(qs.tamanhoPagina || '20'),
          headers
        });
        console.log(`[bll-proxy] API do ${portal.toUpperCase()} retornou ${results.length} resultados`);
      } catch (apiError) {
        console.warn(`[bll-proxy] API do ${portal.toUpperCase()} falhou:`, apiError.message);
      }
    } else {
      // BNC e ConLicitacao não têm API, só scraping
      console.log(`[bll-proxy] ${portal.toUpperCase()} não tem API, tentando scraper...`);
    }

    // Scraper desabilitado em produção (requer configuração especial)
    // Se API não retornou resultados, usar scraper como fallback
    if (results.length === 0 && qs.useScraper === 'true' && process.env.NODE_ENV !== 'production') {
      console.log(`[bll-proxy] Usando scraper para ${portal.toUpperCase()}...`);
      try {
        const { scrapePortal } = await import('./scrapers/index.js');
        results = await scrapePortal(portal, {
          headers,
          objeto: qs.objeto || qs.q || '',
          uf: qs.uf || '',
          pagina: parseInt(qs.pagina || '1')
        });
        usedScraper = true;
        console.log(`[bll-proxy] Scraper do ${portal.toUpperCase()} retornou ${results.length} resultados`);
      } catch (scraperError) {
        console.error(`[bll-proxy] Scraper do ${portal.toUpperCase()} falhou:`, scraperError.message);
      }
    } else if (results.length === 0 && process.env.NODE_ENV === 'production') {
      console.log(`[bll-proxy] Scraper desabilitado em produção para ${portal.toUpperCase()}. Configure credenciais válidas.`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-BLL-Email, X-BLL-Password, X-BNC-Email, X-BNC-Password, X-ConLicitacao-Email, X-ConLicitacao-Password',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        data: results,
        total: results.length,
        portal: portal.toUpperCase(),
        fonte: usedScraper ? `Scraper ${portal.toUpperCase()}` : `${portal.toUpperCase()} API`,
        autenticado: bllToken !== null || usedScraper,
        method: usedScraper ? 'scraper' : 'api'
      })
    };
  } catch (err) {
    console.error('[bll-proxy] Erro:', err.message);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ data: [], total: 0, fonte: 'BLL', erro: err.message })
    };
  }
}
