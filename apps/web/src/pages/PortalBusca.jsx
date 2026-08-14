import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, X, ExternalLink, Loader2, Heart,
  MapPin, Calendar, Lock, Plus, Bell, Settings, RefreshCcw, CheckCircle, Trash2,
  BookmarkPlus, ThumbsUp, ThumbsDown, Tag, Building2
} from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '../config/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' }, { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' }, { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' }, { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

const FONTES_CONFIG = [
  { id: 'pncp', nome: 'PNCP Oficial', descricao: 'Portal Nacional de Contratações Públicas', metodo: 'API REST', sync: 'Tempo Real', icon: '🏛️' },
  { id: 'comprasnet', nome: 'ComprasNet', descricao: 'Licitações do Compras.gov.br (SIASG / Lei 8.666)', metodo: 'API REST', sync: 'Tempo Real', icon: '🇧🇷' },
  { id: 'dispensas', nome: 'Compras.gov.br Dispensas', descricao: 'Dispensas e inexigibilidades (Lei 8.666 e 14.133)', metodo: 'API REST', sync: 'Tempo Real', icon: '📄' },
  { id: 'contratacoes14133', nome: 'Contratações Lei 14.133', descricao: 'Contratações PNCP via Compras.gov.br', metodo: 'API REST', sync: 'Tempo Real', icon: '⚖️' }
];

const FONTES_STORAGE_KEY = 'b2g_fontes_integradas_v1';

const FONTES_PAGAS = [
  { portal: 'bll', nome: 'BLL Compras', descricao: 'Bolsa de Licitações e Leilões', metodo: 'Portal autenticado', sync: 'Sob demanda', icon: '⚖️' },
  { portal: 'bnc', nome: 'BNC Compras', descricao: 'Banco Nacional de Compras', metodo: 'Portal autenticado', sync: 'Sob demanda', icon: '🏦' },
  { portal: 'conlicitacao', nome: 'ConLicitação', descricao: 'Consulte Online ConLicitação', metodo: 'Portal autenticado', sync: 'Sob demanda', icon: '🔎' }
];

const novaFonteForm = () => ({
  portal: 'conlicitacao',
  nome: 'ConLicitação',
  usuario: '',
  senha: '',
  ativa: true
});

const ORDENS = [
  { value: 'data_desc', label: 'Mais recentes primeiro' },
  { value: 'data_asc', label: 'Mais antigos primeiro' },
  { value: 'valor_desc', label: 'Maior valor primeiro' },
  { value: 'valor_asc', label: 'Menor valor primeiro' },
  { value: 'abertura_asc', label: 'Abertura mais próxima' }
];

const MODALIDADES_CONLICITACAO = [
  { id: '', nome: 'Todas as modalidades' },
  { id: 10, nome: 'Pregão Eletrônico' },
  { id: 11, nome: 'Pregão Presencial' },
  { id: 4, nome: 'Concorrência' },
  { id: 7, nome: 'Dispensa de Licitação' },
  { id: 13, nome: 'Tomada de Preço' },
  { id: 6, nome: 'Convite' },
  { id: 8, nome: 'Leilão' },
  { id: 1, nome: 'Audiência Pública' },
  { id: 2, nome: 'Compra Eletrônica' },
  { id: 12, nome: 'RDC' }
];

// ─── PNCP API (chamada direta do browser — sem CORS issues pois é API pública) ─

const PNCP_BASE = 'https://pncp.gov.br/api/consulta/v1';

const hoje = () => {
  // PNCP tem dados até ~2025. Usar data atual mas com fallback para dados reais.
  const d = new Date();
  return d.toISOString().slice(0, 10).replaceAll('-', '');
};
const diasAtras = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10).replaceAll('-', '');
};
// Data máxima com dados reais no PNCP (ajuste conforme necessário)
const dataFimPadrao = () => hoje();
const dataInicioPadrao = () => diasAtras(90);
const toISODate = (s) => {
  if (!s) return null;
  const str = String(s).replaceAll('-', '').slice(0, 8);
  if (str.length < 8) return s;
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
};

const matchObjeto = (texto, objeto) => {
  if (!objeto || objeto.trim().length < 2) return true;
  const hay = String(texto || '').toLowerCase();
  return objeto.toLowerCase().split(/\s+/).filter(t => t.length > 2).some(t => hay.includes(t));
};

