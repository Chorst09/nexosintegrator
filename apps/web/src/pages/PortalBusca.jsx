import { useState, useCallback } from 'react';
import { Search, RefreshCcw, ExternalLink, Loader2, Heart, Filter, X, ChevronDown, ChevronUp, Building2, Calendar, DollarSign, MapPin, Tag } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
];

const FONTES = [
  { id: 'pncp', nome: 'PNCP', logo: '🏛️', descricao: 'Portal Nacional de Contratações Públicas' },
  { id: 'comprasnet', nome: 'ComprasNet', logo: '🇧🇷', descricao: 'Portal de Compras do Governo Federal' }
];

const ORDENS = [
  { value: 'data_desc', label: 'Mais recentes' },
  { value: 'data_asc', label: 'Mais antigos' },
  { value: 'valor_desc', label: 'Maior valor' },
  { value: 'valor_asc', label: 'Menor valor' },
  { value: 'abertura_asc', label: 'Abertura mais próxima' }
];

const formatCurrency = (value) => {
  if (!value) return null;
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch { return value; }
};

const getFonteColor = (fonte) => {
  const colors = {
    'PNCP': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'ComprasNet': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'Licitações-e (BB)': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
  };
  return colors[fonte] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
};

// ─── Componente Card de Edital ────────────────────────────────────────────────

