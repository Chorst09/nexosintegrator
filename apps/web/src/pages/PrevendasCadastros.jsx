import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Eye,
  ExternalLink,
  FileDown,
  Globe2,
  Link2,
  Mail,
  Package,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  Target,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';

import { buildApiUrl, getAuthHeaders } from '../config/api';
import AnimatedStats from '../components/AnimatedStats';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';

const TAB_KEYS = {
  DISTRIBUIDORES: 'distribuidores',
  FORNECEDORES: 'fornecedores',
  OPORTUNIDADES: 'oportunidades'
};

const TABS = [
  { key: TAB_KEYS.DISTRIBUIDORES, label: 'Distribuidores', icon: Building2 },
  { key: TAB_KEYS.FORNECEDORES, label: 'Fornecedores', icon: Package },
  { key: TAB_KEYS.OPORTUNIDADES, label: 'Registro de Oportunidades', icon: Target }
];

const TAB_PAGE_META = {
  [TAB_KEYS.DISTRIBUIDORES]: {
    title: 'Distribuidores',
    subtitle: 'Gestão operacional de distribuidores para cotações B2B e B2G',
    breadcrumb: 'Distribuidores',
    createLabel: 'Novo Distribuidor'
  },
  [TAB_KEYS.FORNECEDORES]: {
    title: 'Fornecedores',
    subtitle: 'Gestão operacional de fornecedores homologados do Pré-Vendas',
    breadcrumb: 'Fornecedores',
    createLabel: 'Novo Fornecedor'
  },
  [TAB_KEYS.OPORTUNIDADES]: {
    title: 'Registro de Oportunidades',
    subtitle: 'Registro técnico de oportunidades com vínculo ao pipeline comercial',
    breadcrumb: 'Registro de Oportunidades',
    createLabel: 'Novo Registro de Oportunidade'
  }
};

const resolveTabKey = (value) => {
  const normalized = asString(value).toLowerCase();
  return Object.values(TAB_KEYS).includes(normalized) ? normalized : TAB_KEYS.DISTRIBUIDORES;
};

const defaultRegistry = {
  distribuidores: [],
  fornecedores: [],
  oportunidades: []
};

const defaultPartnerForm = {
  nome: '',
  razaoSocial: '',
  cnpj: '',
  contato: '',
  email: '',
  telefone: '',
  cidade: '',
  estado: '',
  site: '',
  status: 'ATIVO',
  categoriasText: '',
  marcasText: '',
  accountManager: '',
  portalUrl: '',
  portalLogin: '',
  portalSenha: '',
  ecommerceUrl: '',
  ecommerceLogin: '',
  ecommerceSenha: '',
  produtosPrincipaisText: '',
  vendedoresResponsaveis: [],
  portalPartnerUrl: '',
  portalPartnerLogin: '',
  portalPartnerSenha: '',
  treinamentoUrl: '',
  treinamentoLogin: '',
  treinamentoSenha: '',
  contatoPrincipal: '',
  emailContatoPrincipal: '',
  telefoneContatoPrincipal: '',
  contatoCotacoes: '',
  emailContatoCotacoes: '',
  telefoneContatoCotacoes: '',
  produtosServicosText: '',
  templateRoUrl: '',
  procedimentoRo: '',
  observacoes: ''
};

const defaultOpportunityForm = {
  oportunidadeId: '',
  titulo: '',
  cliente: '',
  origem: 'B2B',
  modalidade: 'VENDA',
  valorEstimado: '',
  prazo: '',
  status: 'ABERTA',
  prioridade: 'MEDIUM',
  distribuidorIds: [],
  fornecedorIds: [],
  observacoes: '',
  numeroOportunidade: '',
  produto: '',
  dataAbertura: '',
  dataValidade: ''
};

const toCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const toDateBr = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

const asString = (value) => String(value || '').trim();

const normalizeRegistryPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return defaultRegistry;

  return {
    distribuidores: Array.isArray(payload.distribuidores) ? payload.distribuidores : [],
    fornecedores: Array.isArray(payload.fornecedores) ? payload.fornecedores : [],
    oportunidades: Array.isArray(payload.oportunidades) ? payload.oportunidades : []
  };
};

const badgeClassForStatus = (status) => {
  const key = asString(status).toUpperCase();
  if (['ATIVO', 'ABERTA', 'GANHA', 'PRECIFICADA'].includes(key)) {
    return 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100';
  }
  if (['EM_ANALISE', 'EM_COTACAO'].includes(key)) {
    return 'border-amber-500/40 bg-amber-500/20 text-amber-100';
  }
  if (['INATIVO', 'PERDIDA', 'BLOQUEADO'].includes(key)) {
    return 'border-rose-500/40 bg-rose-500/20 text-rose-100';
  }
  return 'border-slate-500/40 bg-slate-500/20 text-slate-100';
};

const badgeClassForPriority = (priority) => {
  const key = asString(priority).toUpperCase();
  if (key === 'URGENT' || key === 'URGENTE') return 'border-rose-500/40 bg-rose-500/20 text-rose-100';
  if (key === 'HIGH' || key === 'ALTA') return 'border-amber-500/40 bg-amber-500/20 text-amber-100';
  if (key === 'LOW' || key === 'BAIXA') return 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100';
  return 'border-sky-500/40 bg-sky-500/20 text-sky-100';
};

const priorityLabel = (value) => {
  const key = asString(value).toUpperCase();
  if (key === 'LOW') return 'Baixa';
  if (key === 'HIGH') return 'Alta';
  if (key === 'URGENT') return 'Urgente';
  return 'Média';
};

