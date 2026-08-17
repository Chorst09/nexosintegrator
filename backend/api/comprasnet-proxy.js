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

// Modalidades PNCP compatíveis com cada tipo de busca
const MODALIDADES = {
  licitacao: [6, 8, 9, 4, 5],
  dispensas: [7],
  contratacoes14133: [6, 8, 9, 4, 5],
  arp: [6, 8, 9, 4, 5],
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

    for (const mod of modalidades) {
      try {
        const url = new URL(`${PNCP_BASE}/contratacoes/publicacao`);
        url.searchParams.set('dataInicial', dataI);
        url.searchParams.set('dataFinal', dataF);
        url.searchParams.set('codigoModalidadeContratacao', mod);
        url.searchParams.set('pagina', page);
        url.searchParams.set('tamanhoPagina', size);
        if (qs.uf) url.searchParams.set('uf', qs.uf);

        const response = await fetch(url.toString(), {
          headers: { Accept: 'application/json', 'User-Agent': 'NexosCRM/2.0' },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) continue;

        const data = await response.json().catch(() => null);
        if (data?.data && Array.isArray(data.data)) {
          allResults.push(...data.data);
        }
      } catch {
        // ignora erro de modalidade individual
      }
    }

    return res.json({
      data: allResults,
      total: allResults.length
    });
  } catch (error) {
    return res.json({ data: [], total: 0, erro: error.message || 'Falha ao buscar no PNCP' });
  }
});

module.exports = router;
