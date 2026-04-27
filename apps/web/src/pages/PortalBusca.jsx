import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCcw,
  Bookmark,
  Bell,
  Heart,
  ExternalLink,
  Loader2,
  Trash2,
  CheckCircle2,
  Info
} from 'lucide-react';

// ─── Constantes ──────────────────────────────────────────────────────────────

const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

const REGIOES_BR = [
  { nome: 'Norte', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'] },
  { nome: 'Nordeste', estados: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
  { nome: 'Centro-Oeste', estados: ['DF', 'GO', 'MT', 'MS'] },
  { nome: 'Sudeste', estados: ['ES', 'MG', 'RJ', 'SP'] },
  { nome: 'Sul', estados: ['PR', 'RS', 'SC'] }
];

const MODALIDADES = [
  { id: 6, nome: 'Pregão Eletrônico' },
  { id: 1, nome: 'Concorrência' },
  { id: 8, nome: 'Dispensa' },
  { id: 9, nome: 'Inexigibilidade' },
  { id: 3, nome: 'Tomada de Preços' },
  { id: 2, nome: 'Convite' },
  { id: 5, nome: 'Leilão' },
  { id: 10, nome: 'RDC' },
  { id: 13, nome: 'Diálogo Competitivo' }
];

// ─── API PNCP ─────────────────────────────────────────────────────────────────

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';
const FALLBACK_MODALIDADE = 6;

const MODALIDADE_EQUIVALENCIA = {
  6: [6], // Pregão Eletrônico
  1: [4, 5], // Concorrência (eletrônica/presencial)
  8: [8], // Dispensa
  9: [9], // Inexigibilidade
  3: [4, 5], // Tomada de Preços (equivalência prática)
  2: [12], // Convite (aproximação por Credenciamento)
  5: [1, 13], // Leilão (eletrônico/presencial)
  10: [], // RDC sem código direto na API atual
  13: [2] // Diálogo Competitivo
};

const toPncpDate = (value) => String(value || '').replaceAll('-', '').trim();

const diasAtras = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

const expandirModalidades = (ids = []) => {
  const values = Array.isArray(ids) ? ids : [];
  const expanded = values.flatMap((id) => MODALIDADE_EQUIVALENCIA[id] || []);
  const unique = [...new Set(expanded.filter((v) => Number.isInteger(v) && v > 0))];
  return unique.length > 0 ? unique : [FALLBACK_MODALIDADE];
};

const dedupeRows = (rows = []) => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const key =
      row?.numeroControlePNCP ||
      row?.id ||
      `${row?.anoCompra || ''}-${row?.numeroCompra || ''}-${row?.orgaoEntidade?.cnpj || ''}-${index}`;
    if (!map.has(key)) map.set(key, row);
  });
  return [...map.values()];
};

