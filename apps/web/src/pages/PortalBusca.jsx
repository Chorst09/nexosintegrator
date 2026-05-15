import { useState, useCallback } from 'react';
import {
  Search, Filter, X, ExternalLink, Loader2, Heart,
  MapPin, Calendar, Lock, Plus, Bell, Settings, RefreshCcw
} from 'lucide-react';

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
  { id: 'comprasnet', nome: 'ComprasNet', descricao: 'Portal de Compras do Governo Federal (SIASG)', metodo: 'API REST', sync: 'Tempo Real', icon: '🇧🇷' }
];

const ORDENS = [
  { value: 'data_desc', label: 'Mais recentes primeiro' },
  { value: 'data_asc', label: 'Mais antigos primeiro' },
  { value: 'valor_desc', label: 'Maior valor primeiro' },
  { value: 'valor_asc', label: 'Menor valor primeiro' },
  { value: 'abertura_asc', label: 'Abertura mais próxima' }
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
  };
  return map[fonte] || 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
};

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

function CardEdital({ item, favorito, onToggleFavorito }) {
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

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PortalBusca() {
  const [activeTab, setActiveTab] = useState('busca'); // 'busca' | 'fontes' | 'alertas'

  // Busca
  const [objeto, setObjeto] = useState('');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [apenasVigentes, setApenasVigentes] = useState(false);
  const [ordem, setOrdem] = useState('data_desc');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [fontesAtivas, setFontesAtivas] = useState(['pncp', 'comprasnet']);
  const [incluirPropostas, setIncluirPropostas] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Resultados
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [total, setTotal] = useState(0);
  const [porFonte, setPorFonte] = useState({});
  const [buscaFeita, setBuscaFeita] = useState(false);

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
    if (!objeto.trim() && !uf) {
      setErro('Informe ao menos um termo de busca ou selecione um estado.');
      return;
    }

    setLoading(true);
    setErro('');
    setBuscaFeita(true);
    setMostrarFavoritos(false);

    try {
      const params = { objeto, uf, dataInicio, dataFim, tamanhoPagina: 50 };

      // Busca diretamente do browser na API pública do PNCP (sem passar pelo backend)
      const promises = [buscarPNCPPublicacao(params)];
      if (incluirPropostas) promises.push(buscarPNCPProposta(params));

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
  }, [objeto, uf, dataInicio, dataFim, ordem, incluirPropostas, showToast]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleBuscar(); };

  const limparFiltros = () => {
    setObjeto(''); setUf(''); setCidade('');
    setApenasVigentes(false); setDataInicio(''); setDataFim('');
    setOrdem('data_desc'); setFontesAtivas(['pncp', 'comprasnet']);
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

                {/* Fontes */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Fontes</h4>
                  {FONTES_CONFIG.map(f => (
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
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{fontesAtivas.map(f => FONTES_CONFIG.find(x => x.id === f)?.nome).filter(Boolean).join(', ')}</p>
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
                    <CardEdital key={item.id} item={item} favorito={isFavorito(item)} onToggleFavorito={toggleFavorito} />
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
            {FONTES_CONFIG.map(fonte => (
              <div key={fonte.id} className="bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-lg text-2xl bg-blue-100 dark:bg-blue-900/30">{fonte.icon}</div>
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Operacional
                  </span>
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
                </div>
              </div>
            ))}
            {/* Card adicionar */}
            <div className="bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition">
              <Plus size={32} className="mb-2" />
              <span className="font-medium text-sm">Adicionar Nova Fonte</span>
              <span className="text-xs mt-1 text-center">Em breve: BLL, BNC, ConLicitação</span>
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
