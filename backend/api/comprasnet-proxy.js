/**
 * Compras.gov.br Proxy - Backend (desenvolvimento/local)
 * Busca licitações, dispensas/inexigibilidades e contratações (Lei 14.133)
 * em dadosabertos.compras.gov.br (ComprasNet/SIASG).
 *
 * Em produção o mesmo endpoint é servido pela função Netlify
 * netlify/functions/comprasnet-proxy.js (redirect /api/* => /.netlify/functions/*).
 * Ambos retornam o mesmo shape: { data, total, erro }.
 *
 * Parâmetros: tipo=licitacao|dispensas|contratacoes14133|arp|pregoes (padrão: licitacao)
 */

const express = require('express');
const router = express.Router();

const COMPRASNET_BASE = 'https://dadosabertos.compras.gov.br';

const diasAtras = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

const hoje = () => new Date().toISOString().slice(0, 10);

const clamp = (n, min, max) => String(Math.max(min, Math.min(Number(n) || min, max)));

const ENDPOINTS = {
  licitacao: {
    path: '/modulo-legado/1_consultarLicitacao',
    params: (qs) => ({
      data_publicacao_inicial: qs.dataInicio || diasAtras(30),
      data_publicacao_final: qs.dataFim || hoje(),
      pagina: clamp(qs.pagina, 1, 500),
      tamanhoPagina: clamp(qs.tamanhoPagina, 10, 500)
    })
  },
  dispensas: {
    path: '/modulo-legado/5_consultarComprasSemLicitacao',
    params: (qs) => {
      const ano = Number(qs.dataInicio ? qs.dataInicio.slice(0, 4) : new Date().getFullYear());
      const p = {
        dt_ano_aviso: String(ano),
        pagina: clamp(qs.pagina, 1, 500),
        tamanhoPagina: clamp(qs.tamanhoPagina, 10, 500)
      };
      if (qs.dataInicio) p.dtDeclaracaoDispensaInicial = qs.dataInicio;
      if (qs.dataFim) p.dtDeclaracaoDispensaFinal = qs.dataFim;
      if (qs.modalidadeId) p.co_modalidade_licitacao = qs.modalidadeId;
      if (qs.pertence14133 === 'true') p.pertence14133 = 'true';
      return p;
    }
  },
  contratacoes14133: {
    path: '/modulo-contratacoes/1_consultarContratacoes_PNCP_14133',
    params: (qs) => {
      const p = {
        dataPublicacaoPncpInicial: qs.dataInicio || diasAtras(30),
        dataPublicacaoPncpFinal: qs.dataFim || hoje(),
        codigoModalidade: qs.modalidadeId || '5',
        pagina: clamp(qs.pagina, 1, 500),
        tamanhoPagina: clamp(qs.tamanhoPagina, 10, 500)
      };
      if (qs.uf) p.unidadeOrgaoUfSigla = qs.uf;
      if (qs.codigoOrgao) p.codigoOrgao = qs.codigoOrgao;
      return p;
    }
  },
  arp: {
    path: '/modulo-arp/1_consultarARP',
    params: (qs) => ({
      dataVigenciaInicialMin: qs.dataInicio || diasAtras(30),
      dataVigenciaInicialMax: qs.dataFim || hoje(),
      pagina: clamp(qs.pagina, 1, 500),
      tamanhoPagina: clamp(qs.tamanhoPagina, 10, 500)
    })
  },
  pregoes: {
    path: '/modulo-legado/3_consultarPregoes',
    params: (qs) => {
      const ano = Number(qs.dataInicio ? qs.dataInicio.slice(0, 4) : new Date().getFullYear() - 1);
      return {
        dt_data_edital_inicial: `${ano}-01-01`,
        dt_data_edital_final: `${ano}-12-31`,
        pagina: clamp(qs.pagina, 1, 500),
        tamanhoPagina: clamp(qs.tamanhoPagina, 10, 500)
      };
    }
  }
};

router.get('/', async (req, res) => {
  const qs = req.query;
  const tipo = ENDPOINTS[qs.tipo] ? qs.tipo : 'licitacao';
  const endpoint = ENDPOINTS[tipo];

  try {
    const url = new URL(`${COMPRASNET_BASE}${endpoint.path}`);
    for (const [key, value] of Object.entries(endpoint.params(qs))) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'NexosCRM/2.0' },
      signal: AbortSignal.timeout(25000)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      return res.json({ data: [], total: 0, erro: data?.message || `Compras.gov.br ${response.status}` });
    }

    return res.json({
      data: Array.isArray(data.resultado) ? data.resultado : [],
      total: Number(data.totalRegistros || 0)
    });
  } catch (error) {
    return res.json({ data: [], total: 0, erro: error.message || 'Falha ao buscar no Compras.gov.br' });
  }
});

module.exports = router;