function CardEdital({ item, favorito, onToggleFavorito }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="crm-card rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getFonteColor(item.fonte)}`}>
              {item.fonteLogo} {item.fonte}
            </span>
            {item.modalidade && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {item.modalidade}
              </span>
            )}
            {item.status && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {item.status}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {item.titulo}
          </h3>
        </div>
        <button
          onClick={() => onToggleFavorito(item)}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${favorito ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
          title={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart size={16} fill={favorito ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-slate-300">
        {item.orgao && (
          <div className="flex items-center gap-1 col-span-2">
            <Building2 size={12} className="shrink-0" />
            <span className="truncate">{item.orgao}</span>
          </div>
        )}
        {(item.uf || item.municipio) && (
          <div className="flex items-center gap-1">
            <MapPin size={12} className="shrink-0" />
            <span>{[item.municipio, item.uf].filter(Boolean).join(' - ')}</span>
          </div>
        )}
        {item.valor && (
          <div className="flex items-center gap-1">
            <DollarSign size={12} className="shrink-0" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(item.valor)}</span>
          </div>
        )}
        {item.dataAbertura && (
          <div className="flex items-center gap-1">
            <Calendar size={12} className="shrink-0" />
            <span>Abertura: {formatDate(item.dataAbertura)}</span>
          </div>
        )}
        {item.dataPublicacao && (
          <div className="flex items-center gap-1">
            <Calendar size={12} className="shrink-0" />
            <span>Publicado: {formatDate(item.dataPublicacao)}</span>
          </div>
        )}
        {item.numero && (
          <div className="flex items-center gap-1">
            <Tag size={12} className="shrink-0" />
            <span>Nº {item.numero}{item.ano ? `/${item.ano}` : ''}</span>
          </div>
        )}
      </div>

      {expandido && item.informacaoComplementar && (
        <p className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
          {item.informacaoComplementar}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              <ExternalLink size={12} />
              Ver edital
            </a>
          )}
          {item.informacaoComplementar && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400"
            >
              {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expandido ? 'Menos' : 'Mais detalhes'}
            </button>
          )}
        </div>
        {item.numeroControlePNCP && (
          <span className="text-xs text-gray-400 dark:text-slate-500 font-mono truncate max-w-[180px]">
            {item.numeroControlePNCP}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PortalBusca() {
  const [filtros, setFiltros] = useState({
    objeto: '',
    uf: '',
    dataInicio: '',
    dataFim: '',
    fontes: ['pncp', 'comprasnet'],
    ordem: 'data_desc',
    incluirPropostas: true
  });

  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [total, setTotal] = useState(0);
  const [porFonte, setPorFonte] = useState({});
  const [errosFontes, setErrosFontes] = useState([]);
  const [favoritos, setFavoritos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('b2g_favoritos') || '[]'); } catch { return []; }
  });
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [buscaFeita, setBuscaFeita] = useState(false);

  const handleBuscar = useCallback(async () => {
    if (!filtros.objeto.trim() && !filtros.uf) {
      setErro('Informe ao menos um termo de busca ou selecione um estado.');
      return;
    }

    setLoading(true);
    setErro('');
    setBuscaFeita(true);

    try {
      const params = new URLSearchParams();
      if (filtros.objeto) params.set('objeto', filtros.objeto.trim());
      if (filtros.uf) params.set('uf', filtros.uf);
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
      params.set('fontes', filtros.fontes.join(','));
      params.set('ordem', filtros.ordem);
      params.set('incluirPropostas', filtros.incluirPropostas ? 'true' : 'false');
      params.set('tamanhoPagina', '50');

      const res = await fetch(`${API_BASE_URL}/b2g-search/search?${params}`, {
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error(`Erro ${res.status} ao buscar licitações`);

      const data = await res.json();
      setResultados(data.data || []);
      setTotal(data.total || 0);
      setPorFonte(data.fontes || {});
      setErrosFontes(data.erros || []);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar licitações');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const toggleFonte = (fonteId) => {
    setFiltros(prev => ({
      ...prev,
      fontes: prev.fontes.includes(fonteId)
        ? prev.fontes.filter(f => f !== fonteId)
        : [...prev.fontes, fonteId]
    }));
  };

  const toggleFavorito = (item) => {
    setFavoritos(prev => {
      const existe = prev.some(f => f.id === item.id);
      const next = existe ? prev.filter(f => f.id !== item.id) : [...prev, item];
      localStorage.setItem('b2g_favoritos', JSON.stringify(next));
      return next;
    });
  };

  const isFavorito = (item) => favoritos.some(f => f.id === item.id);

  const itensExibidos = mostrarFavoritos ? favoritos : resultados;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portal de Busca de Oportunidades</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            Busca integrada em múltiplas fontes públicas de licitações e editais
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarFavoritos(!mostrarFavoritos)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mostrarFavoritos ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            <Heart size={16} fill={mostrarFavoritos ? 'currentColor' : 'none'} />
            Favoritos ({favoritos.length})
          </button>
        </div>
      </div>

      {/* Fontes disponíveis */}
      <div className="flex flex-wrap gap-2">
        {FONTES.map(fonte => (
          <button
            key={fonte.id}
            onClick={() => toggleFonte(fonte.id)}
            title={fonte.descricao}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filtros.fontes.includes(fonte.id)
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                : 'border-gray-300 bg-white text-gray-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'
            }`}
          >
            <span>{fonte.logo}</span>
            <span>{fonte.nome}</span>
            {filtros.fontes.includes(fonte.id) && <X size={10} />}
          </button>
        ))}
      </div>

      {/* Formulário de busca */}
      <div className="crm-card rounded-2xl p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filtros.objeto}
              onChange={e => setFiltros(prev => ({ ...prev, objeto: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              placeholder="Ex: equipamentos de informática, serviços de limpeza, obras..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filtros.uf}
            onChange={e => setFiltros(prev => ({ ...prev, uf: e.target.value }))}
            className="px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os estados</option>
            {ESTADOS_BR.map(e => (
              <option key={e.sigla} value={e.sigla}>{e.sigla} - {e.nome}</option>
            ))}
          </select>
          <button
            onClick={handleBuscar}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Filtros avançados */}
        <div>
          <button
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          >
            <Filter size={14} />
            Filtros avançados
            {filtrosAbertos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {filtrosAbertos && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Data início</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={e => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Data fim</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={e => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Ordenar por</label>
                <select
                  value={filtros.ordem}
                  onChange={e => setFiltros(prev => ({ ...prev, ordem: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                >
                  {ORDENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtros.incluirPropostas}
                    onChange={e => setFiltros(prev => ({ ...prev, incluirPropostas: e.target.checked }))}
                    className="rounded"
                  />
                  Incluir licitações em fase de proposta
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          {erro}
        </div>
      )}

      {/* Avisos de fontes com erro */}
      {errosFontes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-lg text-xs">
          <strong>Algumas fontes retornaram erros:</strong> {errosFontes.join(' | ')}
        </div>
      )}

      {/* Resultados */}
      {(buscaFeita || mostrarFavoritos) && (
        <div className="space-y-4">
          {/* Cabeçalho dos resultados */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {mostrarFavoritos ? `Favoritos (${favoritos.length})` : `${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
              </h2>
              {!mostrarFavoritos && Object.keys(porFonte).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(porFonte).map(([fonte, count]) => (
                    <span key={fonte} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getFonteColor(fonte)}`}>
                      {fonte}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!mostrarFavoritos && buscaFeita && (
              <button
                onClick={handleBuscar}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                Atualizar
              </button>
            )}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <p className="text-gray-600 dark:text-slate-300 text-sm">Buscando em múltiplas fontes...</p>
              <div className="flex gap-3 text-xs text-gray-500 dark:text-slate-400">
                {filtros.fontes.map(f => {
                  const fonte = FONTES.find(x => x.id === f);
                  return fonte ? <span key={f}>{fonte.logo} {fonte.nome}</span> : null;
                })}
              </div>
            </div>
          ) : itensExibidos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">{mostrarFavoritos ? '❤️' : '🔍'}</div>
              <p className="text-gray-600 dark:text-slate-300 font-medium">
                {mostrarFavoritos ? 'Nenhum favorito salvo' : 'Nenhum resultado encontrado'}
              </p>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                {mostrarFavoritos ? 'Salve editais clicando no ícone de coração' : 'Tente outros termos ou ampliar o período de busca'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {itensExibidos.map(item => (
                <CardEdital
                  key={item.id}
                  item={item}
                  favorito={isFavorito(item)}
                  onToggleFavorito={toggleFavorito}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado inicial */}
      {!buscaFeita && !mostrarFavoritos && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Busque oportunidades públicas
          </h3>
          <p className="text-gray-600 dark:text-slate-300 text-sm max-w-md mx-auto">
            Digite um termo de busca e selecione as fontes desejadas. O sistema buscará em paralelo no PNCP e ComprasNet.
          </p>
          <div className="flex justify-center gap-4 mt-6 text-sm text-gray-500 dark:text-slate-400">
            {FONTES.map(f => (
              <div key={f.id} className="flex items-center gap-1">
                <span>{f.logo}</span>
                <span>{f.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