export default function PrevendasCadastros({ forcedTab = null }) {
  const navigate = useNavigate();
  const forcedTabKey = forcedTab ? resolveTabKey(forcedTab) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(forcedTabKey || TAB_KEYS.DISTRIBUIDORES);
  const [searchTerm, setSearchTerm] = useState('');

  const [registry, setRegistry] = useState(defaultRegistry);
  const [pipelineOpportunities, setPipelineOpportunities] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(forcedTabKey || TAB_KEYS.DISTRIBUIDORES);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingDistributor, setViewingDistributor] = useState(null);

  const [partnerForm, setPartnerForm] = useState(defaultPartnerForm);
  const [opportunityForm, setOpportunityForm] = useState(defaultOpportunityForm);

  const distMap = useMemo(() => {
    return new Map((registry.distribuidores || []).map((item) => [item.id, item.nome]));
  }, [registry.distribuidores]);

  const fornMap = useMemo(() => {
    return new Map((registry.fornecedores || []).map((item) => [item.id, item.nome]));
  }, [registry.fornecedores]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [registryRes, opportunitiesRes] = await Promise.all([
        fetch(buildApiUrl('/prevendas-cadastros'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/opportunities'), { headers: getAuthHeaders() })
      ]);

      const registryPayload = registryRes.ok
        ? normalizeRegistryPayload(await registryRes.json().catch(() => ({})))
        : defaultRegistry;

      const opportunitiesPayload = opportunitiesRes.ok
        ? await opportunitiesRes.json().catch(() => [])
        : [];

      setRegistry(registryPayload);
      setPipelineOpportunities(Array.isArray(opportunitiesPayload) ? opportunitiesPayload : []);
    } catch (error) {
      console.error('Erro ao carregar cadastros de pré-vendas:', error);
      setRegistry(defaultRegistry);
      setPipelineOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (forcedTabKey) setActiveTab(forcedTabKey);
  }, [forcedTabKey]);

  const currentTab = forcedTabKey || activeTab;

  const stats = useMemo(() => {
    const oportunidadesVinculadas = (registry.oportunidades || []).filter((item) => asString(item.oportunidadeId)).length;

    return [
      {
        title: 'Distribuidores',
        value: registry.distribuidores.length,
        subtitle: 'Base ativa para cotações',
        icon: Building2,
        color: 'blue'
      },
      {
        title: 'Fornecedores',
        value: registry.fornecedores.length,
        subtitle: 'Parceiros homologados',
        icon: Package,
        color: 'purple'
      },
      {
        title: 'Oportunidades Registradas',
        value: registry.oportunidades.length,
        subtitle: 'Registro operacional pré-vendas',
        icon: Target,
        color: 'green'
      },
      {
        title: 'Vinculadas ao Pipeline',
        value: oportunidadesVinculadas,
        subtitle: 'Com ID da oportunidade comercial',
        icon: Link2,
        color: 'yellow'
      }
    ];
  }, [registry]);

  const activeRows = useMemo(() => {
    const source = registry[currentTab] || [];
    const term = asString(searchTerm).toLowerCase();
    if (!term) return source;

    return source.filter((item) => {
      if (currentTab === TAB_KEYS.OPORTUNIDADES) {
        return [
          item.titulo,
          item.cliente,
          item.oportunidadeId,
          item.status,
          item.modalidade,
          item.origem,
          item.observacoes,
          item.numeroOportunidade,
          item.produto
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      }

      return [
        item.nome,
        item.razaoSocial,
        item.cnpj,
        item.contato,
        item.email,
        item.telefone,
        item.accountManager,
        item.portalUrl,
        item.portalLogin,
        item.ecommerceUrl,
        item.ecommerceLogin,
        item.portalPartnerUrl,
        item.portalPartnerLogin,
        item.treinamentoUrl,
        item.treinamentoLogin,
        item.contatoPrincipal,
        item.emailContatoPrincipal,
        item.telefoneContatoPrincipal,
        item.contatoCotacoes,
        item.emailContatoCotacoes,
        item.telefoneContatoCotacoes,
        item.templateRoUrl,
        item.procedimentoRo,
        item.cidade,
        item.estado,
        item.status,
        Array.isArray(item.categorias) ? item.categorias.join(' ') : '',
        Array.isArray(item.marcas) ? item.marcas.join(' ') : '',
        Array.isArray(item.produtosPrincipais) ? item.produtosPrincipais.join(' ') : '',
        Array.isArray(item.produtosServicos) ? item.produtosServicos.join(' ') : '',
        item.observacoes
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [currentTab, registry, searchTerm]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setPartnerForm(defaultPartnerForm);
    setOpportunityForm(defaultOpportunityForm);
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setPartnerForm(defaultPartnerForm);
    setOpportunityForm(defaultOpportunityForm);
    setModalOpen(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);

    if (type === TAB_KEYS.OPORTUNIDADES) {
      setOpportunityForm({
        oportunidadeId: item.oportunidadeId || '',
        titulo: item.titulo || '',
        cliente: item.cliente || '',
        origem: item.origem || 'B2B',
        modalidade: item.modalidade || 'VENDA',
        valorEstimado: item.valorEstimado ?? '',
        prazo: item.prazo ? String(item.prazo).slice(0, 10) : '',
        status: item.status || 'ABERTA',
        prioridade: item.prioridade || 'MEDIUM',
        distribuidorIds: Array.isArray(item.distribuidorIds) ? item.distribuidorIds : [],
        fornecedorIds: Array.isArray(item.fornecedorIds) ? item.fornecedorIds : [],
        observacoes: item.observacoes || '',
        numeroOportunidade: item.numeroOportunidade || '',
        produto: item.produto || '',
        dataAbertura: item.dataAbertura ? String(item.dataAbertura).slice(0, 10) : '',
        dataValidade: item.dataValidade ? String(item.dataValidade).slice(0, 10) : ''
      });
    } else {
      setPartnerForm({
        nome: item.nome || '',
        razaoSocial: item.razaoSocial || '',
        cnpj: item.cnpj || '',
        contato: item.contato || '',
        email: item.email || '',
        telefone: item.telefone || '',
        cidade: item.cidade || '',
        estado: item.estado || '',
        site: item.site || '',
        status: item.status || 'ATIVO',
        categoriasText: Array.isArray(item.categorias) ? item.categorias.join(', ') : '',
        marcasText: Array.isArray(item.marcas) ? item.marcas.join(', ') : '',
        accountManager: item.accountManager || '',
        portalUrl: item.portalUrl || '',
        portalLogin: item.portalLogin || '',
        portalSenha: item.portalSenha || '',
        ecommerceUrl: item.ecommerceUrl || '',
        ecommerceLogin: item.ecommerceLogin || '',
        ecommerceSenha: item.ecommerceSenha || '',
        produtosPrincipaisText: Array.isArray(item.produtosPrincipais) ? item.produtosPrincipais.join(', ') : '',
        vendedoresResponsaveis: Array.isArray(item.vendedoresResponsaveis) ? item.vendedoresResponsaveis : [],
        portalPartnerUrl: item.portalPartnerUrl || '',
        portalPartnerLogin: item.portalPartnerLogin || '',
        portalPartnerSenha: item.portalPartnerSenha || '',
        treinamentoUrl: item.treinamentoUrl || '',
        treinamentoLogin: item.treinamentoLogin || '',
        treinamentoSenha: item.treinamentoSenha || '',
        contatoPrincipal: item.contatoPrincipal || item.contato || '',
        emailContatoPrincipal: item.emailContatoPrincipal || item.email || '',
        telefoneContatoPrincipal: item.telefoneContatoPrincipal || item.telefone || '',
        contatoCotacoes: item.contatoCotacoes || '',
        emailContatoCotacoes: item.emailContatoCotacoes || '',
        telefoneContatoCotacoes: item.telefoneContatoCotacoes || '',
        produtosServicosText: Array.isArray(item.produtosServicos)
          ? item.produtosServicos.join(', ')
          : Array.isArray(item.categorias)
            ? item.categorias.join(', ')
            : '',
        templateRoUrl: item.templateRoUrl || '',
        procedimentoRo: item.procedimentoRo || '',
        observacoes: item.observacoes || ''
      });
    }

    setModalOpen(true);
  };

  const closeDistributorView = () => {
    setViewingDistributor(null);
  };

  const submitPartner = async () => {
    const nome = asString(partnerForm.nome);
    if (!nome) {
      alert('Informe o nome antes de salvar.');
      return;
    }

    const payload = {
      ...partnerForm,
      nome,
      categorias: asString(partnerForm.categoriasText)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      marcas: asString(partnerForm.marcasText)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      produtosPrincipais: asString(partnerForm.produtosPrincipaisText)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      produtosServicos: asString(partnerForm.produtosServicosText)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      vendedoresResponsaveis: Array.isArray(partnerForm.vendedoresResponsaveis)
        ? partnerForm.vendedoresResponsaveis
          .map((seller) => ({
            nome: asString(seller.nome),
            email: asString(seller.email),
            telefone: asString(seller.telefone),
            marca: asString(seller.marca)
          }))
          .filter((seller) => seller.nome || seller.email || seller.telefone || seller.marca)
        : []
    };

    if (modalType === TAB_KEYS.FORNECEDORES) {
      payload.contato = asString(partnerForm.contatoPrincipal);
      payload.email = asString(partnerForm.emailContatoPrincipal);
      payload.telefone = asString(partnerForm.telefoneContatoPrincipal);
      payload.categorias = payload.produtosServicos;
    }

    try {
      setSaving(true);
      const url = editingItem
        ? buildApiUrl(`/prevendas-cadastros/${modalType}/${editingItem.id}`)
        : buildApiUrl(`/prevendas-cadastros/${modalType}`);

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao salvar cadastro');
      }

      closeModal();
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar parceiro:', error);
      alert(error.message || 'Erro ao salvar cadastro');
    } finally {
      setSaving(false);
    }
  };

  const submitOpportunityRegistry = async () => {
    const titulo = asString(opportunityForm.titulo);
    if (!titulo) {
      alert('Informe o título da oportunidade antes de salvar.');
      return;
    }

    const payload = {
      ...opportunityForm,
      titulo,
      cliente: asString(opportunityForm.cliente),
      valorEstimado: opportunityForm.valorEstimado === '' ? null : Number(opportunityForm.valorEstimado),
      prazo: opportunityForm.prazo || null,
      dataAbertura: opportunityForm.dataAbertura || null,
      dataValidade: opportunityForm.dataValidade || null,
      distribuidorIds: Array.isArray(opportunityForm.distribuidorIds) ? opportunityForm.distribuidorIds : [],
      fornecedorIds: Array.isArray(opportunityForm.fornecedorIds) ? opportunityForm.fornecedorIds : []
    };

    try {
      setSaving(true);
      const url = editingItem
        ? buildApiUrl(`/prevendas-cadastros/oportunidades/${editingItem.id}`)
        : buildApiUrl('/prevendas-cadastros/oportunidades');

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao salvar registro de oportunidade');
      }

      closeModal();
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar registro de oportunidade:', error);
      alert(error.message || 'Erro ao salvar registro');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (type, item) => {
    const nome = type === TAB_KEYS.OPORTUNIDADES ? item.titulo : item.nome;
    if (!window.confirm(`Deseja excluir "${nome}"?`)) return;

    try {
      setSaving(true);
      const response = await fetch(buildApiUrl(`/prevendas-cadastros/${type}/${item.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao excluir registro');
      }

      await loadData();
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      alert(error.message || 'Erro ao excluir registro');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPipelineOpportunity = (opportunityId) => {
    const selected = pipelineOpportunities.find((entry) => entry.id === opportunityId);
    if (!selected) {
      setOpportunityForm((prev) => ({ ...prev, oportunidadeId: '' }));
      return;
    }

    setOpportunityForm((prev) => ({
      ...prev,
      oportunidadeId: selected.id,
      titulo: selected.title || prev.titulo,
      cliente: selected?.company?.name || prev.cliente,
      origem: selected?.clientType === 'B2G' ? 'B2G' : prev.origem,
      valorEstimado: Number.isFinite(Number(selected?.value)) ? String(selected.value) : prev.valorEstimado
    }));
  };

  const addSeller = () => {
    setPartnerForm((prev) => ({
      ...prev,
      vendedoresResponsaveis: [
        ...(Array.isArray(prev.vendedoresResponsaveis) ? prev.vendedoresResponsaveis : []),
        { marca: '', nome: '', email: '', telefone: '' }
      ]
    }));
  };

  const updateSeller = (index, field, value) => {
    setPartnerForm((prev) => ({
      ...prev,
      vendedoresResponsaveis: (Array.isArray(prev.vendedoresResponsaveis) ? prev.vendedoresResponsaveis : []).map((seller, sellerIndex) => (
        sellerIndex === index ? { ...seller, [field]: value } : seller
      ))
    }));
  };

  const removeSeller = (index) => {
    setPartnerForm((prev) => ({
      ...prev,
      vendedoresResponsaveis: (Array.isArray(prev.vendedoresResponsaveis) ? prev.vendedoresResponsaveis : []).filter((_, sellerIndex) => sellerIndex !== index)
    }));
  };

  const inputClassName = 'w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 py-2 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50';

  const renderDistributorForm = () => (
    <div className="relative space-y-5">
      <button
        type="button"
        onClick={closeModal}
        className="absolute -right-2 -top-2 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
        aria-label="Fechar modal"
      >
        <X className="h-5 w-5" />
      </button>

      <div>
        <h2 className="text-3xl font-semibold text-white">{editingItem ? 'Editar Distribuidor' : 'Novo Distribuidor'}</h2>
        <p className="mt-1 text-slate-400">Cadastre dados de contato, acessos e marcas atendidas.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Nome</span>
          <input
            type="text"
            value={partnerForm.nome}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, nome: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Marcas (separe por vírgula)</span>
          <input
            type="text"
            value={partnerForm.marcasText}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, marcasText: event.target.value }))}
            className={inputClassName}
            placeholder="Dell, Lenovo, HP"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Account Manager</span>
          <input
            type="text"
            value={partnerForm.accountManager}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, accountManager: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">E-mail</span>
          <input
            type="email"
            value={partnerForm.email}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, email: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Telefone</span>
          <input
            type="text"
            value={partnerForm.telefone}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, telefone: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Status</span>
          <select
            value={partnerForm.status}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, status: event.target.value }))}
            className={inputClassName}
          >
            <option value="ATIVO">Ativo</option>
            <option value="EM_HOMOLOGACAO">Em homologação</option>
            <option value="INATIVO">Inativo</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Portal (URL)</span>
          <input
            type="text"
            value={partnerForm.portalUrl}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, portalUrl: event.target.value }))}
            className={inputClassName}
            placeholder="https://portal.distribuidor.com"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Login Portal</span>
          <input
            type="text"
            value={partnerForm.portalLogin}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, portalLogin: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Senha Portal</span>
          <input
            type="text"
            value={partnerForm.portalSenha}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, portalSenha: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">E-commerce (URL)</span>
          <input
            type="text"
            value={partnerForm.ecommerceUrl}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, ecommerceUrl: event.target.value }))}
            className={inputClassName}
            placeholder="https://ecommerce..."
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Login E-commerce</span>
          <input
            type="text"
            value={partnerForm.ecommerceLogin}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, ecommerceLogin: event.target.value }))}
            className={inputClassName}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Senha E-commerce</span>
          <input
            type="text"
            value={partnerForm.ecommerceSenha}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, ecommerceSenha: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Produtos Principais (vírgula)</span>
          <input
            type="text"
            value={partnerForm.produtosPrincipaisText}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, produtosPrincipaisText: event.target.value }))}
            className={inputClassName}
            placeholder="Lenovo, Dell"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-white">Vendedores Responsáveis</h3>
          <button
            type="button"
            onClick={addSeller}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600/40 bg-slate-700/60 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Adicionar Vendedor
          </button>
        </div>

        {partnerForm.vendedoresResponsaveis.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum vendedor adicionado.</p>
        ) : (
          <div className="space-y-3">
            {partnerForm.vendedoresResponsaveis.map((seller, index) => (
              <div key={`seller-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-700/60 bg-slate-950/30 p-3 lg:grid-cols-[0.8fr_1fr_1fr_1fr_auto]">
                <input
                  type="text"
                  value={seller.marca || ''}
                  onChange={(event) => updateSeller(index, 'marca', event.target.value)}
                  className={inputClassName}
                  placeholder="Marca/linha"
                />
                <input
                  type="text"
                  value={seller.nome || ''}
                  onChange={(event) => updateSeller(index, 'nome', event.target.value)}
                  className={inputClassName}
                  placeholder="Nome"
                />
                <input
                  type="email"
                  value={seller.email || ''}
                  onChange={(event) => updateSeller(index, 'email', event.target.value)}
                  className={inputClassName}
                  placeholder="E-mail"
                />
                <input
                  type="text"
                  value={seller.telefone || ''}
                  onChange={(event) => updateSeller(index, 'telefone', event.target.value)}
                  className={inputClassName}
                  placeholder="Telefone"
                />
                <button
                  type="button"
                  onClick={() => removeSeller(index)}
                  className="inline-flex items-center justify-center rounded-lg border border-rose-500/40 px-3 py-2 text-rose-100 hover:bg-rose-500/20"
                  aria-label="Remover vendedor"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">Notas</span>
        <textarea
          value={partnerForm.observacoes}
          onChange={(event) => setPartnerForm((prev) => ({ ...prev, observacoes: event.target.value }))}
          className="min-h-[120px] w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 py-2 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={closeModal}
          className="rounded-lg border border-slate-500/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submitPartner}
          disabled={saving}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar cadastro'}
        </button>
      </div>
    </div>
  );

  const renderSupplierForm = () => (
    <div className="relative space-y-6">
      <button
        type="button"
        onClick={closeModal}
        className="absolute -right-2 -top-2 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
        aria-label="Fechar modal"
      >
        <X className="h-5 w-5" />
      </button>

      <div>
        <h2 className="text-3xl font-semibold text-white">{editingItem ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
        <p className="mt-1 text-slate-400">Cadastre os dados principais, informações de portal e procedimentos de RO.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Nome</span>
          <input
            type="text"
            value={partnerForm.nome}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, nome: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Status</span>
          <select
            value={partnerForm.status}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, status: event.target.value }))}
            className={inputClassName}
          >
            <option value="ATIVO">Ativo</option>
            <option value="EM_HOMOLOGACAO">Em homologação</option>
            <option value="INATIVO">Inativo</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Portal / Partner</span>
          <input
            type="text"
            value={partnerForm.portalPartnerUrl}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, portalPartnerUrl: event.target.value }))}
            className={inputClassName}
            placeholder="https://partner..."
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Login Portal / Partner</span>
          <input
            type="text"
            value={partnerForm.portalPartnerLogin}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, portalPartnerLogin: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Senha Portal / Partner</span>
          <input
            type="text"
            value={partnerForm.portalPartnerSenha}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, portalPartnerSenha: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Portal de Treinamentos</span>
          <input
            type="text"
            value={partnerForm.treinamentoUrl}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, treinamentoUrl: event.target.value }))}
            className={inputClassName}
            placeholder="https://academy..."
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Login Portal de Treinamentos</span>
          <input
            type="text"
            value={partnerForm.treinamentoLogin}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, treinamentoLogin: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Senha Portal de Treinamentos</span>
          <input
            type="text"
            value={partnerForm.treinamentoSenha}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, treinamentoSenha: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Contato Principal</span>
          <input
            type="text"
            value={partnerForm.contatoPrincipal}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, contatoPrincipal: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">E-mail Contato Principal</span>
          <input
            type="email"
            value={partnerForm.emailContatoPrincipal}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, emailContatoPrincipal: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Telefone Contato Principal</span>
          <input
            type="text"
            value={partnerForm.telefoneContatoPrincipal}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, telefoneContatoPrincipal: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Contato Cotações</span>
          <input
            type="text"
            value={partnerForm.contatoCotacoes}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, contatoCotacoes: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">E-mail Contato Cotações</span>
          <input
            type="email"
            value={partnerForm.emailContatoCotacoes}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, emailContatoCotacoes: event.target.value }))}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Telefone Contato Cotações</span>
          <input
            type="text"
            value={partnerForm.telefoneContatoCotacoes}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, telefoneContatoCotacoes: event.target.value }))}
            className={inputClassName}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">Produtos/Serviços Oferecidos (vírgula)</span>
        <input
          type="text"
          value={partnerForm.produtosServicosText}
          onChange={(event) => setPartnerForm((prev) => ({ ...prev, produtosServicosText: event.target.value }))}
          className={inputClassName}
          placeholder="Servidores, Storages, Workstation..."
        />
      </label>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Documentos e Procedimentos</h3>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Template RO (URL)</span>
          <input
            type="text"
            value={partnerForm.templateRoUrl}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, templateRoUrl: event.target.value }))}
            className={inputClassName}
            placeholder="https://..."
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-300">Procedimento para RO</span>
          <textarea
            value={partnerForm.procedimentoRo}
            onChange={(event) => setPartnerForm((prev) => ({ ...prev, procedimentoRo: event.target.value }))}
            className="min-h-[150px] w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 py-2 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            placeholder="Descreva o passo a passo..."
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">Notas</span>
        <textarea
          value={partnerForm.observacoes}
          onChange={(event) => setPartnerForm((prev) => ({ ...prev, observacoes: event.target.value }))}
          className="min-h-[120px] w-full rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 py-2 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        />
      </label>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submitPartner}
          disabled={saving}
          className="rounded-lg bg-sky-400 px-8 py-3 text-base font-medium text-slate-950 hover:bg-sky-300 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar Fornecedor'}
        </button>
      </div>
    </div>
  );

  const renderPillList = (items, emptyText, className = 'from-blue-500 to-violet-600') => {
    const values = Array.isArray(items) ? items.filter(Boolean) : [];
    if (values.length === 0) {
      return <p className="text-base text-slate-400">{emptyText}</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {values.map((item) => (
          <span
            key={item}
            className={`rounded-full bg-gradient-to-r ${className} px-4 py-2 text-sm font-semibold text-white`}
          >
            {item}
          </span>
        ))}
      </div>
    );
  };

  const renderPortalCard = ({ title, url, login, icon: Icon, accentClass }) => (
    <div className="rounded-xl border border-slate-200/70 bg-slate-300/70 p-6 text-slate-100">
      <div className={`mb-6 flex items-center gap-3 text-3xl font-bold ${accentClass}`}>
        <Icon className="h-8 w-8" />
        <span>{title}</span>
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 break-all text-xl font-bold text-blue-700 hover:text-blue-500"
        >
          {url}
          <ExternalLink className="h-4 w-4 shrink-0" />
        </a>
      ) : (
        <p className="text-xl font-semibold text-slate-600">URL não informada.</p>
      )}
      <p className="mt-6 text-lg text-white">
        <span className="font-bold">Usuário:</span> {login || '-'}
      </p>
    </div>
  );

  const renderDistributorView = () => {
    const item = viewingDistributor;
    if (!item) return null;

    const statusLabel = item.status === 'ATIVO' ? 'Ativo' : item.status || 'Ativo';
    const contactName = item.accountManager || item.contato || '-';
    const brands = Array.isArray(item.marcas) && item.marcas.length > 0 ? item.marcas : item.categorias;
    const sellers = Array.isArray(item.vendedoresResponsaveis) ? item.vendedoresResponsaveis : [];

    return (
      <div className="relative space-y-8 bg-slate-950 text-white">
        <button
          type="button"
          onClick={closeDistributorView}
          className="absolute -right-4 -top-4 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label="Fechar modal"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-sky-400" />
            <h2 className="text-3xl font-semibold text-white">Visualizar Distribuidor: {item.nome || '-'}</h2>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-3 rounded-lg border border-slate-600/70 px-5 py-3 text-lg text-slate-100 hover:bg-slate-800/70"
          >
            <FileDown className="h-5 w-5" /> Imprimir PDF
          </button>
        </div>

        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-5xl font-semibold text-white">{item.nome || '-'}</h3>
              <p className="mt-4 text-3xl text-blue-100">Distribuidor</p>
            </div>
            <span className="w-fit rounded-full bg-emerald-500 px-8 py-4 text-3xl font-semibold text-white">
              {statusLabel}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-sky-900/80 bg-[#17283d] p-7">
            <div className="mb-8 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <User className="h-9 w-9" />
              </span>
              <h3 className="text-4xl font-semibold text-white">Informações de Contato</h3>
            </div>
            <div className="space-y-8">
              <div>
                <p className="text-lg text-slate-400">Contato Principal</p>
                <p className="mt-1 text-2xl font-semibold text-white">{contactName}</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-lg text-slate-400">
                  <Mail className="h-5 w-5" /> Email
                </p>
                <p className="mt-2 break-all text-2xl font-semibold text-white">{item.email || '-'}</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-lg text-slate-400">
                  <Phone className="h-5 w-5" /> Telefone
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{item.telefone || '-'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-900/80 bg-[#17283d] p-7">
            <div className="mb-8 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Package className="h-9 w-9" />
              </span>
              <h3 className="text-4xl font-semibold text-white">Produtos/Serviços</h3>
            </div>
            <div className="space-y-8">
              <div>
                <p className="mb-4 text-lg text-slate-400">Marcas</p>
                {renderPillList(brands, 'Sem marcas informadas.')}
              </div>
              <div>
                <p className="mb-4 text-lg text-slate-400">Produtos Principais</p>
                {renderPillList(item.produtosPrincipais, 'Sem produtos principais informados.')}
              </div>
            </div>
          </section>
        </div>

        <section>
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <Globe2 className="h-9 w-9" />
            </span>
            <h3 className="text-4xl font-semibold text-white">Informações do Portal</h3>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {renderPortalCard({
              title: 'Portal Principal',
              url: item.portalUrl,
              login: item.portalLogin,
              icon: Link2,
              accentClass: 'text-blue-800'
            })}
            {renderPortalCard({
              title: 'E-commerce',
              url: item.ecommerceUrl,
              login: item.ecommerceLogin,
              icon: ShoppingCart,
              accentClass: 'text-violet-700'
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-sky-900/80 bg-[#17283d] p-7">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Users className="h-9 w-9" />
            </span>
            <h3 className="text-4xl font-semibold text-white">Vendedores Responsáveis</h3>
          </div>

          {sellers.length === 0 ? (
            <p className="text-lg text-slate-400">Nenhum vendedor adicionado.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {sellers.map((seller, index) => {
                const sellerTag = seller.marca || seller.area || seller.produto || seller.tipo || '';
                return (
                  <div key={`${seller.nome || 'seller'}-${index}`} className="rounded-xl border-l-4 border-blue-500 bg-[#1c2d43] p-7">
                    {sellerTag && (
                      <span className="mb-5 inline-flex rounded-full bg-sky-300 px-5 py-2 text-lg font-semibold text-slate-900">
                        {sellerTag}
                      </span>
                    )}
                    <h4 className="text-3xl font-semibold text-white">{seller.nome || '-'}</h4>
                    <p className="mt-5 flex items-center gap-3 text-lg text-slate-200">
                      <Phone className="h-5 w-5 text-emerald-500" /> {seller.telefone || '-'}
                    </p>
                    <p className="mt-5 flex items-center gap-3 break-all text-lg text-slate-200">
                      <Mail className="h-5 w-5 shrink-0 text-violet-500" /> {seller.email || '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-sky-900/80 bg-[#17283d] p-7">
          <h3 className="text-3xl font-semibold text-white">Observações</h3>
          <p className="mt-5 whitespace-pre-wrap text-xl text-slate-400">{item.observacoes || 'Sem observações.'}</p>
        </section>
      </div>
    );
  };

  const renderPartnerCards = (type) => {
    if (activeRows.length === 0) {
      return <div className="py-12 text-center text-slate-400">Nenhum cadastro encontrado.</div>;
    }

    return (
      <div className="space-y-3">
        {activeRows.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-600/40 bg-[#102540] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-white">{item.nome}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeClassForStatus(item.status)}`}>
                    {item.status || 'ATIVO'}
                  </span>
                </div>

                <p className="text-sm text-slate-300">
                  {item.razaoSocial || 'Razão social não informada'}
                  {item.cnpj ? ` • CNPJ ${item.cnpj}` : ''}
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  Contato: {item.contato || '-'} • {item.email || '-'} • {item.telefone || '-'}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {item.cidade || '-'} / {item.estado || '-'}
                  {item.site ? ` • ${item.site}` : ''}
                </p>

                {Array.isArray(item.categorias) && item.categorias.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.categorias.map((categoria) => (
                      <span
                        key={`${item.id}-${categoria}`}
                        className="rounded-full border border-sky-500/40 bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-100"
                      >
                        {categoria}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {type === TAB_KEYS.DISTRIBUIDORES && (
                  <button
                    type="button"
                    onClick={() => setViewingDistributor(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-500/50 px-3 py-2 text-xs text-sky-100 hover:bg-sky-500/20"
                  >
                    <Eye className="h-3.5 w-3.5" /> Visualizar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditModal(type, item)}
                  className="rounded-lg border border-slate-500/40 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800/40"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(type, item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 px-3 py-2 text-xs text-rose-100 hover:bg-rose-500/20"
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOpportunityCards = () => {
    if (activeRows.length === 0) {
      return <div className="py-12 text-center text-slate-400">Nenhum registro de oportunidade encontrado.</div>;
    }

    return (
      <div className="space-y-3">
        {activeRows.map((item) => {
          const linkedDistributors = (item.distribuidorIds || []).map((id) => distMap.get(id)).filter(Boolean);
          const linkedSuppliers = (item.fornecedorIds || []).map((id) => fornMap.get(id)).filter(Boolean);

          return (
            <div key={item.id} className="rounded-xl border border-slate-600/40 bg-[#102540] p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-white">{item.titulo || 'Sem título'}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeClassForStatus(item.status)}`}>
                      {item.status || 'ABERTA'}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeClassForPriority(item.prioridade)}`}>
                      {priorityLabel(item.prioridade)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300">
                    Cliente: {item.cliente || '-'} • Origem: {item.origem || '-'} • Modalidade: {item.modalidade || '-'}
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    Valor estimado: {toCurrency(item.valorEstimado)} • Prazo: {toDateBr(item.prazo)}
                  </p>

                  {item.numeroOportunidade && (
                    <p className="mt-1 text-sm text-slate-300">
                      Fornecedor: {item.numeroOportunidade}{item.produto ? ` • ${item.produto}` : ''}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-slate-400">
                    {item.dataAbertura ? `Abertura: ${toDateBr(item.dataAbertura)}` : ''}
                    {item.dataValidade ? ` • Validade: ${toDateBr(item.dataValidade)}` : ''}
                    {item.dataValidade && (() => {
                      const val = new Date(item.dataValidade);
                      const now = new Date();
                      if (!Number.isFinite(val.getTime())) return null;
                      const days = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
                      if (val < now) {
                        return <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300 border border-red-500/30">Vencida</span>;
                      }
                      if (val <= days(7)) {
                        return <span className="ml-2 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 border border-rose-500/30">Vence em 7 dias</span>;
                      }
                      if (val <= days(15)) {
                        return <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/30">Vence em 15 dias</span>;
                      }
                      if (val <= days(30)) {
                        return <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-300 border border-yellow-500/30">Vence em 30 dias</span>;
                      }
                      return <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/30">Válida</span>;
                    })()}
                  </p>

                  {item.oportunidadeId && (
                    <p className="mt-1 text-xs text-sky-200">Pipeline: {item.oportunidadeId}</p>
                  )}

                  <p className="mt-1 text-xs text-slate-400">
                    Distribuidores: {linkedDistributors.length > 0 ? linkedDistributors.join(', ') : 'Nenhum'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Fornecedores: {linkedSuppliers.length > 0 ? linkedSuppliers.join(', ') : 'Nenhum'}
                  </p>

                  {item.observacoes && (
                    <p className="mt-2 text-xs text-slate-300">{item.observacoes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(TAB_KEYS.OPORTUNIDADES, item)}
                    className="rounded-lg border border-slate-500/40 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800/40"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(TAB_KEYS.OPORTUNIDADES, item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 px-3 py-2 text-xs text-rose-100 hover:bg-rose-500/20"
                    disabled={saving}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const activeTabMeta = TABS.find((entry) => entry.key === currentTab) || TABS[0];
  const pageMeta = TAB_PAGE_META[currentTab] || TAB_PAGE_META[TAB_KEYS.DISTRIBUIDORES];
  const showTabSelector = !forcedTabKey;
  const ActiveTabIcon = activeTabMeta.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        icon={ActiveTabIcon}
        gradient="blue"
        breadcrumbs={['Home', 'Pré-Vendas', pageMeta.breadcrumb]}
        actions={[
          {
            label: 'Atualizar',
            icon: RefreshCcw,
            onClick: loadData,
            variant: 'secondary'
          },
          {
            label: 'Abrir Solicitações',
            icon: ClipboardList,
            onClick: () => navigate('/solicitacoes'),
            variant: 'primary'
          }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((item) => (
          <AnimatedStats key={item.title} {...item} />
        ))}
      </div>

      <div className="crm-card rounded-xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {showTabSelector ? (
              TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === currentTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={[
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                        : 'border-slate-500/40 bg-slate-900/40 text-slate-200 hover:bg-slate-800/50'
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" /> {tab.label}
                  </button>
                );
              })
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg border border-sky-400/50 bg-sky-500/20 px-3 py-2 text-sm text-sky-100">
                <ActiveTabIcon className="h-4 w-4" /> {activeTabMeta.label}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => openCreateModal(currentTab)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/30"
          >
            <Plus className="h-4 w-4" /> {pageMeta.createLabel}
          </button>
        </div>

        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={
              currentTab === TAB_KEYS.OPORTUNIDADES
                ? 'Buscar por título, cliente, origem, modalidade ou status'
                : 'Buscar por nome, CNPJ, contato, cidade, status ou categoria'
            }
            className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </div>

      <div className="crm-card rounded-xl p-4">
        {loading
          ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-400">Carregando dados...</p>
            </div>
          )
          : currentTab === TAB_KEYS.OPORTUNIDADES
            ? renderOpportunityCards()
            : renderPartnerCards(currentTab)}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={[TAB_KEYS.DISTRIBUIDORES, TAB_KEYS.FORNECEDORES].includes(modalType) ? '' : `${editingItem ? 'Editar' : 'Novo'} ${
          'Registro de Oportunidade'
        }`}
        showCloseButton={![TAB_KEYS.DISTRIBUIDORES, TAB_KEYS.FORNECEDORES].includes(modalType)}
        size="large"
        panelClassName={[TAB_KEYS.DISTRIBUIDORES, TAB_KEYS.FORNECEDORES].includes(modalType) ? 'max-w-[calc(100vw-2rem)] xl:max-w-7xl' : ''}
        contentClassName={[TAB_KEYS.DISTRIBUIDORES, TAB_KEYS.FORNECEDORES].includes(modalType) ? 'p-6 sm:p-8' : ''}
      >
        {modalType === TAB_KEYS.DISTRIBUIDORES ? renderDistributorForm() : modalType === TAB_KEYS.FORNECEDORES ? renderSupplierForm() : modalType !== TAB_KEYS.OPORTUNIDADES ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Nome *</span>
                <input
                  type="text"
                  value={partnerForm.nome}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, nome: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="Nome do parceiro"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Razão social</span>
                <input
                  type="text"
                  value={partnerForm.razaoSocial}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, razaoSocial: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="Razão social"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">CNPJ</span>
                <input
                  type="text"
                  value={partnerForm.cnpj}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, cnpj: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="00.000.000/0000-00"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Status</span>
                <select
                  value={partnerForm.status}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="EM_HOMOLOGACAO">Em homologação</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="BLOQUEADO">Bloqueado</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Contato principal</span>
                <input
                  type="text"
                  value={partnerForm.contato}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, contato: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="Nome do contato"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">E-mail</span>
                <input
                  type="email"
                  value={partnerForm.email}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="contato@empresa.com"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Telefone</span>
                <input
                  type="text"
                  value={partnerForm.telefone}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, telefone: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="(11) 99999-9999"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Site</span>
                <input
                  type="text"
                  value={partnerForm.site}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, site: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="https://..."
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Cidade</span>
                <input
                  type="text"
                  value={partnerForm.cidade}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, cidade: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="Cidade"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Estado</span>
                <input
                  type="text"
                  value={partnerForm.estado}
                  onChange={(event) => setPartnerForm((prev) => ({ ...prev, estado: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="UF"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-sm text-slate-300">Categorias (separe por vírgula)</span>
              <input
                type="text"
                value={partnerForm.categoriasText}
                onChange={(event) => setPartnerForm((prev) => ({ ...prev, categoriasText: event.target.value }))}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                placeholder="Hardware, Software, Serviços"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-slate-300">Observações</span>
              <textarea
                value={partnerForm.observacoes}
                onChange={(event) => setPartnerForm((prev) => ({ ...prev, observacoes: event.target.value }))}
                className="min-h-[110px] w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                placeholder="Dados comerciais, condições e observações"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-500/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPartner}
                disabled={saving}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar cadastro'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-slate-300">Oportunidade do Pipeline (opcional)</span>
                <select
                  value={opportunityForm.oportunidadeId}
                  onChange={(event) => handlePickPipelineOpportunity(event.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                >
                  <option value="">Selecionar oportunidade existente</option>
                  {pipelineOpportunities.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title} • {entry?.company?.name || 'Sem cliente'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Título *</span>
                <input
                  type="text"
                  value={opportunityForm.titulo}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, titulo: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="Título da oportunidade"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Cliente</span>
                <input
                  type="text"
                  value={opportunityForm.cliente}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, cliente: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  placeholder="Nome do cliente"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Origem</span>
                <select
                  value={opportunityForm.origem}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, origem: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                >
                  <option value="B2B">B2B</option>
                  <option value="B2G">B2G</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="PRE_VENDAS">Pré-vendas</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Modalidade</span>
                <select
                  value={opportunityForm.modalidade}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, modalidade: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                >
                  <option value="VENDA">Venda</option>
                  <option value="LOCACAO">Locação</option>
                  <option value="SERVICOS">Serviços</option>
                  <option value="PROJETO">Projeto</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Valor estimado (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={opportunityForm.valorEstimado}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, valorEstimado: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Prazo</span>
                <input
                  type="date"
                  value={opportunityForm.prazo}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, prazo: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Status</span>
                <select
                  value={opportunityForm.status}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, status: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                >
                  <option value="ABERTA">Aberta</option>
                  <option value="EM_ANALISE">Em análise</option>
                  <option value="EM_COTACAO">Em cotação</option>
                  <option value="PRECIFICADA">Precificada</option>
                  <option value="DEVOLVIDA">Devolvida</option>
                  <option value="GANHA">Ganha</option>
                  <option value="PERDIDA">Perdida</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">Prioridade</span>
                <select
                  value={opportunityForm.prioridade}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, prioridade: event.target.value }))}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </label>
            </div>

            <div className="mt-2 rounded-lg border border-sky-600/30 bg-sky-900/20 p-3">
              <p className="mb-3 text-sm font-medium text-sky-200">Registro no Fornecedor</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-sm text-slate-300">Número da oportunidade</span>
                  <input
                    type="text"
                    value={opportunityForm.numeroOportunidade}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, numeroOportunidade: event.target.value }))}
                    className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                    placeholder="Ex.: DELL-2026-001234"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-slate-300">Produto</span>
                  <input
                    type="text"
                    value={opportunityForm.produto}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, produto: event.target.value }))}
                    className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                    placeholder="Ex.: PowerEdge R750"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-slate-300">Data de abertura</span>
                  <input
                    type="date"
                    value={opportunityForm.dataAbertura}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, dataAbertura: event.target.value }))}
                    className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm text-slate-300">Data de validade</span>
                  <input
                    type="date"
                    value={opportunityForm.dataValidade}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, dataValidade: event.target.value }))}
                    className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-600/50 bg-slate-900/30 p-3">
                <p className="mb-2 text-sm font-medium text-slate-200">Distribuidores vinculados</p>
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {registry.distribuidores.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum distribuidor cadastrado.</p>
                  ) : (
                    registry.distribuidores.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={opportunityForm.distribuidorIds.includes(item.id)}
                          onChange={(event) => {
                            setOpportunityForm((prev) => {
                              const current = new Set(prev.distribuidorIds);
                              if (event.target.checked) current.add(item.id);
                              else current.delete(item.id);
                              return { ...prev, distribuidorIds: Array.from(current) };
                            });
                          }}
                        />
                        {item.nome}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-600/50 bg-slate-900/30 p-3">
                <p className="mb-2 text-sm font-medium text-slate-200">Fornecedores vinculados</p>
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {registry.fornecedores.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum fornecedor cadastrado.</p>
                  ) : (
                    registry.fornecedores.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={opportunityForm.fornecedorIds.includes(item.id)}
                          onChange={(event) => {
                            setOpportunityForm((prev) => {
                              const current = new Set(prev.fornecedorIds);
                              if (event.target.checked) current.add(item.id);
                              else current.delete(item.id);
                              return { ...prev, fornecedorIds: Array.from(current) };
                            });
                          }}
                        />
                        {item.nome}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-sm text-slate-300">Observações</span>
              <textarea
                value={opportunityForm.observacoes}
                onChange={(event) => setOpportunityForm((prev) => ({ ...prev, observacoes: event.target.value }))}
                className="min-h-[110px] w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
                placeholder="Detalhes de escopo, pendências e próximos passos"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-500/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitOpportunityRegistry}
                disabled={saving}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar registro'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!viewingDistributor}
        onClose={closeDistributorView}
        title=""
        showCloseButton={false}
        size="large"
        panelClassName="max-w-[calc(100vw-1rem)] xl:max-w-7xl bg-slate-950"
        contentClassName="p-4 sm:p-6"
      >
        {renderDistributorView()}
      </Modal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="crm-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <CalendarDays className="h-4 w-4" /> Última atualização
          </div>
          <p className="mt-2 text-lg font-semibold text-white">
            {loading ? '-' : `${toDateBr(new Date().toISOString())}`}
          </p>
          <p className="text-xs text-slate-400">Dados centralizados para equipe de Pré-Vendas.</p>
        </div>

        <div className="crm-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <DollarSign className="h-4 w-4" /> Valor potencial registrado
          </div>
          <p className="mt-2 text-lg font-semibold text-white">
            {toCurrency((registry.oportunidades || []).reduce((acc, item) => acc + Number(item.valorEstimado || 0), 0))}
          </p>
          <p className="text-xs text-slate-400">Somatório de oportunidades no registro de Pré-Vendas.</p>
        </div>

        <div className="crm-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Target className="h-4 w-4" /> Oportunidades no pipeline
          </div>
          <p className="mt-2 text-lg font-semibold text-white">{pipelineOpportunities.length}</p>
          <p className="text-xs text-slate-400">Base comercial disponível para vincular ao Pré-Vendas.</p>
        </div>
      </div>
    </div>
  );
}