async function buscarPNCPPublicacao({ objeto, uf, dataInicio, dataFim, tamanhoPagina = 20 }) {
  const dataI = dataInicio ? dataInicio.replaceAll('-', '') : dataInicioPadrao();
  const dataF = dataFim ? dataFim.replaceAll('-', '') : dataFimPadrao();
  const modalidades = [6, 8, 9, 4, 5]; // Pregão, Dispensa, Inexigibilidade, Concorrência, Tomada de Preços
  const resultados = [];

  const fetches = modalidades.map(async (mod) => {
    try {
      const url = new URL(`${PNCP_BASE}/contratacoes/publicacao`);
      url.searchParams.set('dataInicial', dataI);
      url.searchParams.set('dataFinal', dataF);
      url.searchParams.set('codigoModalidadeContratacao', mod);
      url.searchParams.set('pagina', 1);
      url.searchParams.set('tamanhoPagina', Math.max(10, Math.min(Number(tamanhoPagina), 50)));
      if (uf) url.searchParams.set('uf', uf);

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json', 'User-Agent': 'NexosCRM/2.0' },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) return [];
      const data = await res.json().catch(() => null);
      const items = Array.isArray(data?.data) ? data.data : [];
      return items
        .filter(item => matchObjeto(`${item.objetoCompra} ${item.informacaoComplementar}`, objeto))
        .map(item => ({
          id: item.numeroControlePNCP || `pncp-${item.anoCompra}-${item.numeroCompra}-${item.orgaoEntidade?.cnpj}`,
          fonte: 'PNCP',
          fonteLogo: '🏛️',
          titulo: item.objetoCompra || 'Sem descrição',
          orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || '',
          modalidade: item.modalidadeNome || '',
          uf: item.unidadeOrgao?.ufSigla || uf || '',
          municipio: item.unidadeOrgao?.municipioNome || '',
          valor: item.valorTotalEstimado ? Number(item.valorTotalEstimado) : null,
          dataPublicacao: toISODate(item.dataPublicacaoPncp?.slice(0, 8)) || item.dataPublicacaoPncp,
          dataAbertura: item.dataAberturaProposta,
          dataEncerramento: item.dataEncerramentoProposta,
          numero: item.numeroCompra || '',
          ano: item.anoCompra || '',
          link: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.orgaoEntidade?.cnpj}/${item.anoCompra}/${item.sequencialCompra}`,
          status: item.situacaoCompraNome || 'Publicado',
          situacaoCodigo: item.codigoSituacaoCompra
        }));
    } catch { return []; }
  });

  const results = await Promise.allSettled(fetches);
  for (const r of results) {
    if (r.status === 'fulfilled') resultados.push(...r.value);
  }
  return resultados;
}

async function buscarPNCPProposta({ objeto, uf, dataInicio, dataFim, tamanhoPagina = 20 }) {
  try {
    const url = new URL(`${PNCP_BASE}/contratacoes/proposta`);
    url.searchParams.set('dataInicial', dataInicio ? dataInicio.replaceAll('-', '') : dataInicioPadrao());
    url.searchParams.set('dataFinal', dataFim ? dataFim.replaceAll('-', '') : dataFimPadrao());
    url.searchParams.set('pagina', 1);
    url.searchParams.set('tamanhoPagina', Math.max(10, Math.min(Number(tamanhoPagina), 50)));
    if (uf) url.searchParams.set('uf', uf);

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'User-Agent': 'NexosCRM/2.0' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const items = Array.isArray(data?.data) ? data.data : [];
    return items
      .filter(item => matchObjeto(`${item.objetoCompra} ${item.informacaoComplementar}`, objeto))
      .map(item => ({
        id: `pncp-prop-${item.numeroControlePNCP || item.anoCompra + item.numeroCompra + item.orgaoEntidade?.cnpj}`,
        fonte: 'PNCP',
        fonteLogo: '🏛️',
        titulo: item.objetoCompra || 'Sem descrição',
        orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || '',
        modalidade: item.modalidadeNome || '',
        uf: item.unidadeOrgao?.ufSigla || uf || '',
        municipio: item.unidadeOrgao?.municipioNome || '',
        valor: item.valorTotalEstimado ? Number(item.valorTotalEstimado) : null,
        dataPublicacao: item.dataPublicacaoPncp,
        dataAbertura: item.dataAberturaProposta,
        dataEncerramento: item.dataEncerramentoProposta,
        numero: item.numeroCompra || '',
        ano: item.anoCompra || '',
        link: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.orgaoEntidade?.cnpj}/${item.anoCompra}/${item.sequencialCompra}`,
        status: 'Em proposta',
        situacaoCodigo: item.codigoSituacaoCompra
      }));
  } catch { return []; }
}

// ─── ComprasNet API (dadosabertos.compras.gov.br, via proxy) ─────────────────

const UFS_BR_SET = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

const extrairUfEndereco = (endereco) => {
  const match = String(endereco || '').match(/(?:\/|\s*-\s*)\s*([A-Z]{2})\s*$/);
  return match && UFS_BR_SET.has(match[1]) ? match[1] : '';
};

const extrairMunicipioEndereco = (endereco) => {
  const match = String(endereco || '').match(/([^\/-]+?)(?:\/\s*|\s*-\s*)\s*[A-Z]{2}\s*$/);
  if (!match) return '';
  const parts = match[1].trim().split(/\s*-\s*/);
  return parts[parts.length - 1].trim();
};

async function buscarComprasGovProxy(tipo, params) {
  const url = new URL(buildApiUrl('/comprasnet-proxy'), window.location.origin);
  if (tipo) url.searchParams.set('tipo', tipo);
  if (params.dataInicio) url.searchParams.set('dataInicio', params.dataInicio);
  if (params.dataFim) url.searchParams.set('dataFim', params.dataFim);
  if (params.uf) url.searchParams.set('uf', params.uf);
  if (params.modalidadeId) url.searchParams.set('modalidadeId', params.modalidadeId);
  url.searchParams.set('tamanhoPagina', Math.max(10, Math.min(Number(params.tamanhoPagina || 20), 500)));

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(25000)
  });
  if (!res.ok) return [];
  const payload = await res.json().catch(() => null);
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function buscarComprasNet({ objeto, uf, dataInicio, dataFim, tamanhoPagina = 20 }) {
  try {
    const items = await buscarComprasGovProxy('licitacao', { dataInicio, dataFim, tamanhoPagina });

    return items
      .filter(item => matchObjeto(`${item.objeto} ${item.informacoes_gerais}`, objeto))
      .map(item => {
        const itemUf = extrairUfEndereco(item.endereco_entrega_edital) || uf || '';
        if (uf && itemUf !== uf) return null;
        return {
          id: `comprasnet-${item.id_compra || item.identificador || Math.random()}`,
          fonte: 'ComprasNet',
          fonteLogo: '🇧🇷',
          titulo: item.objeto || 'Sem descrição',
          orgao: `UASG ${item.uasg || ''}`.trim() || 'ComprasNet',
          modalidade: item.nome_modalidade || '',
          uf: itemUf,
          municipio: extrairMunicipioEndereco(item.endereco_entrega_edital),
          valor: (item.valor_estimado_total || item.valor_homologado_total) ? Number(item.valor_estimado_total || item.valor_homologado_total) : null,
          dataPublicacao: item.data_publicacao || null,
          dataAbertura: item.data_abertura_proposta || null,
          dataEncerramento: null,
          numero: String(item.numero_aviso || ''),
          ano: String(item.id_compra || '').slice(-4),
          link: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/consulta-licitacoes',
          status: item.situacao_aviso || 'Publicado'
        };
      })
      .filter(Boolean);
  } catch { return []; }
}

async function buscarComprasGovDispensas({ objeto, uf, dataInicio, dataFim, tamanhoPagina = 20 }) {
  try {
    const items = await buscarComprasGovProxy('dispensas', { dataInicio, dataFim, tamanhoPagina });

    return items
      .filter(item => matchObjeto(`${item.ds_objeto_licitacao} ${item.ds_justificativa}`, objeto))
      .map(item => {
        const itemUf = extrairUfEndereco(item.no_ausg || '') || uf || '';
        if (uf && itemUf !== uf) return null;
        const modalidadeMap = { 6: 'Dispensa de Licitação', 7: 'Inexigibilidade' };
        return {
          id: `dispensa-${item.id_compra || item.nu_aviso_licitacao || Math.random()}`,
          fonte: 'Compras.gov.br Dispensas',
          fonteLogo: '📄',
          titulo: item.ds_objeto_licitacao || 'Sem descrição',
          orgao: item.no_ausg || `UASG ${item.co_uasg || ''}`.trim() || 'Compras.gov.br',
          modalidade: modalidadeMap[String(item.co_modalidade_licitacao)] || (item.co_modalidade_licitacao ? `Modalidade ${item.co_modalidade_licitacao}` : ''),
          uf: itemUf,
          municipio: extrairMunicipioEndereco(item.no_ausg || ''),
          valor: item.vr_estimado ? Number(item.vr_estimado) : null,
          dataPublicacao: item.dt_publicacao || item.dt_declaracao_dispensa || null,
          dataAbertura: null,
          dataEncerramento: null,
          numero: String(item.nu_aviso_licitacao || ''),
          ano: String(item.dt_ano_aviso || item.id_compra || '').slice(-4),
          link: `https://www.gov.br/compras/pt-br/acesso-a-informacao/consulta-licitacoes?numeroAviso=${encodeURIComponent(item.nu_aviso_licitacao || '')}`,
          status: item.pertence14133 ? 'Lei 14.133' : 'Publicado'
        };
      })
      .filter(Boolean);
  } catch { return []; }
}