async function buscarPNCP(params) {
  const endpoint = params.endpoint === 'proposta' ? 'proposta' : 'publicacao';
  const pagina = Number(params.pagina || 1);
  const tamanhoPagina = Number(params.tamanhoPagina || 20);

  const modalidadeCodes = expandirModalidades(params.modalidades);
  const selectedUfs = Array.isArray(params.ufs) ? params.ufs.filter(Boolean) : [];
  const ufTargets = selectedUfs.length > 0 && selectedUfs.length <= 5 ? selectedUfs : [null];

  const baseDateFinal = toPncpDate(params.dataFinal || hoje());
  const baseDateInicial = toPncpDate(params.dataInicial || diasAtras(30));

  const allRequests = [];
  modalidadeCodes.forEach((codigoModalidadeContratacao) => {
    ufTargets.forEach((uf) => {
      allRequests.push({ codigoModalidadeContratacao, uf });
    });
  });

  const requests = allRequests.slice(0, 20);
  const aggregated = [];

  for (const req of requests) {
    try {
      // Usar proxy backend para evitar bloqueio CORS
      const proxyUrl = new URL('/api/pncp-proxy', window.location.origin);
      proxyUrl.searchParams.set('endpoint', endpoint);
      proxyUrl.searchParams.set('dataFinal', baseDateFinal);
      proxyUrl.searchParams.set('codigoModalidadeContratacao', String(req.codigoModalidadeContratacao));
      proxyUrl.searchParams.set('pagina', String(pagina));
      proxyUrl.searchParams.set('tamanhoPagina', String(Math.min(500, Math.max(10, tamanhoPagina))));
      if (endpoint === 'publicacao') proxyUrl.searchParams.set('dataInicial', baseDateInicial);
      if (req.uf) proxyUrl.searchParams.set('uf', req.uf);

      const res = await fetch(proxyUrl.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      aggregated.push(...rows);
    } catch {
      // Ignora falha pontual
    }
  }

  return dedupeRows(aggregated);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarMoeda(valor) {
  if (valor == null || isNaN(valor)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(data) {
  if (!data) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(data));
  } catch {
    return data;
  }
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function ontem() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PortalBusca() {
  const [filtros, setFiltros] = useState({
    objeto: '',
    numeroEdital: '',
    filtrarPor: 'estado',
    estados: [],
    cidades: [],
    modalidades: [],
    dataInclusaoInicio: '',
    dataInclusaoFim: '',
    dataPrazoInicio: '',
    dataPrazoFim: '',
    vigentes: false,
    comEdital: false,
    somenteFavoritas: false,
    buscaExata: false
  });

  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resultados');
  const [filtrosSalvos, setFiltrosSalvos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pncp_filtros_salvos') || '[]'); } catch { return []; }
  });
  const [alertas, setAlertas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pncp_alertas') || '[]'); } catch { return []; }
  });
  const [favoritos, setFavoritos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pncp_favoritos') || '[]'); } catch { return []; }
  });
  const [totalResultados, setTotalResultados] = useState(0);
  const [erroBusca, setErroBusca] = useState('');
  const [pagina] = useState(1);
  const [bllCredentials, setBllCredentials] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('bll_credentials') || '{"email":"","password":""}'); 
    } catch { 
      return { email: '', password: '' }; 
    }
  });
  const [bllStatus, setBllStatus] = useState('não configurado');

  // ── Funções ────────────────────────────────────────────────────────────────

  const handleBuscar = async () => {
    setLoading(true);
    setActiveTab('resultados');
    setErroBusca('');
    try {
      const params = {
        pagina,
        tamanhoPagina: 20,
        endpoint: filtros.vigentes ? 'proposta' : 'publicacao',
        dataInicial: filtros.dataInclusaoInicio || diasAtras(30),
        dataFinal: filtros.dataInclusaoFim || hoje(),
        ufs: filtros.estados,
        modalidades: filtros.modalidades
      };

      // Buscar em paralelo no PNCP, BLL, BNC e ConLicitacao
      
      // Função auxiliar para buscar em um portal
      const buscarPortal = (portal, uf = '') => {
        // Configurar headers específicos para cada portal
        const headers = {};
        
        if (portal === 'bll' && bllCredentials.email && bllCredentials.password) {
          headers['X-BLL-Email'] = bllCredentials.email;
          headers['X-BLL-Password'] = bllCredentials.password;
        }
        // TODO: Adicionar suporte para BNC e ConLicitacao quando implementado na interface
        
        const url = `/api/bll-proxy?portal=${portal}&objeto=${encodeURIComponent(filtros.objeto || '')}&uf=${uf}&pagina=${pagina}&tamanhoPagina=20`;
        
        console.log(`🔍 Buscando em ${portal.toUpperCase()}...`, { hasCredentials: Object.keys(headers).length > 0 });
        
        return fetch(url, { headers })
          .then(r => {
            console.log(`📡 ${portal.toUpperCase()} response status:`, r.status);
            return r.ok ? r.json() : { data: [] };
          })
          .then(d => {
            console.log(`✅ ${portal.toUpperCase()} retornou:`, d.total || d.data?.length || 0, 'resultados');
            return (d.data || []).map(item => ({ ...item, _fonte: portal.toUpperCase() }));
          })
          .catch(err => {
            console.warn(`❌ Erro ao buscar em ${portal}:`, err.message);
            return [];
          });
      };

      // Criar promises para todos os portais
      const portalPromises = [];
      const portais = ['bll', 'bnc', 'conlicitacao'];
      
      if (filtros.estados.length > 0) {
        // Buscar em cada portal para cada UF selecionada
        filtros.estados.forEach(uf => {
          portais.forEach(portal => {
            portalPromises.push(buscarPortal(portal, uf));
          });
        });
      } else {
        // Buscar em cada portal sem filtro de UF
        portais.forEach(portal => {
          portalPromises.push(buscarPortal(portal));
        });
      }

      const [dataPNCP, ...dataPortaisResults] = await Promise.allSettled([
        buscarPNCP(params),
        ...portalPromises
      ]);

      const dataPortais = dataPortaisResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

      console.log('🔍 Resultados PNCP:', dataPNCP.status === 'fulfilled' ? dataPNCP.value.length : 0);
      console.log('🔍 Resultados Portais (BLL+BNC+ConLicitacao):', dataPortais.length);

      let data = [
        ...(dataPNCP.status === 'fulfilled' ? dataPNCP.value : []),
        ...dataPortais
      ];

      // Deduplica resultados combinados
      data = dedupeRows(data);

      console.log('🔍 Total após deduplicação:', data.length);

      // Filtro local por objeto
      if (filtros.objeto) {
        const termo = filtros.buscaExata
          ? filtros.objeto.toLowerCase()
          : filtros.objeto.toLowerCase();
        data = data.filter((r) => {
          const obj = (r.objetoCompra || r.objeto || '').toLowerCase();
          return filtros.buscaExata ? obj === termo : obj.includes(termo);
        });
      }

      // Filtro local por número de edital
      if (filtros.numeroEdital) {
        data = data.filter((r) =>
          (r.numeroCompra || r.numeroEdital || '').toString().includes(filtros.numeroEdital)
        );
      }

      // Filtro local por UF (quando múltiplas UFs selecionadas)
      if (filtros.estados.length > 0) {
        data = data.filter((r) => filtros.estados.includes(r.unidadeOrgao?.ufSigla || r.uf || ''));
      }

      // Filtro local por Cidade
      if (filtros.cidades.length > 0 && filtros.cidades[0]) {
        const cidade = filtros.cidades[0].toLowerCase();
        data = data.filter((r) => (r.unidadeOrgao?.municipioNome || r.cidade || '').toLowerCase().includes(cidade));
      }

      // Filtro local por modalidade (garante consistência dos checkboxes)
      if (filtros.modalidades.length > 0) {
        const allowed = expandirModalidades(filtros.modalidades);
        data = data.filter((r) => allowed.includes(Number(r.modalidadeId)));
      }

      // Filtro vigentes
      if (filtros.vigentes) {
        const now = new Date();
        data = data.filter((r) => {
          const prazo = r.dataEncerramentoProposta || r.dataAbertura;
          return prazo ? new Date(prazo) > now : true;
        });
      }

      // Filtro com edital/instrumento convocatório
      if (filtros.comEdital) {
        data = data.filter((r) => {
          const tipo = String(r.tipoInstrumentoConvocatorioNome || '').toLowerCase();
          return (
            tipo.includes('edital') ||
            Boolean(r.linkSistemaOrigem) ||
            Boolean(r.linkEdital) ||
            Boolean(r.linkProcessoEletronico)
          );
        });
      }

      // Filtro por Data de Prazo (encerramento de proposta)
      if (filtros.dataPrazoInicio || filtros.dataPrazoFim) {
        const inicio = filtros.dataPrazoInicio ? new Date(`${filtros.dataPrazoInicio}T00:00:00`) : null;
        const fim = filtros.dataPrazoFim ? new Date(`${filtros.dataPrazoFim}T23:59:59`) : null;
        data = data.filter((r) => {
          const prazoRaw = r.dataEncerramentoProposta || r.dataAbertura || r.dataAberturaProposta;
          if (!prazoRaw) return false;
          const prazo = new Date(prazoRaw);
          if (Number.isNaN(prazo.getTime())) return false;
          if (inicio && prazo < inicio) return false;
          if (fim && prazo > fim) return false;
          return true;
        });
      }

      // Somente favoritas
      if (filtros.somenteFavoritas) {
        data = data.filter((r) =>
          favoritos.includes(r.id || r.numeroControlePNCP || r.numeroCompra)
        );
      }

      setResultados(data);
      setTotalResultados(data.length);
      if (data.length === 0) {
        setErroBusca('Nenhum resultado retornado com os filtros atuais na API do PNCP.');
      }
    } catch (_error) {
      setResultados([]);
      setTotalResultados(0);
      setErroBusca('Falha ao consultar o PNCP. Revise os filtros e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarFiltro = () => {
    const nome = window.prompt('Nome para este filtro:');
    if (!nome) return;
    const novo = { id: Date.now(), nome, filtros, criadoEm: new Date().toISOString() };
    const lista = [...filtrosSalvos, novo];
    setFiltrosSalvos(lista);
    localStorage.setItem('pncp_filtros_salvos', JSON.stringify(lista));
  };

  const handleExcluirFiltro = (id) => {
    const lista = filtrosSalvos.filter((f) => f.id !== id);
    setFiltrosSalvos(lista);
    localStorage.setItem('pncp_filtros_salvos', JSON.stringify(lista));
  };

  const handleAplicarFiltro = (f) => {
    setFiltros(f.filtros);
    setActiveTab('resultados');
  };

  const handleFavoritar = (id) => {
    const lista = favoritos.includes(id)
      ? favoritos.filter((f) => f !== id)
      : [...favoritos, id];
    setFavoritos(lista);
    localStorage.setItem('pncp_favoritos', JSON.stringify(lista));
  };

  const handleCriarAlerta = () => {
    const descricao = [
      filtros.objeto && `Objeto: "${filtros.objeto}"`,
      filtros.estados.length && `UF: ${filtros.estados.join(', ')}`,
      filtros.modalidades.length && `Modalidades: ${filtros.modalidades.join(', ')}`
    ].filter(Boolean).join(' | ') || 'Todos os filtros atuais';

    const novo = { id: Date.now(), descricao, filtros, criadoEm: new Date().toISOString() };
    const lista = [...alertas, novo];
    setAlertas(lista);
    localStorage.setItem('pncp_alertas', JSON.stringify(lista));
    alert('Alerta criado com sucesso!');
  };

  const handleExcluirAlerta = (id) => {
    const lista = alertas.filter((a) => a.id !== id);
    setAlertas(lista);
    localStorage.setItem('pncp_alertas', JSON.stringify(lista));
  };

  const limparFiltros = () => {
    setFiltros({
      objeto: '',
      numeroEdital: '',
      filtrarPor: 'estado',
      estados: [],
      cidades: [],
      modalidades: [],
      dataInclusaoInicio: '',
      dataInclusaoFim: '',
      dataPrazoInicio: '',
      dataPrazoFim: '',
      vigentes: false,
      comEdital: false,
      somenteFavoritas: false,
      buscaExata: false
    });
    setResultados([]);
    setTotalResultados(0);
  };

  const handleSalvarCredenciaisBLL = () => {
    localStorage.setItem('bll_credentials', JSON.stringify(bllCredentials));
    setBllStatus('salvo');
    alert('Credenciais do BLL salvas com sucesso!');
    setTimeout(() => setBllStatus('configurado'), 2000);
  };

  const handleTestarCredenciaisBLL = async () => {
    setBllStatus('testando...');
    try {
      const headers = {};
      if (bllCredentials.email && bllCredentials.password) {
        headers['X-BLL-Email'] = bllCredentials.email;
        headers['X-BLL-Password'] = bllCredentials.password;
      }

      const res = await fetch('/api/bll-proxy?objeto=teste&pagina=1&tamanhoPagina=1', { headers });
      const data = await res.json();
      
      if (data.autenticado) {
        setBllStatus('✓ autenticado');
        alert('Credenciais válidas! Login realizado com sucesso.');
      } else {
        setBllStatus('✗ falha na autenticação');
        alert('Não foi possível autenticar. Verifique suas credenciais.');
      }
    } catch (err) {
      setBllStatus('✗ erro');
      alert('Erro ao testar credenciais: ' + err.message);
    }
  };

  const handleLimparCredenciaisBLL = () => {
    setBllCredentials({ email: '', password: '' });
    localStorage.removeItem('bll_credentials');
    setBllStatus('não configurado');
  };

  const toggleEstado = (sigla) => {
    setFiltros((prev) => ({
      ...prev,
      estados: prev.estados.includes(sigla)
        ? prev.estados.filter((e) => e !== sigla)
        : [...prev.estados, sigla]
    }));
  };

  const toggleModalidade = (id) => {
    setFiltros((prev) => ({
      ...prev,
      modalidades: prev.modalidades.includes(id)
        ? prev.modalidades.filter((m) => m !== id)
        : [...prev.modalidades, id]
    }));
  };

  const selecionarTodosEstados = () => {
    setFiltros((prev) => ({ ...prev, estados: ESTADOS_BR.map((e) => e.sigla) }));
  };

  // Relevância média: % dos resultados cujo objeto contém o termo buscado
  const relevanciaMedia = resultados.length === 0 ? 0 : filtros.objeto
    ? Math.round(
        (resultados.filter((r) =>
          (r.objetoCompra || r.objeto || '').toLowerCase().includes(filtros.objeto.toLowerCase())
        ).length / resultados.length) * 100
      )
    : 100;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--crm-bg, #0f172a)', color: 'var(--crm-ink, #f1f5f9)' }}>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portal de Busca de Oportunidades Públicas</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
            Busca em tempo real no PNCP — Portal Nacional de Contratações Públicas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleBuscar}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
          >
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </button>
          <button
            onClick={handleBuscar}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Search className="h-4 w-4" /> Buscar
          </button>
          <button
            onClick={handleSalvarFiltro}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
          >
            <Bookmark className="h-4 w-4" /> Salvar Filtro
          </button>
          <button
            onClick={handleCriarAlerta}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
          >
            <Bell className="h-4 w-4" /> Criar Alerta
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Oportunidades exibidas', value: resultados.length },
          { label: 'Favoritas', value: favoritos.length },
          { label: 'Relevância média', value: `${relevanciaMedia}%` }
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border p-4"
            style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
          >
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--crm-muted, #94a3b8)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Busca Inteligente */}
      <div
        className="mb-6 rounded-xl border p-5"
        style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
      >
        <h2 className="mb-4 text-base font-semibold text-white">Busca Inteligente</h2>

        {/* Row 1: Objeto + Nº Edital */}
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Objeto</label>
            <input
              type="text"
              placeholder="Pesquise por objeto"
              value={filtros.objeto}
              onChange={(e) => setFiltros((p) => ({ ...p, objeto: e.target.value }))}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              style={{ borderColor: 'var(--crm-border, #334155)' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Nº Edital</label>
            <input
              type="text"
              placeholder="Pesquise por Nº Edital"
              value={filtros.numeroEdital}
              onChange={(e) => setFiltros((p) => ({ ...p, numeroEdital: e.target.value }))}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              style={{ borderColor: 'var(--crm-border, #334155)' }}
            />
          </div>
        </div>

        {/* Busca Exata */}
        <div className="mb-3 flex items-center gap-2">
          <input
            id="buscaExata"
            type="checkbox"
            checked={filtros.buscaExata}
            onChange={(e) => setFiltros((p) => ({ ...p, buscaExata: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-600 bg-slate-700 accent-blue-500"
          />
          <label htmlFor="buscaExata" className="text-sm" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Busca Exata</label>
        </div>

        {/* Filtrar por Estado | Região */}
        <div className="mb-3 flex items-center gap-4">
          <span className="text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Filtrar por:</span>
          {['estado', 'regiao'].map((op) => (
            <label key={op} className="flex cursor-pointer items-center gap-1.5 text-sm text-white">
              <input
                type="radio"
                name="filtrarPor"
                value={op}
                checked={filtros.filtrarPor === op}
                onChange={() => setFiltros((p) => ({ ...p, filtrarPor: op, estados: [] }))}
                className="accent-blue-500"
              />
              {op === 'estado' ? 'Estado' : 'Região'}
            </label>
          ))}
        </div>

        {/* Estado / Região + Cidade + Modalidades */}
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Estados ou Regiões */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
                {filtros.filtrarPor === 'estado' ? 'Estado(s)' : 'Região'}
              </label>
              <button
                type="button"
                onClick={selecionarTodosEstados}
                className="text-xs text-blue-400 hover:underline"
              >
                Todos os Estados
              </button>
            </div>
            {filtros.filtrarPor === 'estado' ? (
              <div
                className="max-h-32 overflow-y-auto rounded-lg border p-2"
                style={{ borderColor: 'var(--crm-border, #334155)', background: 'var(--crm-bg, #0f172a)' }}
              >
                {ESTADOS_BR.map((e) => (
                  <label key={e.sigla} className="flex cursor-pointer items-center gap-1.5 py-0.5 text-xs text-white">
                    <input
                      type="checkbox"
                      checked={filtros.estados.includes(e.sigla)}
                      onChange={() => toggleEstado(e.sigla)}
                      className="accent-blue-500"
                    />
                    {e.sigla} — {e.nome}
                  </label>
                ))}
              </div>
            ) : (
              <div
                className="rounded-lg border p-2"
                style={{ borderColor: 'var(--crm-border, #334155)', background: 'var(--crm-bg, #0f172a)' }}
              >
                {REGIOES_BR.map((r) => (
                  <label key={r.nome} className="flex cursor-pointer items-center gap-1.5 py-0.5 text-xs text-white">
                    <input
                      type="checkbox"
                      checked={r.estados.every((s) => filtros.estados.includes(s))}
                      onChange={() => {
                        const allSelected = r.estados.every((s) => filtros.estados.includes(s));
                        setFiltros((p) => ({
                          ...p,
                          estados: allSelected
                            ? p.estados.filter((s) => !r.estados.includes(s))
                            : [...new Set([...p.estados, ...r.estados])]
                        }));
                      }}
                      className="accent-blue-500"
                    />
                    {r.nome}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Cidade */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Cidade</label>
            <input
              type="text"
              placeholder="Filtrar por cidade"
              value={filtros.cidades[0] || ''}
              onChange={(e) => setFiltros((p) => ({ ...p, cidades: e.target.value ? [e.target.value] : [] }))}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              style={{ borderColor: 'var(--crm-border, #334155)' }}
            />
          </div>

          {/* Modalidades */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Modalidades</label>
            <div
              className="max-h-32 overflow-y-auto rounded-lg border p-2"
              style={{ borderColor: 'var(--crm-border, #334155)', background: 'var(--crm-bg, #0f172a)' }}
            >
              {MODALIDADES.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-1.5 py-0.5 text-xs text-white">
                  <input
                    type="checkbox"
                    checked={filtros.modalidades.includes(m.id)}
                    onChange={() => toggleModalidade(m.id)}
                    className="accent-blue-500"
                  />
                  {m.nome}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Datas */}
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Data Inclusão */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Data Inclusão</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filtros.dataInclusaoInicio}
                onChange={(e) => setFiltros((p) => ({ ...p, dataInclusaoInicio: e.target.value }))}
                className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--crm-border, #334155)' }}
              />
              <span className="text-xs text-slate-500">—</span>
              <input
                type="date"
                value={filtros.dataInclusaoFim}
                onChange={(e) => setFiltros((p) => ({ ...p, dataInclusaoFim: e.target.value }))}
                className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--crm-border, #334155)' }}
              />
            </div>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setFiltros((p) => ({ ...p, dataInclusaoInicio: hoje(), dataInclusaoFim: hoje() }))}
                className="text-xs text-blue-400 hover:underline"
              >
                hoje
              </button>
              <button
                type="button"
                onClick={() => setFiltros((p) => ({ ...p, dataInclusaoInicio: ontem(), dataInclusaoFim: ontem() }))}
                className="text-xs text-blue-400 hover:underline"
              >
                ontem
              </button>
            </div>
          </div>

          {/* Data Prazo */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Data Prazo</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filtros.dataPrazoInicio}
                onChange={(e) => setFiltros((p) => ({ ...p, dataPrazoInicio: e.target.value }))}
                className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--crm-border, #334155)' }}
              />
              <span className="text-xs text-slate-500">—</span>
              <input
                type="date"
                value={filtros.dataPrazoFim}
                onChange={(e) => setFiltros((p) => ({ ...p, dataPrazoFim: e.target.value }))}
                className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--crm-border, #334155)' }}
              />
            </div>
          </div>
        </div>

        {/* Checkboxes finais */}
        <div className="mb-4 flex flex-wrap gap-4">
          {[
            { key: 'vigentes', label: 'Vigentes' },
            { key: 'comEdital', label: 'Com Edital' },
            { key: 'somenteFavoritas', label: 'Somente favoritas' }
          ].map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={filtros[key]}
                onChange={(e) => setFiltros((p) => ({ ...p, [key]: e.target.checked }))}
                className="h-4 w-4 rounded accent-blue-500"
              />
              {label}
            </label>
          ))}
          <button
            type="button"
            onClick={limparFiltros}
            className="ml-auto text-xs text-slate-400 hover:text-white hover:underline"
          >
            Limpar filtros
          </button>
        </div>

        {/* Botão Buscar */}
        <div className="flex justify-center">
          <button
            onClick={handleBuscar}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar em Todos os Portais
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b" style={{ borderColor: 'var(--crm-border, #334155)' }}>
        {[
          { id: 'resultados', label: `Resultados (${resultados.length})` },
          { id: 'filtrosSalvos', label: `Filtros Salvos (${filtrosSalvos.length})` },
          { id: 'alertas', label: `Alertas (${alertas.length})` },
          { id: 'ingestao', label: 'Ingestão' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium transition border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Resultados */}
      {activeTab === 'resultados' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : resultados.length === 0 ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
            >
              <Search className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
                Nenhuma oportunidade encontrada para os filtros selecionados.
                <br />Use os filtros acima e clique em <strong className="text-white">Buscar</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resultados.map((r, i) => {
                const id = r.id || r.numeroControlePNCP || r.numeroCompra || i;
                const isFav = favoritos.includes(id);
                const encerrado = r.dataEncerramentoProposta
                  ? new Date(r.dataEncerramentoProposta) < new Date()
                  : false;

                return (
                  <div
                    key={id}
                    className="flex flex-col rounded-xl border p-4 transition hover:border-blue-500/40"
                    style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
                  >
                    {/* Badge status + fonte */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={[
                            'rounded-full px-2 py-0.5 text-xs font-semibold',
                            encerrado
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-green-500/20 text-green-300'
                          ].join(' ')}
                        >
                          {encerrado ? 'Encerrado' : 'Aberto'}
                        </span>
                        {/* Badge de fonte */}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          r._fonte === 'BLL' ? 'bg-orange-500/20 text-orange-300' :
                          r._fonte === 'BNC' ? 'bg-purple-500/20 text-purple-300' :
                          r._fonte === 'CONLICITACAO' ? 'bg-green-500/20 text-green-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {r._fonte || 'PNCP'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleFavoritar(id)}
                        title={isFav ? 'Remover favorito' : 'Favoritar'}
                        className="transition"
                      >
                        <Heart
                          className={['h-4 w-4', isFav ? 'fill-red-400 text-red-400' : 'text-slate-500 hover:text-red-400'].join(' ')}
                        />
                      </button>
                    </div>

                    {/* Objeto */}
                    <p className="mb-2 line-clamp-2 text-sm font-semibold text-white">
                      {r.objetoCompra || r.objeto || '—'}
                    </p>

                    {/* Detalhes */}
                    <div className="mt-auto space-y-1 text-xs" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
                      <div><span className="font-medium text-slate-300">Órgão:</span> {r.orgaoEntidade?.razaoSocial || r.orgao || '—'}</div>
                      <div><span className="font-medium text-slate-300">Modalidade:</span> {r.modalidadeNome || r.modalidade || '—'}</div>
                      <div><span className="font-medium text-slate-300">Valor estimado:</span> {formatarMoeda(r.valorTotalEstimado ?? r.valor)}</div>
                      <div><span className="font-medium text-slate-300">Abertura:</span> {formatarData(r.dataAberturaProposta || r.dataAbertura)}</div>
                      <div><span className="font-medium text-slate-300">UF:</span> {r.unidadeOrgao?.ufSigla || r.uf || '—'}</div>
                    </div>

                    {/* Ver Edital */}
                    {(r.linkSistemaOrigem || r.linkEdital) && (
                      <a
                        href={r.linkSistemaOrigem || r.linkEdital}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver Edital
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!!erroBusca && (
            <p className="mt-4 text-center text-sm text-amber-300">{erroBusca}</p>
          )}
        </div>
      )}

      {/* Tab: Filtros Salvos */}
      {activeTab === 'filtrosSalvos' && (
        <div className="space-y-3">
          {filtrosSalvos.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
            >
              <Bookmark className="mx-auto mb-2 h-8 w-8 text-slate-600" />
              <p className="text-sm" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Nenhum filtro salvo ainda.</p>
            </div>
          ) : filtrosSalvos.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-xl border p-4"
              style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
            >
              <div>
                <div className="font-semibold text-white">{f.nome}</div>
                <div className="text-xs" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
                  Salvo em {formatarData(f.criadoEm)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAplicarFiltro(f)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => handleExcluirFiltro(f.id)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Alertas */}
      {activeTab === 'alertas' && (
        <div className="space-y-3">
          {alertas.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
            >
              <Bell className="mx-auto mb-2 h-8 w-8 text-slate-600" />
              <p className="text-sm" style={{ color: 'var(--crm-muted, #94a3b8)' }}>Nenhum alerta criado ainda.</p>
            </div>
          ) : alertas.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border p-4"
              style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
            >
              <div>
                <div className="font-semibold text-white">{a.descricao}</div>
                <div className="text-xs" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
                  Criado em {formatarData(a.criadoEm)}
                </div>
              </div>
              <button
                onClick={() => handleExcluirAlerta(a.id)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Ingestão */}
      {activeTab === 'ingestao' && (
        <div className="space-y-4">
          {/* PNCP */}
          <div
            className="rounded-xl border p-6"
            style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
          >
            <div className="mb-4 flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-400" />
              <h3 className="text-base font-semibold text-white">PNCP — Portal Nacional de Contratações Públicas</h3>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">API PNCP: Conectada (sem credenciais)</span>
            </div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
              <p>Busca em tempo real via API pública do Governo Federal.</p>
              <code className="block rounded bg-slate-800 px-2 py-1 text-xs text-blue-300">
                https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao
              </code>
              <p className="text-xs text-slate-500">Nenhuma credencial necessária.</p>
            </div>
          </div>

          {/* BLL */}
          <div
            className="rounded-xl border p-6"
            style={{ background: 'var(--crm-surface, #1e293b)', borderColor: 'var(--crm-border, #334155)' }}
          >
            <div className="mb-4 flex items-center gap-3">
              <Info className="h-5 w-5 text-orange-400" />
              <h3 className="text-base font-semibold text-white">BLL — Bolsa de Licitações e Leilões</h3>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-400">
                Status: {bllStatus}
              </span>
            </div>

            {/* Formulário de Credenciais */}
            <div className="mb-4 space-y-3 rounded-lg border border-slate-600/40 bg-slate-900/40 p-4">
              <h4 className="text-sm font-semibold text-white">Configurar Credenciais</h4>
              
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="seu-email@exemplo.com"
                  value={bllCredentials.email}
                  onChange={(e) => setBllCredentials(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500"
                  style={{ borderColor: 'var(--crm-border, #334155)' }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
                  Senha
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={bllCredentials.password}
                  onChange={(e) => setBllCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500"
                  style={{ borderColor: 'var(--crm-border, #334155)' }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSalvarCredenciaisBLL}
                  disabled={!bllCredentials.email || !bllCredentials.password}
                  className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
                <button
                  onClick={handleTestarCredenciaisBLL}
                  disabled={!bllCredentials.email || !bllCredentials.password}
                  className="flex-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Testar
                </button>
                <button
                  onClick={handleLimparCredenciaisBLL}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm" style={{ color: 'var(--crm-muted, #94a3b8)' }}>
              <p>As buscas são realizadas automaticamente em todos os portais ao clicar em <strong className="text-white">Buscar</strong>.</p>
              <p>Os resultados aparecem com badges coloridos: 
                <span className="rounded-full bg-blue-500/20 text-blue-300 px-2 py-0.5 text-xs font-bold ml-1">PNCP</span>
                <span className="rounded-full bg-orange-500/20 text-orange-300 px-2 py-0.5 text-xs font-bold ml-1">BLL</span>
                <span className="rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.5 text-xs font-bold ml-1">BNC</span>
                <span className="rounded-full bg-green-500/20 text-green-300 px-2 py-0.5 text-xs font-bold ml-1">CONLICITACAO</span>
              </p>
              <p className="text-xs text-slate-500">
                Suas credenciais são armazenadas localmente no navegador e enviadas de forma segura através do proxy do backend.
              </p>
              <a
                href="https://bll.org.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Acessar portal BLL
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
