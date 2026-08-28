/**
 * Compras.gov.br Proxy - Backend
 * 
 * Utiliza PNCP (pncp.gov.br) como fonte de dados.
 * A API legada dadosabertos.compras.gov.br nao retorna mais dados.
 *
 * Parâmetros: tipo=licitacao|dispensas|contratacoes14133|arp|pregoes (padrão: licitacao)
 * Retorna: { data, total, erro }
 */

const express = require('express');
const router = express.Router();

const PNCP_BASE = 'https://pncp.gov.br/api/consulta/v1';

const diasAtras = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

const hoje = () => new Date().toISOString().slice(0, 10);

const toPNCPDate = (dateStr) => {
  if (!dateStr) return null;
  return String(dateStr).replace(/-/g, '').slice(0, 8);
};

const clamp = (n, min, max) => Math.max(min, Math.min(Number(n) || min, max));

const fetchWithRetry = async (url, options = {}, { timeoutMs = 12000, retries = 0 } = {}) => {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
};

const PNCP_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'User-Agent': 'Mozilla/5.0 (compatible; NexosCRM/2.0)'
};

const pncpCache = new Map();
const PNCP_CACHE_TTL_MS = 5 * 60 * 1000;

const isPNCPRateLimitText = (text) => /limite de requisi[cç][oõ]es|support id|requisi[cç][oõ]es excedido/i.test(String(text || ''));

const readCache = (key) => {
  const cached = pncpCache.get(key);
  if (!cached || Date.now() - cached.createdAt > PNCP_CACHE_TTL_MS) return null;
  return cached.data;
};

const writeCache = (key, data) => {
  pncpCache.set(key, { createdAt: Date.now(), data });
  if (pncpCache.size > 80) pncpCache.delete(pncpCache.keys().next().value);
};

const fetchPNCPItems = async (url, label) => {
  const key = url.toString();
  const cached = readCache(key);
  if (cached) return { data: cached, erro: null };

  try {
    const response = await fetchWithRetry(key, { headers: PNCP_HEADERS }, { timeoutMs: 8000, retries: 0 });
    if (response.status === 429) return { data: [], erro: `${label}: PNCP limitou requisições` };
    if (response.status === 503 || response.status === 504) return { data: [], erro: `${label}: PNCP indisponível no momento` };
    if (!response.ok) return { data: [], erro: `${label}: HTTP ${response.status}` };

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      return {
        data: [],
        erro: isPNCPRateLimitText(text)
          ? `${label}: PNCP limitou requisições`
          : `${label}: PNCP retornou resposta inválida`
      };
    }

    const payload = await response.json().catch(() => null);
    const data = Array.isArray(payload?.data) ? payload.data : [];
    writeCache(key, data);
    return { data, erro: null };
  } catch (error) {
    return { data: [], erro: `${label}: ${error.message || 'falha na consulta'}` };
  }
};

// Modalidades PNCP compatíveis com cada tipo de busca
const MODALIDADES = {
  licitacao: [6],
  dispensas: [7],
  contratacoes14133: [6],
  arp: [6],
  pregoes: [6]
};

router.get('/', async (req, res) => {
  const qs = req.query;
  const tipo = qs.tipo || 'licitacao';
  const modalidades = MODALIDADES[tipo] || MODALIDADES.licitacao;

  try {
    const dataInicio = qs.dataInicio || diasAtras(30);
    const dataFim = qs.dataFim || hoje();
    const dataI = toPNCPDate(dataInicio);
    const dataF = toPNCPDate(dataFim);
    const size = clamp(qs.tamanhoPagina, 10, 50);
    const page = clamp(qs.pagina, 1, 500);

    const allResults = [];
    const erros = [];
    const consultas = tipo === 'licitacao' || tipo === 'contratacoes14133' || tipo === 'arp'
      ? [null, ...modalidades]
      : modalidades;
    const seen = new Set();

    for (const mod of consultas) {
      const url = new URL(`${PNCP_BASE}/contratacoes/publicacao`);
      url.searchParams.set('dataInicial', dataI);
      url.searchParams.set('dataFinal', dataF);
      url.searchParams.set('pagina', page);
      url.searchParams.set('tamanhoPagina', size);
      if (mod) url.searchParams.set('codigoModalidadeContratacao', mod);
      if (qs.uf) url.searchParams.set('uf', qs.uf);

      const label = mod ? `Modalidade ${mod}` : 'PNCP geral';
      const item = await fetchPNCPItems(url, label);
      if (item.erro) erros.push(item.erro);

      for (const row of item.data || []) {
        const key = row.numeroControlePNCP || `${row.anoCompra}-${row.numeroCompra}-${row.orgaoEntidade?.cnpj}`;
        if (seen.has(key)) continue;
        seen.add(key);
        allResults.push(row);
        if (allResults.length >= size) break;
      }

      if (allResults.length >= size) break;
    }

    return res.json({
      data: allResults,
      total: allResults.length,
      erro: allResults.length === 0 && erros.length > 0 ? erros.slice(0, 2).join('; ') : undefined
    });
  } catch (error) {
    return res.json({ data: [], total: 0, erro: error.message || 'Falha ao buscar no PNCP' });
  }
});

module.exports = router;