async function buscarContratacoes14133({ objeto, uf, dataInicio, dataFim, tamanhoPagina = 20 }) {
  try {
    const items = await buscarComprasGovProxy('contratacoes14133', { uf, dataInicio, dataFim, tamanhoPagina });

    return items
      .filter(item => matchObjeto(`${item.objetoCompra} ${item.informacaoComplementar}`, objeto))
      .map(item => {
        const itemUf = item.unidadeOrgaoUfSigla || uf || '';
        if (uf && itemUf !== uf) return null;
        return {
          id: `cn14133-${item.idCompra || item.numeroControlePNCP || Math.random()}`,
          fonte: 'Contratações Lei 14.133',
          fonteLogo: '⚖️',
          titulo: item.objetoCompra || 'Sem descrição',
          orgao: item.orgaoEntidadeRazaoSocial || item.unidadeOrgaoNomeUnidade || '',
          modalidade: item.modalidadeNome || '',
          uf: itemUf,
          municipio: item.unidadeOrgaoMunicipioNome || '',
          valor: item.valorTotalEstimado ? Number(item.valorTotalEstimado) : null,
          dataPublicacao: item.dataPublicacaoPncp || null,
          dataAbertura: item.dataAberturaPropostaPncp || null,
          dataEncerramento: item.dataEncerramentoPropostaPncp || null,
          numero: String(item.numeroCompra || ''),
          ano: String(item.anoCompraPncp || ''),
          link: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.orgaoEntidadeCnpj}/${item.anoCompraPncp}/${item.sequencialCompraPncp}`,
          status: item.situacaoCompraNomePncp || 'Publicado'
        };
      })
      .filter(Boolean);
  } catch { return []; }
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

const formatCurrency = (value) => {
  if (!value && value !== 0) return null;
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value) => {
  if (!value) return null;
  try { return new Date(value).toLocaleDateString('pt-BR'); } catch { return value; }
};

const deduplicar = (items) => {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const ordenar = (items, ordem) => [...items].sort((a, b) => {
  switch (ordem) {
    case 'data_desc': return new Date(b.dataPublicacao || 0) - new Date(a.dataPublicacao || 0);
    case 'data_asc': return new Date(a.dataPublicacao || 0) - new Date(b.dataPublicacao || 0);
    case 'valor_desc': return (b.valor || 0) - (a.valor || 0);
    case 'valor_asc': return (a.valor || 0) - (b.valor || 0);
    case 'abertura_asc': return new Date(a.dataAbertura || '9999') - new Date(b.dataAbertura || '9999');
    default: return 0;
  }
});

const getFonteBadgeClass = (fonte) => {
  const map = {
    'PNCP': 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    'ComprasNet': 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    'Compras.gov.br Dispensas': 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
    'Contratações Lei 14.133': 'bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700',
    'BLL': 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    'BNC': 'bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
    'ConLicitação': 'bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700',
  };
  return map[fonte] || 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
};

const getFonteDisplayName = (fonte) => {
  if (fonte.portal === 'conlicitacao') return 'ConLicitação';
  return String(fonte.nome || fonte.portal || '').replace(' Compras', '').toUpperCase();
};

const toDisplayText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toDisplayText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const keys = ['nome', 'name', 'label', 'descricao', 'description', 'sigla', 'acronym', 'uf', 'codigo', 'id'];
    for (const key of keys) {
      const text = toDisplayText(value[key]);
      if (text) return text;
    }
  }
  return '';
};

const normalizePortalItem = (item, fonte) => ({
  id: item.id || `${fonte.portal}-${item.numeroCompra || item.numero || Date.now()}-${Math.random()}`,
  fonte: getFonteDisplayName(fonte),
  fonteLogo: fonte.icon,
  titulo: toDisplayText(item.titulo || item.objetoCompra || item.objeto || item.descricao) || 'Sem descrição',
  orgao: toDisplayText(item.orgao || item.orgaoEntidade?.razaoSocial || item.entidade),
  modalidade: toDisplayText(item.modalidade || item.modalidadeNome || item.tipo),
  uf: toDisplayText(item.uf || item.unidadeOrgao?.ufSigla),
  municipio: toDisplayText(item.municipio || item.cidade || item.unidadeOrgao?.municipioNome),
  valor: (item.valor || item.valorTotalEstimado) ? Number(item.valor || item.valorTotalEstimado) : null,
  dataPublicacao: item.dataPublicacao || item.dataPublicacaoPncp || null,
  dataAbertura: item.dataAbertura || item.dataAberturaProposta || null,
  dataEncerramento: item.dataEncerramento || item.dataEncerramentoProposta || null,
  numero: toDisplayText(item.numero || item.numeroCompra),
  ano: item.ano || '',
  link: toDisplayText(item.link || item.linkSistemaOrigem),
  status: toDisplayText(item.status || item.situacao) || 'Aberto'
});

async function buscarFonteIntegrada(fonte, params) {
  if (!fonte.usuario || !fonte.senha) return [];

  const url = new URL(buildApiUrl('/bll-proxy'), window.location.origin);
  url.searchParams.set('portal', fonte.portal);
  url.searchParams.set('objeto', params.objeto || '');
  url.searchParams.set('uf', params.uf || '');
  url.searchParams.set('cidade', params.cidade || '');
  url.searchParams.set('dataInicio', params.dataInicio || '');
  url.searchParams.set('dataFim', params.dataFim || '');
  url.searchParams.set('dataPrazoInicio', params.dataPrazoInicio || '');
  url.searchParams.set('dataPrazoFim', params.dataPrazoFim || '');
  url.searchParams.set('exactSearch', params.exactSearch ? 'true' : '');
  url.searchParams.set('apenasVigentes', params.apenasVigentes ? 'true' : '');
  url.searchParams.set('comEdital', params.comEdital ? 'true' : '');
  url.searchParams.set('comMonitoramentoChat', params.comMonitoramentoChat ? 'true' : '');
  url.searchParams.set('numeroEdital', params.numeroEdital || '');
  url.searchParams.set('numeroConlicitacao', params.numeroConlicitacao || '');
  url.searchParams.set('modalidadeId', params.modalidadeId || '');
  url.searchParams.set('tamanhoPagina', params.tamanhoPagina || 20);
  if (fonte.portal !== 'bll') url.searchParams.set('useScraper', 'true');

  const headerPrefix = fonte.portal === 'conlicitacao' ? 'conlicitacao' : fonte.portal;
  const res = await fetch(url.toString(), {
    headers: {
      [`x-${headerPrefix}-email`]: fonte.usuario,
      [`x-${headerPrefix}-password`]: fonte.senha
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.erro || payload?.message || `Falha ao buscar em ${getFonteDisplayName(fonte)}`);
  }
  const payload = await res.json().catch(() => null);
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.map(item => normalizePortalItem(item, fonte));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 bg-white dark:bg-slate-800 border-l-4 ${t.error ? 'border-red-500' : 'border-blue-500'} shadow-xl p-4 rounded-lg max-w-sm animate-fade-in`}>
          <span className="text-xl mt-0.5">{t.error ? '❌' : '✅'}</span>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card de Edital ───────────────────────────────────────────────────────────

function CardEdital({ item, favorito, leadSalvo, salvandoLead, onToggleFavorito, onAbrirSalvarLead }) {
  const vigente = item.status && !['encerrado', 'cancelado', 'revogado'].includes(item.status.toLowerCase());

  return (
    <div className={`bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition duration-200 overflow-hidden group ${vigente ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-80'}`}>
      <div className={`border-l-4 ${vigente ? 'border-blue-500' : 'border-slate-400 dark:border-slate-600'} p-5 md:p-6`}>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${getFonteBadgeClass(item.fonte)}`}>
                {item.fonteLogo} {item.fonte}
              </span>
              {vigente ? (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-2 py-1 rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Vigente
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-md flex items-center gap-1.5">
                  <Lock size={10} /> Encerrado
                </span>
              )}
              {item.modalidade && (
                <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-md">
                  {item.modalidade}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1">
              {item.orgao || 'Órgão não informado'}
            </h3>
          </div>

          {/* Valor */}
          <div className="text-left md:text-right bg-slate-50 dark:bg-slate-700/40 md:bg-transparent md:dark:bg-transparent p-3 md:p-0 rounded-lg border border-slate-100 dark:border-slate-700 md:border-none shrink-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Valor Estimado</p>
            {item.valor ? (
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.valor)}</p>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">Não informado</p>
            )}
          </div>
        </div>

        {/* Objeto */}
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2 leading-relaxed">{item.titulo}</p>

        {/* Metadados */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600 dark:text-slate-300 mb-5 pb-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] mb-1">Localização</p>
            <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <MapPin size={11} className="text-slate-400 dark:text-slate-500" />
              {[item.municipio, item.uf].filter(Boolean).join(' - ') || '-'}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] mb-1">Modalidade</p>
            <p className="font-semibold text-slate-700 dark:text-slate-200">{item.modalidade || '-'}</p>
          </div>
          <div>
            <p className="font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] mb-1">Publicação</p>
            <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Calendar size={11} className="text-slate-400 dark:text-slate-500" />
              {formatDate(item.dataPublicacao) || '-'}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] mb-1">Abertura</p>
            <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Calendar size={11} className="text-slate-400 dark:text-slate-500" />
              {formatDate(item.dataAbertura) || '-'}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => onToggleFavorito(item)}
              className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg font-semibold border transition ${
                favorito
                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Heart size={14} fill={favorito ? 'currentColor' : 'none'} />
              {favorito ? 'Salvo' : 'Salvar'}
            </button>
            <button
              onClick={() => onAbrirSalvarLead(item)}
              disabled={leadSalvo || salvandoLead}
              className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg font-semibold border transition ${
                leadSalvo
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 cursor-default'
                  : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
              } disabled:opacity-75`}
            >
              {salvandoLead ? (
                <Loader2 size={14} className="animate-spin" />
              ) : leadSalvo ? (
                <CheckCircle size={14} />
              ) : (
                <BookmarkPlus size={14} />
              )}
              {leadSalvo ? 'Lead salvo' : 'Salvar Lead'}
            </button>
          </div>

          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm flex items-center justify-center gap-2"
            >
              Ir para o Portal <ExternalLink size={13} className="opacity-70" />
            </a>
          ) : (
            <span className="w-full sm:w-auto bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
              Link não disponível
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SalvarLeadModal({
  item,
  decisao,
  observacoes,
  saving,
  onDecisao,
  onObservacoes,
  onClose,
  onSalvar
}) {
  if (!item) return null;

  const decisions = [
    { id: 'ANALISE', label: 'Em Análise', icon: <Tag size={20} /> },
    { id: 'GO', label: 'GO', icon: <ThumbsUp size={20} /> },
    { id: 'NO_GO', label: 'NO GO', icon: <ThumbsDown size={20} /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <h3 className="flex items-center gap-3 text-xl font-bold">
              <BookmarkPlus className="text-blue-300" size={24} />
              Salvar como Lead
            </h3>
            <p className="mt-1 text-sm text-slate-300">Analise este edital e registre sua decisão antes de avançar.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border border-blue-900/80 bg-slate-800/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-bold text-white">{item.numero || item.id}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-200">
                  <Building2 size={16} className="text-slate-400" />
                  {item.orgao || 'Órgão não informado'}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <MapPin size={16} className="text-slate-400" />
                  {[item.municipio, item.uf].filter(Boolean).join(' - ') || 'Local não informado'}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-blue-500/60 px-4 py-2 text-xs font-bold uppercase text-blue-200">
                {item.modalidade || item.fonte || 'Edital'}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{item.titulo}</p>
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Calendar size={16} className="text-blue-300" />
                {formatDate(item.dataAbertura || item.dataEncerramento || item.dataPublicacao) || 'Data não informada'}
              </span>
              <span className="text-sm font-semibold text-emerald-300">{item.status || 'Não informado'}</span>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-slate-100">Decisão</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {decisions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onDecisao(option.id)}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    decisao === option.id
                      ? 'border-blue-400 bg-blue-500/20 text-blue-200 ring-2 ring-blue-400'
                      : 'border-slate-700 bg-slate-950/20 text-slate-300 hover:border-blue-500/70 hover:text-blue-200'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-100">Observações (opcional)</label>
            <textarea
              value={observacoes}
              onChange={(event) => onObservacoes(event.target.value)}
              rows={4}
              placeholder="Justificativa da decisão, pontos de atenção, concorrentes identificados..."
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/30 p-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {decisao === 'GO' && (
            <div className="rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300 flex items-start gap-2">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-bold">GO selecionado</p>
                <p className="text-emerald-400 text-xs mt-0.5">Uma oportunidade B2G será criada automaticamente e você será redirecionado para o Kanban de Oportunidades.</p>
              </div>
            </div>
          )}
          {decisao === 'NO_GO' && (
            <div className="rounded-xl border border-red-700/60 bg-red-900/20 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
              <span className="text-lg">❌</span>
              <div>
                <p className="font-bold">NO GO selecionado</p>
                <p className="text-red-400 text-xs mt-0.5">O edital será registrado como descartado. Você pode reverter depois em B2G &gt; Leads.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSalvar}
            disabled={saving}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition disabled:opacity-60 ${
              decisao === 'GO'
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                : decisao === 'NO_GO'
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-blue-400 hover:bg-blue-300 text-slate-950'
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <BookmarkPlus size={16} />}
            {decisao === 'GO' ? '✅ GO — Criar Oportunidade' : decisao === 'NO_GO' ? '❌ Registrar NO GO' : 'Salvar Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PortalBusca() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('busca'); // 'busca' | 'fontes' | 'alertas'

  // Busca
  const [objeto, setObjeto] = useState('');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [apenasVigentes, setApenasVigentes] = useState(false);
  const [buscaExata, setBuscaExata] = useState(false);
  const [comEdital, setComEdital] = useState(false);
  const [comMonitoramentoChat, setComMonitoramentoChat] = useState(false);
  const [numeroEdital, setNumeroEdital] = useState('');
  const [numeroConlicitacao, setNumeroConlicitacao] = useState('');
  const [modalidadeId, setModalidadeId] = useState('');
  const [ordem, setOrdem] = useState('data_desc');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dataPrazoInicio, setDataPrazoInicio] = useState('');
  const [dataPrazoFim, setDataPrazoFim] = useState('');
  const [fontesAtivas, setFontesAtivas] = useState(() => {
    try {
      const integradas = JSON.parse(localStorage.getItem(FONTES_STORAGE_KEY) || '[]');
      return ['pncp', 'comprasnet', 'dispensas', 'contratacoes14133', ...integradas.filter(f => f.ativa !== false).map(f => f.id)];
    } catch {
      return ['pncp', 'comprasnet', 'dispensas', 'contratacoes14133'];
    }
  });
  const [incluirPropostas, setIncluirPropostas] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [fontesIntegradas, setFontesIntegradas] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FONTES_STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [modalFonteAberto, setModalFonteAberto] = useState(false);
  const [fonteForm, setFonteForm] = useState(novaFonteForm);
  const [testandoFonte, setTestandoFonte] = useState(false);

  // Resultados
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [total, setTotal] = useState(0);
  const [porFonte, setPorFonte] = useState({});
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [leadModalItem, setLeadModalItem] = useState(null);
  const [leadDecisao, setLeadDecisao] = useState('ANALISE');
  const [leadObservacoes, setLeadObservacoes] = useState('');
  const [salvandoLeadId, setSalvandoLeadId] = useState('');
  const [leadsSalvos, setLeadsSalvos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('b2g_busca_leads_salvos_v1') || '[]'); } catch { return []; }
  });

  // Favoritos
  const [favoritos, setFavoritos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('b2g_favoritos_v2') || '[]'); } catch { return []; }
  });
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);

  // Alertas
  const [alertas, setAlertas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('b2g_alertas') || '[]'); } catch { return []; }
  });
  const [alertaForm, setAlertaForm] = useState({ palavras: '', uf: '' });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const fontesDisponiveis = useMemo(
    () => [...FONTES_CONFIG, ...fontesIntegradas],
    [fontesIntegradas]
  );

  const showToast = useCallback((title, text, error = false) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, text, error }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Filtro local por cidade e vigente (client-side após busca)
  const resultadosFiltrados = resultados.filter(item => {
    if (apenasVigentes) {
      const status = String(item.status || '').toLowerCase();
      if (['encerrado', 'cancelado', 'revogado'].includes(status)) return false;
    }
    if (cidade.trim()) {
      const mun = String(item.municipio || '').toLowerCase();
      if (!mun.includes(cidade.toLowerCase())) return false;
    }
    return true;
  });

  const itensExibidos = mostrarFavoritos ? favoritos : resultadosFiltrados;

  const handleBuscar = useCallback(async () => {
    const hasAdvancedFilter = [
      cidade,
      dataInicio,
      dataFim,
      dataPrazoInicio,
      dataPrazoFim,
      numeroEdital,
      numeroConlicitacao,
      modalidadeId
    ].some(value => String(value || '').trim());

    if (!objeto.trim() && !uf && !hasAdvancedFilter && !apenasVigentes && !comEdital && !comMonitoramentoChat) {
      setErro('Informe ao menos um termo, número, período ou filtro de localização/status.');
      return;
    }

    setLoading(true);
    setErro('');
    setBuscaFeita(true);
    setMostrarFavoritos(false);

    try {
      const params = {
        objeto,
        uf,
        cidade,
        dataInicio,
        dataFim,
        dataPrazoInicio,
        dataPrazoFim,
        exactSearch: buscaExata,
        apenasVigentes,
        comEdital,
        comMonitoramentoChat,
        numeroEdital,
        numeroConlicitacao,
        modalidadeId,
        tamanhoPagina: 50
      };

      const promises = [];
      if (fontesAtivas.includes('pncp')) {
        promises.push(buscarPNCPPublicacao(params));
        if (incluirPropostas) promises.push(buscarPNCPProposta(params));
      }
      if (fontesAtivas.includes('comprasnet')) {
        promises.push(buscarComprasNet(params));
      }
      if (fontesAtivas.includes('dispensas')) {
        promises.push(buscarComprasGovDispensas(params));
      }
      if (fontesAtivas.includes('contratacoes14133')) {
        promises.push(buscarContratacoes14133(params));
      }
      fontesIntegradas
        .filter(fonte => fonte.ativa && fontesAtivas.includes(fonte.id))
        .forEach(fonte => promises.push(buscarFonteIntegrada(fonte, params)));

      if (promises.length === 0) {
        setErro('Selecione ao menos uma fonte ativa para buscar.');
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled(promises);
      const todos = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

      const dedup = deduplicar(todos);
      const ordenados = ordenar(dedup, ordem);

      // Estatísticas por fonte
      const porFonteMap = {};
      for (const item of dedup) {
        porFonteMap[item.fonte] = (porFonteMap[item.fonte] || 0) + 1;
      }

      setResultados(ordenados);
      setTotal(ordenados.length);
      setPorFonte(porFonteMap);

      if (ordenados.length === 0) {
        showToast('Sem resultados', 'Tente outros termos ou amplie o período de busca.');
      } else {
        showToast('Busca concluída', `${ordenados.length} edital(is) encontrado(s).`);
      }
    } catch (err) {
      setErro(err.message || 'Erro ao buscar licitações');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [
    objeto,
    uf,
    cidade,
    dataInicio,
    dataFim,
    dataPrazoInicio,
    dataPrazoFim,
    buscaExata,
    apenasVigentes,
    comEdital,
    comMonitoramentoChat,
    numeroEdital,
    numeroConlicitacao,
    modalidadeId,
    ordem,
    incluirPropostas,
    fontesAtivas,
    fontesIntegradas,
    showToast
  ]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleBuscar(); };

  const limparFiltros = () => {
    setObjeto(''); setUf(''); setCidade('');
    setApenasVigentes(false); setBuscaExata(false); setComEdital(false); setComMonitoramentoChat(false);
    setNumeroEdital(''); setNumeroConlicitacao(''); setModalidadeId('');
    setDataInicio(''); setDataFim(''); setDataPrazoInicio(''); setDataPrazoFim('');
    setOrdem('data_desc'); setFontesAtivas(fontesDisponiveis.filter(f => f.ativa !== false).map(f => f.id));
    setResultados([]); setBuscaFeita(false); setErro('');
  };

  const toggleFonte = (id) => {
    setFontesAtivas(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleFavorito = (item) => {
    setFavoritos(prev => {
      const existe = prev.some(f => f.id === item.id);
      const next = existe ? prev.filter(f => f.id !== item.id) : [...prev, item];
      localStorage.setItem('b2g_favoritos_v2', JSON.stringify(next));
      showToast(existe ? 'Removido dos favoritos' : 'Salvo nos favoritos', item.titulo?.slice(0, 60));
      return next;
    });
  };

  const isFavorito = (item) => favoritos.some(f => f.id === item.id);

  const isLeadSalvo = (item) => leadsSalvos.some(id => String(id) === String(item.id));

  const abrirSalvarLead = (item) => {
    setLeadModalItem(item);
    setLeadDecisao('ANALISE');
    setLeadObservacoes('');
  };

  const fecharSalvarLead = () => {
    if (salvandoLeadId) return;
    setLeadModalItem(null);
    setLeadObservacoes('');
    setLeadDecisao('ANALISE');
  };

  const salvarLead = async () => {
    if (!leadModalItem || salvandoLeadId) return;

    const item = leadModalItem;
    const leadName = (item.orgao || item.titulo || 'Órgão B2G').slice(0, 180);
    const decisionLabel = {
      ANALISE: 'Em análise',
      GO: 'GO',
      NO_GO: 'NO GO'
    }[leadDecisao] || 'Em análise';
    const notes = [
      `Edital: ${item.numero || item.id || '-'}`,
      `Fonte: ${item.fonte || '-'}`,
      `Modalidade: ${item.modalidade || '-'}`,
      `Objeto: ${item.titulo || '-'}`,
      `Decisão: ${decisionLabel}`,
      item.link ? `Link: ${item.link}` : '',
      leadObservacoes.trim() ? `Observações: ${leadObservacoes.trim()}` : ''
    ].filter(Boolean).join('\n');

    setSalvandoLeadId(item.id);
    try {
      // 1. Buscar ou criar empresa (órgão)
      const companyResponse = await fetch(buildApiUrl('/companies'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: leadName,
          segment: `B2G Governo | ${item.fonte || 'Busca de Editais'} | ${decisionLabel}`,
          website: item.link || '',
          address: notes,
          city: item.municipio || '',
          state: item.uf || '',
          status: leadDecisao === 'GO' ? 'PROSPECT' : 'LEAD',
          leadScore: leadDecisao === 'GO' ? 85 : leadDecisao === 'ANALISE' ? 65 : 35,
          clientType: 'B2G',
          autoDistribute: false
        })
      });
      const companyData = await companyResponse.json().catch(() => ({}));
      if (!companyResponse.ok) {
        throw new Error(companyData?.error || companyData?.message || 'Não foi possível salvar o lead B2G.');
      }

      // 2. Se decisão for GO, criar oportunidade e redirecionar
      if (leadDecisao === 'GO') {
        // Obter usuário logado
        const userRaw = localStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;

        // Montar dados B2G ricos para a oportunidade
        const b2gData = {
          numeroEdital: item.numero || '',
          orgaoEntidade: leadName,
          modalidade: item.modalidade || '',
          objetoResumido: item.titulo || '',
          objetoDetalhado: item.titulo || '',
          portal: item.fonte || 'PNCP',
          linkBriefing: item.link || '',
          ufCidade: [item.municipio, item.uf].filter(Boolean).join('/') || '',
          dataPublicacao: item.dataPublicacao || '',
          dataAbertura: item.dataAbertura || '',
          envioPropostas: item.dataEncerramento || item.dataAbertura || '',
          decisao: 'GO',
          probabilidadeGanho: 75,
          faseAtual: 'analise',
          grauRisco: 'Médio',
          observacoes: leadObservacoes.trim(),
          convertedAt: new Date().toISOString(),
          sourcePortal: item.fonte || 'PNCP',
          numeroControlePNCP: item.numeroControlePNCP || item.id || ''
        };

        const opportunityResponse = await fetch(buildApiUrl('/opportunities'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: `[B2G] ${item.numero ? item.numero + ' - ' : ''}${(item.titulo || leadName).slice(0, 200)}`,
            description: JSON.stringify(b2gData),
            value: item.valor || 0,
            probability: 75,
            stage: 'DIAGNOSIS',
            source: 'MANUAL',
            expectedCloseDate: item.dataAbertura || item.dataEncerramento || null,
            companyId: companyData.id,
            ownerId: user?.id || null
          })
        });

        const opportunityData = await opportunityResponse.json().catch(() => ({}));

        if (!opportunityResponse.ok) {
          // Mesmo se falhar a oportunidade, o lead foi salvo
          showToast('Lead salvo', 'Lead salvo, mas houve erro ao criar oportunidade. Acesse B2G > Oportunidades.');
        } else {
          setLeadsSalvos(prev => {
            const next = prev.includes(item.id) ? prev : [...prev, item.id];
            localStorage.setItem('b2g_busca_leads_salvos_v1', JSON.stringify(next));
            return next;
          });
          setLeadModalItem(null);
          setLeadObservacoes('');
          showToast('GO! Oportunidade criada', 'Redirecionando para Oportunidades B2G...');
          // Redirecionar para oportunidades B2G
          setTimeout(() => {
            navigate(`/b2g-oportunidades?clientType=B2G&opportunityId=${encodeURIComponent(opportunityData.id)}&mode=edit`);
          }, 1200);
          return;
        }
      }

      // Para ANALISE e NO_GO: apenas salvar como lead
      setLeadsSalvos(prev => {
        const next = prev.includes(item.id) ? prev : [...prev, item.id];
        localStorage.setItem('b2g_busca_leads_salvos_v1', JSON.stringify(next));
        return next;
      });
      setLeadModalItem(null);
      setLeadObservacoes('');
      showToast(
        leadDecisao === 'NO_GO' ? 'NO GO registrado' : 'Lead salvo',
        leadDecisao === 'NO_GO' ? 'Edital marcado como NO GO.' : 'O edital foi salvo em B2G > Leads.'
      );
    } catch (error) {
      showToast('Erro ao salvar lead', error.message || 'Tente novamente.', true);
    } finally {
      setSalvandoLeadId('');
    }
  };

  const persistirFontes = (next) => {
    setFontesIntegradas(next);
    localStorage.setItem(FONTES_STORAGE_KEY, JSON.stringify(next));
  };

  const abrirNovaFonte = () => {
    setFonteForm(novaFonteForm());
    setModalFonteAberto(true);
  };

  const atualizarPortalFonte = (portal) => {
    const template = FONTES_PAGAS.find(f => f.portal === portal) || FONTES_PAGAS[0];
    setFonteForm(prev => ({ ...prev, portal, nome: template.nome }));
  };

  const testarLoginFonte = async (fonte = fonteForm) => {
    if (!fonte.usuario.trim() || !fonte.senha.trim()) {
      showToast('Credenciais obrigatórias', 'Informe usuário e senha da fonte.', true);
      return false;
    }

    setTestandoFonte(true);
    try {
      const url = new URL(buildApiUrl('/bll-proxy'), window.location.origin);
      url.searchParams.set('portal', fonte.portal);
      url.searchParams.set('action', 'login');
      const headerPrefix = fonte.portal === 'conlicitacao' ? 'conlicitacao' : fonte.portal;
      const res = await fetch(url.toString(), {
        headers: {
          [`x-${headerPrefix}-email`]: fonte.usuario,
          [`x-${headerPrefix}-password`]: fonte.senha
        },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) throw new Error('Falha ao acessar o proxy da fonte');

      const data = await res.json().catch(() => null);
      if (!data?.autenticado) throw new Error(data?.message || 'O proxy não reconheceu as credenciais enviadas');

      showToast('Login configurado', `${fonte.nome} está pronta para busca autenticada.`);
      return true;
    } catch (err) {
      showToast('Login não concluído', err.message || 'Verifique as credenciais e tente novamente.', true);
      return false;
    } finally {
      setTestandoFonte(false);
    }
  };

  const salvarFonte = async () => {
    const template = FONTES_PAGAS.find(f => f.portal === fonteForm.portal) || FONTES_PAGAS[0];
    const nome = fonteForm.nome.trim() || template.nome;
    const loginOk = await testarLoginFonte({ ...fonteForm, nome });
    if (!loginOk) return;

    const existente = fontesIntegradas.find(f => f.portal === fonteForm.portal);
    const fonte = {
      id: existente?.id || `${fonteForm.portal}-${Date.now()}`,
      portal: fonteForm.portal,
      nome,
      descricao: template.descricao,
      metodo: template.metodo,
      sync: template.sync,
      icon: template.icon,
      usuario: fonteForm.usuario.trim(),
      senha: fonteForm.senha,
      ativa: fonteForm.ativa,
      loginStatus: 'connected',
      ultimoLogin: new Date().toISOString()
    };

    const next = existente
      ? fontesIntegradas.map(item => item.portal === fonte.portal ? fonte : item)
      : [...fontesIntegradas, fonte];
    persistirFontes(next);
    setFontesAtivas(prev => fonte.ativa && !prev.includes(fonte.id) ? [...prev, fonte.id] : prev);
    setModalFonteAberto(false);
  };

  const removerFonte = (id) => {
    const next = fontesIntegradas.filter(f => f.id !== id);
    persistirFontes(next);
    setFontesAtivas(prev => prev.filter(fonteId => fonteId !== id));
    showToast('Fonte removida', 'A integração foi removida do portal de busca.');
  };

  const salvarAlerta = () => {
    if (!alertaForm.palavras.trim()) return;
    const novo = { id: Date.now(), ...alertaForm, criadoEm: new Date().toLocaleDateString('pt-BR') };
    const next = [...alertas, novo];
    setAlertas(next);
    localStorage.setItem('b2g_alertas', JSON.stringify(next));
    setAlertaForm({ palavras: '', uf: '' });
    showToast('Alerta criado!', `Você será notificado sobre "${novo.palavras}".`);
  };

  const removerAlerta = (id) => {
    const next = alertas.filter(a => a.id !== id);
    setAlertas(next);
    localStorage.setItem('b2g_alertas', JSON.stringify(next));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      <Toast toasts={toasts} />
      <SalvarLeadModal
        item={leadModalItem}
        decisao={leadDecisao}
        observacoes={leadObservacoes}
        saving={Boolean(salvandoLeadId)}
        onDecisao={setLeadDecisao}
        onObservacoes={setLeadObservacoes}
        onClose={fecharSalvarLead}
        onSalvar={salvarLead}
      />

      {/* Tabs de navegação */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-1 px-4 py-2">
          {[
            { id: 'busca', label: 'Início', icon: <Search size={14} /> },
            { id: 'fontes', label: 'Fontes Integradas', icon: <Settings size={14} /> },
            { id: 'alertas', label: 'Alertas', icon: <Bell size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => { setMostrarFavoritos(!mostrarFavoritos); setActiveTab('busca'); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                mostrarFavoritos
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Heart size={14} fill={mostrarFavoritos ? 'currentColor' : 'none'} />
              Favoritos ({favoritos.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── ABA BUSCA ─────────────────────────────────────────────────────── */}
      {activeTab === 'busca' && (
        <div className="flex flex-col flex-1">
          {/* Header de busca */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 pb-6 pt-8 shadow-sm">
            <div className="px-4 max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Buscador Unificado</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Pesquise editais de todas as esferas públicas em um só lugar.</p>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={objeto}
                    onChange={e => setObjeto(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Aquisição de Notebooks, Obras, Merenda..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-base transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <button
                  onClick={handleBuscar}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50 text-base"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          {/* Corpo: filtros + resultados */}
          <div className="flex flex-col md:flex-row gap-6 p-4 max-w-7xl mx-auto w-full flex-1">

            {/* Sidebar de filtros */}
            <div className="w-full md:w-64 shrink-0">
              <div className="bg-white dark:bg-slate-800/60 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-20">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Filter size={16} className="text-blue-600" /> Filtros
                  </h3>
                  <button onClick={limparFiltros} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline">
                    Limpar
                  </button>
                </div>

                {/* Status */}
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Status do Edital</h4>
                  <label className="flex items-center gap-3 cursor-pointer group mb-2">
                    <input type="checkbox" checked={apenasVigentes} onChange={e => setApenasVigentes(e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">Apenas Vigentes (Abertos)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={incluirPropostas} onChange={e => setIncluirPropostas(e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">Incluir em Proposta</span>
                  </label>
                </div>

                {/* ConLicitações */}
                <div className="mb-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Filtros ConLicitações</h4>
                  <label className="flex items-center gap-3 cursor-pointer group mb-2">
                    <input type="checkbox" checked={buscaExata} onChange={e => setBuscaExata(e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">Busca exata por objeto</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group mb-2">
                    <input type="checkbox" checked={comEdital} onChange={e => setComEdital(e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">Com edital</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group mb-3">
                    <input type="checkbox" checked={comMonitoramentoChat} onChange={e => setComMonitoramentoChat(e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">Com monitoramento de chat</span>
                  </label>
                  <div className="mb-3">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Nº Edital</label>
                    <input type="text" value={numeroEdital} onChange={e => setNumeroEdital(e.target.value)} placeholder="Ex: 12/2026" className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Nº ConLicitação</label>
                    <input type="text" value={numeroConlicitacao} onChange={e => setNumeroConlicitacao(e.target.value)} placeholder="Código interno" className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Modalidade</label>
                    <select value={modalidadeId} onChange={e => setModalidadeId(e.target.value)} className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100">
                      {MODALIDADES_CONLICITACAO.map(modalidade => (
                        <option key={modalidade.id || 'all'} value={modalidade.id}>{modalidade.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Localização */}
                <div className="mb-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Localização</h4>
                  <div className="mb-3">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Estado</label>
                    <select value={uf} onChange={e => setUf(e.target.value)} className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100">
                      <option value="">Todo o Brasil</option>
                      {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla} - {e.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Cidade</label>
                    <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Digite a cidade..." className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                  </div>
                </div>

                {/* Período */}
                <div className="mb-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Período</h4>
                  <div className="mb-2">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">De</label>
                    <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Até</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" />
                  </div>
                </div>

                <div className="mb-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Data Prazo</h4>
                  <div className="mb-2">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">De</label>
                    <input type="date" value={dataPrazoInicio} onChange={e => setDataPrazoInicio(e.target.value)} className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Até</label>
                    <input type="date" value={dataPrazoFim} onChange={e => setDataPrazoFim(e.target.value)} className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100" />
                  </div>
                </div>

                {/* Fontes */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Fontes</h4>
                  {fontesDisponiveis.map(f => (
                    <label key={f.id} className="flex items-center gap-3 cursor-pointer group mb-2">
                      <input type="checkbox" checked={fontesAtivas.includes(f.id)} onChange={() => toggleFonte(f.id)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{f.icon} {f.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="flex-1 min-w-0">
              {/* Cabeçalho resultados */}
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-medium text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                    {mostrarFavoritos ? favoritos.length : itensExibidos.length}
                  </span>{' '}
                  {mostrarFavoritos ? 'favorito(s)' : 'resultado(s) encontrado(s)'}
                  {!mostrarFavoritos && Object.keys(porFonte).length > 0 && (
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                      ({Object.entries(porFonte).map(([f, n]) => `${f}: ${n}`).join(', ')})
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {buscaFeita && !mostrarFavoritos && (
                    <button onClick={handleBuscar} disabled={loading} className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                      <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
                    </button>
                  )}
                  <select value={ordem} onChange={e => setOrdem(e.target.value)} className="border-none bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer outline-none hover:text-blue-600 dark:hover:text-blue-400 transition">
                    {ORDENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Erro */}
              {erro && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm mb-4">
                  {erro}
                </div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-16 text-center">
                  <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="font-medium text-slate-700 dark:text-slate-200">Buscando em múltiplas fontes...</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{fontesAtivas.map(f => fontesDisponiveis.find(x => x.id === f)?.nome).filter(Boolean).join(', ')}</p>
                </div>
              ) : itensExibidos.length === 0 ? (
                <div className="bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-16 text-center">
                  <span className="text-5xl block mb-4">{mostrarFavoritos ? '❤️' : buscaFeita ? '🔍' : '🏛️'}</span>
                  <p className="font-medium text-lg text-slate-700 dark:text-slate-200">
                    {mostrarFavoritos ? 'Nenhum favorito salvo' : buscaFeita ? 'Nenhum edital encontrado' : 'Pronto para buscar'}
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    {mostrarFavoritos ? 'Salve editais clicando em "Salvar"' : buscaFeita ? 'Tente mudar os filtros ou usar outras palavras-chave.' : 'Digite um termo e clique em Buscar.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {itensExibidos.map(item => (
                    <CardEdital
                      key={item.id}
                      item={item}
                      favorito={isFavorito(item)}
                      leadSalvo={isLeadSalvo(item)}
                      salvandoLead={salvandoLeadId === item.id}
                      onToggleFavorito={toggleFavorito}
                      onAbrirSalvarLead={abrirSalvarLead}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA FONTES ────────────────────────────────────────────────────── */}
      {activeTab === 'fontes' && (
        <div className="p-6 max-w-5xl mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Fontes de Dados Integradas</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie e monitore o status de extração dos motores de busca.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fontesDisponiveis.map(fonte => (
              <div key={fonte.id} className="bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-lg text-2xl bg-blue-100 dark:bg-blue-900/30">{fonte.icon}</div>
                  <div className="flex items-center gap-2">
                    <span className={`${fonte.loginStatus === 'connected' || !fonte.portal ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'} text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border`}>
                      <span className={`w-2 h-2 rounded-full ${fonte.loginStatus === 'connected' || !fonte.portal ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {fonte.loginStatus === 'connected' ? 'Conectada' : !fonte.portal ? 'Operacional' : 'Configurar'}
                    </span>
                    {fonte.portal && (
                      <button onClick={() => removerFonte(fonte.id)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition p-1">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{fonte.nome}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{fonte.descricao}</p>
                <div className="text-sm border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Método:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{fonte.metodo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Sincronização:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{fonte.sync}</span>
                  </div>
                  {fonte.usuario && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Usuário:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{fonte.usuario}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Card adicionar */}
            <button
              type="button"
              onClick={abrirNovaFonte}
              className="bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition min-h-[230px]"
            >
              <Plus size={32} className="mb-2" />
              <span className="font-medium text-sm">Adicionar Nova Fonte</span>
              <span className="text-xs mt-1 text-center">BLL, BNC, ConLicitação</span>
            </button>
          </div>
        </div>
      )}

      {modalFonteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Adicionar Fonte</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure o acesso ao portal pago.</p>
              </div>
              <button onClick={() => setModalFonteAberto(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Portal</label>
                <select
                  value={fonteForm.portal}
                  onChange={e => atualizarPortalFonte(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  {FONTES_PAGAS.map(fonte => (
                    <option key={fonte.portal} value={fonte.portal}>{fonte.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome da fonte</label>
                <input
                  type="text"
                  value={fonteForm.nome}
                  onChange={e => setFonteForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Usuário</label>
                  <input
                    type="text"
                    value={fonteForm.usuario}
                    onChange={e => setFonteForm(prev => ({ ...prev, usuario: e.target.value }))}
                    placeholder="email ou login"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Senha</label>
                  <input
                    type="password"
                    value={fonteForm.senha}
                    onChange={e => setFonteForm(prev => ({ ...prev, senha: e.target.value }))}
                    placeholder="senha do portal"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={fonteForm.ativa} onChange={e => setFonteForm(prev => ({ ...prev, ativa: e.target.checked }))} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                <span className="text-sm text-slate-600 dark:text-slate-300">Usar esta fonte nas buscas</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => testarLoginFonte()}
                disabled={testandoFonte}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
              >
                {testandoFonte ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Testar login
              </button>
              <button
                type="button"
                onClick={salvarFonte}
                disabled={testandoFonte}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-60"
              >
                {testandoFonte ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Salvar fonte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA ALERTAS ───────────────────────────────────────────────────── */}
      {activeTab === 'alertas' && (
        <div className="p-6 max-w-3xl mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Alertas Inteligentes</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure alertas para ser notificado quando um edital do seu interesse for publicado.</p>
          </div>

          {/* Formulário */}
          <div className="bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Bell size={16} className="text-blue-500" /> Criar Novo Alerta
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Palavras-chave no Objeto</label>
                <input
                  type="text"
                  value={alertaForm.palavras}
                  onChange={e => setAlertaForm(prev => ({ ...prev, palavras: e.target.value }))}
                  placeholder="Ex: Computadores, Obras, Medicamentos"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Estado</label>
                <select value={alertaForm.uf} onChange={e => setAlertaForm(prev => ({ ...prev, uf: e.target.value }))} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100">
                  <option value="">Qualquer Estado</option>
                  {ESTADOS_BR.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={salvarAlerta} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm transition text-sm">
                Salvar Alerta
              </button>
            </div>
          </div>

          {/* Lista de alertas */}
          {alertas.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Alertas ativos ({alertas.length})</h3>
              {alertas.map(alerta => (
                <div key={alerta.id} className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{alerta.palavras}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{alerta.uf || 'Todo o Brasil'} · Criado em {alerta.criadoEm}</p>
                  </div>
                  <button onClick={() => removerAlerta(alerta.id)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition p-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Bell size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum alerta configurado ainda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
