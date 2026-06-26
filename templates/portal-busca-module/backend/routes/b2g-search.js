/**
 * B2G Search API - Busca de Editais e Licitações
 * Agrega múltiplas fontes públicas gratuitas
 *
 * Fontes:
 * 1. PNCP - Portal Nacional de Contratações Públicas (API oficial)
 * 2. ComprasNet - Portal de Compras do Governo Federal
 * 3. Licitações-e (Banco do Brasil)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = (() => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) throw new Error('JWT_SECRET precisa estar configurado');
  return secret;
})();

// Middleware de autenticação simples
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hoje = () => new Date().toISOString().slice(0, 10).replaceAll('-', '');

const diasAtras = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10).replaceAll('-', '');
};

const toISODate = (yyyymmdd) => {
  if (!yyyymmdd || String(yyyymmdd).length < 8) return null;
  const s = String(yyyymmdd).replaceAll('-', '');
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

const formatCurrency = (value) => {
  if (!value || isNaN(Number(value))) return null;
  return Number(value);
};

const safeJson = async (res) => {
  try { return await res.json(); } catch { return null; }
};

const matchObjeto = (texto, objeto) => {
  if (!objeto || objeto.trim().length < 2) return true;
  const haystack = String(texto || '').toLowerCase();
  const termos = objeto.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  return termos.length === 0 || termos.some(t => haystack.includes(t));
};

// ─── PNCP - Publicações ───────────────────────────────────────────────────────

const PNCP_BASE = 'https://pncp.gov.br/api/consulta/v1';

async function buscarPNCPPublicacao({ objeto, uf, pagina = 1, tamanhoPagina = 20, dataInicio, dataFim }) {
  const resultados = [];
  const errors = [];

  const dataI = dataInicio ? String(dataInicio).replaceAll('-', '') : diasAtras(30);
  const dataF = dataFim ? String(dataFim).replaceAll('-', '') : hoje();

  // Buscar nas principais modalidades em paralelo
  const modalidades = [6, 8, 9, 4, 5]; // Pregão, Dispensa, Inexigibilidade, Concorrência, Tomada de Preços
  const ufsTarget = uf ? [uf] : [null];

  const fetchPromises = [];

  for (const ufTarget of ufsTarget) {
    for (const modCode of modalidades) {
      fetchPromises.push((async () => {
        try {
          const url = new URL(`${PNCP_BASE}/contratacoes/publicacao`);
          url.searchParams.set('dataInicial', dataI);
          url.searchParams.set('dataFinal', dataF);
          url.searchParams.set('codigoModalidadeContratacao', modCode);
          url.searchParams.set('pagina', pagina);
          url.searchParams.set('tamanhoPagina', Math.max(10, Math.min(Number(tamanhoPagina), 50)));
          if (ufTarget) url.searchParams.set('uf', ufTarget);

          const res = await fetch(url.toString(), {
            headers: { 'Accept': 'application/json', 'User-Agent': 'NexosCRM/2.0' },
            signal: AbortSignal.timeout(20000)
          });

          if (!res.ok) return [];

          const data = await safeJson(res);
          const items = Array.isArray(data?.data) ? data.data : [];

          return items
            .filter(item => matchObjeto(`${item.objetoCompra} ${item.informacaoComplementar}`, objeto))
            .map(item => ({
              id: item.numeroControlePNCP || `pncp-${item.anoCompra}-${item.numeroCompra}-${item.orgaoEntidade?.cnpj}`,
              fonte: 'PNCP',
              fonteLogo: '🏛️',
              titulo: item.objetoCompra || 'Sem descrição',
              orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || '',
              cnpjOrgao: item.orgaoEntidade?.cnpj || '',
              modalidade: item.modalidadeNome || '',
              uf: item.unidadeOrgao?.ufSigla || ufTarget || '',
              municipio: item.unidadeOrgao?.municipioNome || '',
              valor: formatCurrency(item.valorTotalEstimado),
              dataPublicacao: toISODate(item.dataPublicacaoPncp?.slice(0, 8)) || item.dataPublicacaoPncp,
              dataAbertura: item.dataAberturaProposta,
              dataEncerramento: item.dataEncerramentoProposta,
              numero: item.numeroCompra || '',
              ano: item.anoCompra || '',
              numeroControlePNCP: item.numeroControlePNCP || '',
              link: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.orgaoEntidade?.cnpj}/${item.anoCompra}/${item.sequencialCompra}`,
              status: item.situacaoCompraNome || 'Publicado',
              situacaoCodigo: item.codigoSituacaoCompra
            }));
        } catch (err) {
          errors.push(`PNCP mod${modCode}: ${err.message}`);
          return [];
        }
      })());
    }
  }

  const results = await Promise.allSettled(fetchPromises);
  for (const r of results) {
    if (r.status === 'fulfilled') resultados.push(...r.value);
  }

  return { resultados, errors };
}

// ─── PNCP - Propostas (em andamento) ─────────────────────────────────────────

async function buscarPNCPProposta({ objeto, uf, pagina = 1, tamanhoPagina = 20, dataInicio, dataFim }) {
  const resultados = [];
  const errors = [];

  try {
    const url = new URL(`${PNCP_BASE}/contratacoes/proposta`);
    url.searchParams.set('dataInicial', dataInicio ? String(dataInicio).replaceAll('-', '') : diasAtras(60));
    url.searchParams.set('dataFinal', dataFim ? String(dataFim).replaceAll('-', '') : hoje());
    url.searchParams.set('pagina', pagina);
    url.searchParams.set('tamanhoPagina', Math.max(10, Math.min(Number(tamanhoPagina), 50)));
    if (uf) url.searchParams.set('uf', uf);

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'User-Agent': 'NexosCRM/2.0' },
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) return { resultados, errors };

    const data = await safeJson(res);
    const items = Array.isArray(data?.data) ? data.data : [];

    for (const item of items) {
      if (!matchObjeto(`${item.objetoCompra} ${item.informacaoComplementar}`, objeto)) continue;

      resultados.push({
        id: `pncp-prop-${item.numeroControlePNCP || item.anoCompra + item.numeroCompra + item.orgaoEntidade?.cnpj}`,
        fonte: 'PNCP',
        fonteLogo: '🏛️',
        titulo: item.objetoCompra || 'Sem descrição',
        orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || '',
        cnpjOrgao: item.orgaoEntidade?.cnpj || '',
        modalidade: item.modalidadeNome || '',
        uf: item.unidadeOrgao?.ufSigla || uf || '',
        municipio: item.unidadeOrgao?.municipioNome || '',
        valor: formatCurrency(item.valorTotalEstimado),
        dataPublicacao: item.dataPublicacaoPncp,
        dataAbertura: item.dataAberturaProposta,
        dataEncerramento: item.dataEncerramentoProposta,
        numero: item.numeroCompra || '',
        ano: item.anoCompra || '',
        numeroControlePNCP: item.numeroControlePNCP || '',
        link: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.orgaoEntidade?.cnpj}/${item.anoCompra}/${item.sequencialCompra}`,
        status: 'Em proposta',
        situacaoCodigo: item.codigoSituacaoCompra
      });
    }
  } catch (err) {
    errors.push(`PNCP Proposta: ${err.message}`);
  }

  return { resultados, errors };
}

// ─── ComprasNet (dados.gov.br) ────────────────────────────────────────────────

async function buscarComprasNet({ objeto, uf, pagina = 1, tamanhoPagina = 20 }) {
  const resultados = [];
  const errors = [];

  try {
    const url = new URL('https://compras.dados.gov.br/licitacoes/v1/licitacoes.json');
    if (objeto) url.searchParams.set('descricao_objeto', objeto);
    if (uf) url.searchParams.set('uf_nome', uf);
    url.searchParams.set('_offset', (Number(pagina) - 1) * Number(tamanhoPagina));
    url.searchParams.set('_limit', Math.min(Number(tamanhoPagina), 50));

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'User-Agent': 'NexosCRM/2.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) return { resultados, errors };

    const data = await safeJson(res);
    const items = Array.isArray(data?._embedded?.licitacoes) ? data._embedded.licitacoes : [];

    for (const item of items) {
      resultados.push({
        id: `comprasnet-${item.id_licitacao || item.numero_licitacao || Math.random()}`,
        fonte: 'ComprasNet',
        fonteLogo: '🇧🇷',
        titulo: item.objeto_licitacao || item.descricao_objeto || 'Sem descrição',
        orgao: item.nome_orgao || '',
        cnpjOrgao: item.cnpj_orgao || '',
        modalidade: item.modalidade_licitacao || '',
        uf: item.uf || uf || '',
        municipio: item.municipio || '',
        valor: formatCurrency(item.valor_estimado || item.valor_licitacao),
        dataPublicacao: item.data_publicacao || null,
        dataAbertura: item.data_abertura_proposta || null,
        numero: item.numero_licitacao || '',
        link: `https://comprasnet.gov.br/acesso.asp?url=/ConsultaLicitacoes/ConsLicitacao_Filtro.asp`,
        status: item.situacao || 'Publicado'
      });
    }
  } catch (err) {
    errors.push(`ComprasNet: ${err.message}`);
  }

  return { resultados, errors };
}

// ─── Deduplicação ─────────────────────────────────────────────────────────────

function deduplicar(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.id || `${item.titulo?.slice(0, 40)}-${item.orgao?.slice(0, 20)}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Ordenação ────────────────────────────────────────────────────────────────

function ordenar(items, ordem = 'data_desc') {
  return [...items].sort((a, b) => {
    switch (ordem) {
      case 'data_desc':
        return new Date(b.dataPublicacao || 0) - new Date(a.dataPublicacao || 0);
      case 'data_asc':
        return new Date(a.dataPublicacao || 0) - new Date(b.dataPublicacao || 0);
      case 'valor_desc':
        return (b.valor || 0) - (a.valor || 0);
      case 'valor_asc':
        return (a.valor || 0) - (b.valor || 0);
      case 'abertura_asc':
        return new Date(a.dataAbertura || '9999') - new Date(b.dataAbertura || '9999');
      default:
        return 0;
    }
  });
}

// ─── GET /api/b2g-search/fontes ───────────────────────────────────────────────

router.get('/fontes', auth, (req, res) => {
  res.json({
    fontes: [
      {
        id: 'pncp',
        nome: 'PNCP',
        descricao: 'Portal Nacional de Contratações Públicas',
        logo: '🏛️',
        tipo: 'federal',
        status: 'ativo',
        url: 'https://pncp.gov.br'
      },
      {
        id: 'comprasnet',
        nome: 'ComprasNet',
        descricao: 'Portal de Compras do Governo Federal (SIASG)',
        logo: '🇧🇷',
        tipo: 'federal',
        status: 'ativo',
        url: 'https://comprasnet.gov.br'
      }
    ]
  });
});

// ─── GET /api/b2g-search/search ───────────────────────────────────────────────

router.get('/search', auth, async (req, res) => {
  const {
    objeto = '',
    uf = '',
    pagina = 1,
    tamanhoPagina = 20,
    dataInicio = '',
    dataFim = '',
    fontes = 'pncp,comprasnet',
    ordem = 'data_desc',
    incluirPropostas = 'true'
  } = req.query;

  const fontesAtivas = String(fontes).toLowerCase().split(',').map(f => f.trim());

  try {
    const promises = [];

    if (fontesAtivas.includes('pncp')) {
      promises.push(
        buscarPNCPPublicacao({ objeto, uf, pagina: Number(pagina), tamanhoPagina: Number(tamanhoPagina), dataInicio, dataFim })
          .catch(err => ({ resultados: [], errors: [`PNCP Publicação: ${err.message}`] }))
      );

      if (incluirPropostas === 'true') {
        promises.push(
          buscarPNCPProposta({ objeto, uf, pagina: Number(pagina), tamanhoPagina: Number(tamanhoPagina), dataInicio, dataFim })
            .catch(err => ({ resultados: [], errors: [`PNCP Proposta: ${err.message}`] }))
        );
      }
    }

    if (fontesAtivas.includes('comprasnet')) {
      promises.push(
        buscarComprasNet({ objeto, uf, pagina: Number(pagina), tamanhoPagina: Number(tamanhoPagina) })
          .catch(err => ({ resultados: [], errors: [`ComprasNet: ${err.message}`] }))
      );
    }

    const settled = await Promise.allSettled(promises);

    const todosResultados = [];
    const todosErros = [];

    for (const r of settled) {
      if (r.status === 'fulfilled') {
        todosResultados.push(...(r.value.resultados || []));
        todosErros.push(...(r.value.errors || []));
      } else {
        todosErros.push(r.reason?.message || 'Erro desconhecido');
      }
    }

    const deduplicados = deduplicar(todosResultados);
    const ordenados = ordenar(deduplicados, ordem);

    // Estatísticas por fonte
    const porFonte = {};
    for (const item of deduplicados) {
      porFonte[item.fonte] = (porFonte[item.fonte] || 0) + 1;
    }

    res.json({
      data: ordenados,
      total: ordenados.length,
      pagina: Number(pagina),
      fontes: porFonte,
      erros: todosErros.length > 0 ? todosErros : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[b2g-search] Erro geral:', err);
    res.status(500).json({ error: 'Erro ao buscar licitações', data: [], total: 0 });
  }
});

module.exports = router;
