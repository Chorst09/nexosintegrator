const express = require('express');

const router = express.Router();

const BLL_BASE = 'https://bll.org.br';
let bllToken = null;
let bllTokenExpiry = 0;

const getHeader = (headers, name) => headers[name] || headers[name.toLowerCase()] || '';

const getCredentials = (portal, headers = {}) => {
  const upper = String(portal || '').toUpperCase();
  return {
    email: getHeader(headers, `x-${portal}-email`) || process.env[`${upper}_EMAIL`] || '',
    password: getHeader(headers, `x-${portal}-password`) || process.env[`${upper}_PASSWORD`] || ''
  };
};

async function loginBLL(headers = {}) {
  if (bllToken && Date.now() < bllTokenExpiry) return bllToken;

  const { email, password } = getCredentials('bll', headers);
  if (!email || !password) return null;

  const attempts = [
    {
      url: `${BLL_BASE}/api/auth/login`,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password })
    },
    {
      url: `${BLL_BASE}/fornecedor/login`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ email, password }).toString()
    }
  ];

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          ...attempt.headers,
          'User-Agent': 'Mozilla/5.0 (compatible; NexosCRM/2.0)'
        },
        body: attempt.body
      });
      if (!response.ok) continue;
      const data = await response.json().catch(() => null);
      const token = data?.token || data?.access_token;
      if (token) {
        bllToken = token;
        bllTokenExpiry = Date.now() + 30 * 60 * 1000;
        return token;
      }
    } catch {
      // Tenta o próximo endpoint conhecido.
    }
  }

  return null;
}

async function buscarBLL({ objeto = '', uf = '', tamanhoPagina = 20, headers = {} }) {
  const token = await loginBLL(headers);
  const params = new URLSearchParams({
    page: '1',
    per_page: String(Math.max(10, Math.min(Number(tamanhoPagina) || 20, 50))),
    status: 'aberto'
  });
  if (objeto) params.set('q', objeto);
  if (uf) params.set('uf', uf);

  const requestHeaders = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; NexosCRM/2.0)'
  };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const endpoints = [
    `${BLL_BASE}/api/licitacoes?${params}`,
    `${BLL_BASE}/api/v1/licitacoes?${params}`,
    `${BLL_BASE}/api/processos?${params}`,
    `${BLL_BASE}/licitacoes/busca?${params}`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { headers: requestHeaders });
      if (!response.ok) continue;
      const data = await response.json().catch(() => null);
      const items = Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.licitacoes) ? data.licitacoes
        : Array.isArray(data?.items) ? data.items
        : [];

      return items.map((item) => ({
        id: item.id || item.codigo || `bll-${Date.now()}-${Math.random()}`,
        objetoCompra: item.objeto || item.descricao || item.titulo || item.title || '',
        orgaoEntidade: { razaoSocial: item.orgao || item.entidade || item.cliente || '' },
        modalidadeNome: item.modalidade || item.tipo || 'Pregão Eletrônico',
        valorTotalEstimado: item.valor || item.valorEstimado || null,
        dataAberturaProposta: item.dataAbertura || item.data_abertura || item.abertura || null,
        dataEncerramentoProposta: item.dataEncerramento || item.data_encerramento || null,
        unidadeOrgao: { ufSigla: item.uf || item.estado || uf || '' },
        linkSistemaOrigem: item.link || item.url || `${BLL_BASE}/licitacao/${item.id || ''}`,
        fonte: 'BLL',
        numeroCompra: item.numero || item.codigo || ''
      }));
    } catch {
      // Tenta o próximo endpoint conhecido.
    }
  }

  return [];
}

router.get('/', async (req, res) => {
  const portal = String(req.query.portal || 'bll').toLowerCase();
  const credentials = getCredentials(portal, req.headers);
  const configured = Boolean(credentials.email && credentials.password);

  if (req.query.action === 'check-credentials') {
    return res.json({
      status: {
        [portal]: {
          configured,
          source: configured ? 'headers' : 'none'
        }
      }
    });
  }

  if (req.query.action === 'login') {
    const autenticado = portal === 'bll' && configured
      ? Boolean(await loginBLL(req.headers))
      : configured;

    return res.status(autenticado ? 200 : 401).json({
      portal: portal.toUpperCase(),
      configured,
      autenticado,
      message: autenticado
        ? 'Fonte autenticada/configurada para busca'
        : 'Credenciais ausentes ou inválidas'
    });
  }

  const data = portal === 'bll'
    ? await buscarBLL({
      objeto: req.query.objeto || req.query.q || '',
      uf: req.query.uf || '',
      tamanhoPagina: req.query.tamanhoPagina || 20,
      headers: req.headers
    })
    : [];

  return res.json({
    data,
    total: data.length,
    portal: portal.toUpperCase(),
    autenticado: configured,
    method: portal === 'bll' ? 'api' : 'configured'
  });
});

module.exports = router;
