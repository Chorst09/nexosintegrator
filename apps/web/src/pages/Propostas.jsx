import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Send, 
  Download,
  Calendar,
  DollarSign,
  Package,
  Building2,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import ModernTable from '../components/ModernTable';
import GradientCard from '../components/GradientCard';
import Modal from '../components/Modal';

const FALLBACK_TEMPLATE_SECTIONS = {
  COMMERCIAL: [
    { id: 'company', title: 'Informações do Cliente', enabled: true, order: 1 },
    { id: 'proposal', title: 'Detalhes da Proposta', enabled: true, order: 2 },
    { id: 'items', title: 'Itens da Proposta', enabled: true, order: 3 },
    { id: 'financial', title: 'Resumo Financeiro', enabled: true, order: 4 },
    { id: 'terms', title: 'Termos e Condições', enabled: true, order: 5 },
    { id: 'timeline', title: 'Cronograma', enabled: true, order: 6 },
    { id: 'signature', title: 'Aprovação e Assinatura', enabled: true, order: 7 }
  ],
  TECHNICAL: [
    { id: 'company', title: 'Informações do Cliente', enabled: true, order: 1 },
    { id: 'technical_summary', title: 'Resumo Técnico', enabled: true, order: 2 },
    { id: 'scope', title: 'Escopo', enabled: true, order: 3 },
    { id: 'requirements', title: 'Requisitos', enabled: true, order: 4 },
    { id: 'solution', title: 'Solução Proposta', enabled: true, order: 5 },
    { id: 'timeline', title: 'Cronograma', enabled: true, order: 6 },
    { id: 'assumptions', title: 'Premissas', enabled: true, order: 7 },
    { id: 'exclusions', title: 'Exclusões', enabled: true, order: 8 },
    { id: 'support', title: 'Suporte e SLA', enabled: true, order: 9 }
  ]
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const getSectionPlaceholders = (section) => {
  const placeholders = section?.placeholders;
  if (Array.isArray(placeholders)) {
    return placeholders.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
  }
  if (typeof placeholders === 'string') {
    const v = placeholders.trim();
    return v ? [v] : [];
  }
  return [];
};

const Propostas = () => {
  const [proposals, setProposals] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingProposal, setViewingProposal] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewModalLoading, setViewModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'COMMERCIAL',
    title: '',
    description: '',
    sectionsData: {},
    opportunityId: '',
    templateId: '',
    validUntil: '',
    discount: 0,
    tax: 0,
    items: []
  });



  useEffect(() => {
    fetchProposals();
    fetchOpportunities();
    fetchProducts();
    fetchTemplates();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.proposals, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setProposals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.opportunities, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setOpportunities(Array.isArray(data) ? data.filter(opp => opp.stage !== 'WON' && opp.stage !== 'LOST') : []);
    } catch (error) {
      console.error('Erro ao carregar oportunidades:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.products, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setProducts(Array.isArray(data) ? data.filter(product => product.active) : []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.proposalTemplates, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data.filter(template => template.isActive) : []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedTemplate =
      templates.find((t) => t.id === formData.templateId) ||
      templates.find((t) => t.isDefault && t.type === formData.type) ||
      templates.find((t) => t.type === formData.type) ||
      null;

    const effectiveTemplate =
      selectedTemplate || {
        type: formData.type,
        sections: FALLBACK_TEMPLATE_SECTIONS[formData.type] || FALLBACK_TEMPLATE_SECTIONS.COMMERCIAL
      };

    const enabledSectionIds = new Set(
      (Array.isArray(effectiveTemplate?.sections) ? effectiveTemplate.sections : [])
        .filter((s) => s?.enabled)
        .map((s) => s?.id)
        .filter(Boolean)
    );

    const shouldRequireItems = formData.type === 'COMMERCIAL' || enabledSectionIds.has('items');

    if (!formData.title || !formData.opportunityId) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (shouldRequireItems && formData.items.length === 0) {
      alert('Adicione pelo menos um item na proposta');
      return;
    }

    const hasItems = formData.items.length > 0;

    // Calcular valor total (se houver itens)
    const itemsWithTotal = hasItems
      ? formData.items.map(item => {
          const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
          return { ...item, totalPrice: itemTotal };
        })
      : [];

    const rawSectionsData =
      formData.sectionsData && typeof formData.sectionsData === 'object' && !Array.isArray(formData.sectionsData)
        ? formData.sectionsData
        : {};

    const allowedSectionIds = new Set(
      (Array.isArray(effectiveTemplate?.sections) ? effectiveTemplate.sections : [])
        .map((s) => s?.id)
        .filter(Boolean)
    );

    const filteredSectionsData = Object.fromEntries(
      Object.entries(rawSectionsData).filter(([sectionId]) => allowedSectionIds.has(sectionId))
    );

    try {
      const url = editingProposal 
        ? `${API_ENDPOINTS.proposals}/${editingProposal.id}` 
        : API_ENDPOINTS.proposals;
      const method = editingProposal ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        sectionsData: filteredSectionsData,
        // Evitar lixo quando a proposta nao tem itens
        discount: hasItems ? formData.discount : 0,
        tax: hasItems ? formData.tax : 0,
        items: itemsWithTotal,
      };

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchProposals();
        resetForm();
        alert(editingProposal ? 'Proposta atualizada com sucesso!' : 'Proposta criada com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao salvar proposta');
      }
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      alert('Erro ao salvar proposta');
    }
  };

  const resetForm = () => {
    const type = 'COMMERCIAL';
    const typeTemplates = templates.filter((t) => (t.type || 'COMMERCIAL') === type);
    const defaultTemplate = typeTemplates.find((t) => t.isDefault) || typeTemplates[0];
    setFormData({
      type,
      title: '',
      description: '',
      sectionsData: {},
      opportunityId: '',
      templateId: defaultTemplate ? defaultTemplate.id : '',
      validUntil: '',
      discount: 0,
      tax: 0,
      items: []
    });
    setEditingProposal(null);
    setShowForm(false);
  };

  const handleViewProposal = async (proposal) => {
    // Open immediately (shows loading state), then fetch full details.
    setShowViewModal(true);
    setViewModalLoading(true);
    setViewingProposal(null);

    try {
      const response = await fetch(`${API_ENDPOINTS.proposals}/${proposal.id}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao carregar proposta');
      }

      setViewingProposal(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes da proposta:', error);
      alert(error.message || 'Erro ao carregar proposta');
      setShowViewModal(false);
    } finally {
      setViewModalLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewingProposal(null);
    setShowViewModal(false);
    setViewModalLoading(false);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSendProposal = async (proposalId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.proposals}/${proposalId}/send`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        fetchProposals();
        alert('Proposta enviada com sucesso!');
      } else {
        alert('Erro ao enviar proposta');
      }
    } catch (error) {
      console.error('Erro ao enviar proposta:', error);
      alert('Erro ao enviar proposta');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-500/10 text-slate-700 dark:text-slate-200 border border-slate-500/20',
      SENT: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
      VIEWED: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20',
      ACCEPTED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
      REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20',
      EXPIRED: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20'
    };
    return colors[status] || 'bg-slate-500/10 text-slate-700 dark:text-slate-200 border border-slate-500/20';
  };

  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'Rascunho',
      SENT: 'Enviada',
      VIEWED: 'Visualizada',
      ACCEPTED: 'Aceita',
      REJECTED: 'Rejeitada',
      EXPIRED: 'Expirada'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      DRAFT: Edit,
      SENT: Send,
      VIEWED: Eye,
      ACCEPTED: CheckCircle2,
      REJECTED: XCircle,
      EXPIRED: AlertCircle
    };
    return icons[status] || Edit;
  };

  // Calcular estatísticas
  const stats = {
    total: Array.isArray(proposals) ? proposals.length : 0,
    draft: Array.isArray(proposals) ? proposals.filter(p => p.status === 'DRAFT').length : 0,
    sent: Array.isArray(proposals) ? proposals.filter(p => p.status === 'SENT').length : 0,
    accepted: Array.isArray(proposals) ? proposals.filter(p => p.status === 'ACCEPTED').length : 0,
    totalValue: Array.isArray(proposals) ? proposals.reduce((sum, p) => sum + p.totalValue, 0) : 0
  };

  const SYSTEM_TEMPLATE_SECTION_IDS = new Set([
    'cover',
    'index',
    'company',
    'proposal',
    'items',
    'financial'
  ]);

  const selectedTemplateForForm =
    templates.find((t) => t.id === formData.templateId) ||
    templates.find((t) => t.isDefault && (t.type || 'COMMERCIAL') === formData.type) ||
    templates.find((t) => (t.type || 'COMMERCIAL') === formData.type) ||
    null;

  const templateForForm =
    selectedTemplateForForm || {
      type: formData.type,
      sections: FALLBACK_TEMPLATE_SECTIONS[formData.type] || FALLBACK_TEMPLATE_SECTIONS.COMMERCIAL
    };

  const enabledTemplateSectionsForForm = (Array.isArray(templateForForm?.sections) ? templateForForm.sections : [])
    .filter((s) => s?.enabled)
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

  const enabledSectionIdsForForm = new Set(
    enabledTemplateSectionsForForm.map((s) => s?.id).filter(Boolean)
  );

  const formShowsItems = formData.type === 'COMMERCIAL' || enabledSectionIdsForForm.has('items');

  const extraTemplateSectionsForForm = enabledTemplateSectionsForForm.filter(
    (s) => s?.id && !SYSTEM_TEMPLATE_SECTION_IDS.has(s.id) && getSectionPlaceholders(s).length > 0
  );

  const selectedTemplateForView =
    viewingProposal?.template && Array.isArray(viewingProposal.template.sections)
      ? viewingProposal.template
      : templates.find((t) => t.id === viewingProposal?.templateId) ||
        templates.find((t) => t.isDefault && (t.type || 'COMMERCIAL') === (viewingProposal?.type || 'COMMERCIAL')) ||
        null;

  const viewType = viewingProposal?.type || selectedTemplateForView?.type || 'COMMERCIAL';
  const templateForView =
    selectedTemplateForView || {
      type: viewType,
      sections: FALLBACK_TEMPLATE_SECTIONS[viewType] || FALLBACK_TEMPLATE_SECTIONS.COMMERCIAL
    };

  const enabledTemplateSectionsForView = (Array.isArray(templateForView?.sections) ? templateForView.sections : [])
    .filter((s) => s?.enabled)
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

  const enabledSectionIdsForView = new Set(
    enabledTemplateSectionsForView.map((s) => s?.id).filter(Boolean)
  );

  const viewShowsItems =
    viewType === 'COMMERCIAL' ||
    enabledSectionIdsForView.has('items') ||
    (Array.isArray(viewingProposal?.items) && viewingProposal.items.length > 0);

  const extraTemplateSectionsForView = enabledTemplateSectionsForView.filter(
    (s) => s?.id && !SYSTEM_TEMPLATE_SECTION_IDS.has(s.id) && getSectionPlaceholders(s).length > 0
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Propostas e Cotações"
        subtitle="Gerencie propostas comerciais e cotações para seus clientes"
        icon={FileText}
        gradient="blue"
        breadcrumbs={['Vendas & CRM', 'Propostas']}
        actions={[
          {
            label: 'Gerenciar Templates',
            icon: Settings,
            onClick: () => window.location.href = '/templates-propostas',
            variant: 'secondary'
          },
          {
            label: 'Nova Proposta',
            icon: Plus,
            onClick: () => setShowForm(true),
            variant: 'primary'
          }
        ]}
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <AnimatedStats
          title="Total de Propostas"
          value={stats.total}
          subtitle="Todas as propostas"
          icon={FileText}
          color="blue"
          trend={{ direction: 'up', value: '+12% este mês' }}
        />
        
        <AnimatedStats
          title="Rascunhos"
          value={stats.draft}
          subtitle="Aguardando envio"
          icon={Edit}
          color="gray"
        />
        
        <AnimatedStats
          title="Enviadas"
          value={stats.sent}
          subtitle="Aguardando resposta"
          icon={Send}
          color="yellow"
        />
        
        <AnimatedStats
          title="Aceitas"
          value={stats.accepted}
          subtitle="Taxa de conversão"
          icon={CheckCircle2}
          color="green"
          trend={{ direction: 'up', value: `${stats.total > 0 ? ((stats.accepted / stats.total) * 100).toFixed(1) : 0}%` }}
        />
        
        <AnimatedStats
          title="Valor Total"
          value={`R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Em propostas"
          icon={DollarSign}
          color="green"
          trend={{ direction: 'up', value: '+25% este mês' }}
        />
      </div>

      {/* Filtros */}
      <GradientCard gradient="gray" className="p-6">
	        <div className="flex flex-col sm:flex-row gap-4">
	          <div className="flex-1">
	            <div className="relative">
	              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crm-muted)] w-4 h-4" />
	              <input
	                type="text"
	                placeholder="Buscar por título, empresa ou número..."
	                value={searchTerm}
	                onChange={(e) => setSearchTerm(e.target.value)}
	                className="crm-input pl-10"
	              />
	            </div>
	          </div>
	          <div className="sm:w-48">
	            <select
	              value={statusFilter}
	              onChange={(e) => setStatusFilter(e.target.value)}
	              className="crm-input"
	            >
              <option value="">Todos os Status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="SENT">Enviada</option>
              <option value="VIEWED">Visualizada</option>
              <option value="ACCEPTED">Aceita</option>
              <option value="REJECTED">Rejeitada</option>
              <option value="EXPIRED">Expirada</option>
            </select>
          </div>
        </div>
      </GradientCard>

      {/* Modal de Formulário */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingProposal ? 'Editar Proposta' : 'Nova Proposta'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                className="crm-input"
                placeholder="Ex: Proposta CRM Premium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                Oportunidade *
              </label>
              <select
                value={formData.opportunityId}
                onChange={(e) => setFormData(prev => ({ ...prev, opportunityId: e.target.value }))}
                required
                className="crm-input"
              >
                <option value="">Selecione uma oportunidade</option>
                {opportunities.map(opp => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} - {opp.company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                Tipo de Proposta *
              </label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  const typeTemplates = templates.filter((t) => (t.type || 'COMMERCIAL') === nextType);
                  const defaultTemplate = typeTemplates.find((t) => t.isDefault) || typeTemplates[0];

                  setFormData((prev) => ({
                    ...prev,
                    type: nextType,
                    templateId: defaultTemplate ? defaultTemplate.id : '',
                    sectionsData: {},
                    ...(nextType === 'TECHNICAL' ? { items: [], discount: 0, tax: 0 } : {})
                  }));
                }}
                className="crm-input"
              >
                <option value="COMMERCIAL">Proposta comercial</option>
                <option value="TECHNICAL">Proposta técnica</option>
              </select>
              <p className="text-xs text-[var(--crm-muted)] mt-1">
                Comercial inclui itens/valores. Técnica foca no escopo e detalhes.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                Template
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
                className="crm-input"
              >
                <option value="">Template Padrão</option>
                {templates
                  .filter((template) => (template.type || 'COMMERCIAL') === formData.type)
                  .map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.isDefault ? '(Padrão)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--crm-muted)] mt-1">
                Escolha um template para definir o layout da proposta
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="crm-input"
              placeholder="Descreva os detalhes da proposta..."
            />
          </div>

          <div
            className={[
              'grid grid-cols-1 gap-6',
              formShowsItems ? 'md:grid-cols-3' : 'md:grid-cols-1'
            ].join(' ')}
          >
            <div>
              <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                Válida até
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                className="crm-input"
              />
            </div>

            {formShowsItems && (
              <div>
                <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                  Desconto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                  className="crm-input"
                />
              </div>
            )}

            {formShowsItems && (
              <div>
                <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                  Taxa/Imposto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tax}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                  className="crm-input"
                />
              </div>
            )}
          </div>

          {formShowsItems ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[var(--crm-ink)]">Itens da Proposta *</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="crm-btn crm-btn-secondary"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="crm-panel-muted grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4 p-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[var(--crm-muted)] mb-1">
                      Produto
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const product = products.find(p => p.id === e.target.value);
                        updateItem(index, 'productId', e.target.value);
                        if (product) {
                          updateItem(index, 'unitPrice', product.price);
                        }
                      }}
                      className="crm-input"
                    >
                      <option value="">Selecione um produto</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--crm-muted)] mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="crm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--crm-muted)] mb-1">
                      Preço Unit.
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="crm-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--crm-muted)] mb-1">
                      Desc. (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                      className="crm-input"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="crm-btn crm-btn-danger px-3 py-2"
                  >
                    Remover
                  </button>
                </div>
              ))}

              {formData.items.length === 0 && (
                <div className="crm-panel-muted text-center py-8 px-4 text-[var(--crm-muted)]">
                  <Package className="w-12 h-12 mx-auto mb-2 text-[var(--crm-muted)]" />
                  <p>Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="crm-panel-muted p-4 text-sm text-[var(--crm-muted)]">
              Este tipo/template não inclui itens ou valores.
            </div>
          )}

          {extraTemplateSectionsForForm.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--crm-ink)]">
                Campos do Template
              </h3>

              <div className="space-y-6">
                {extraTemplateSectionsForForm.map((section) => {
                  const placeholders = getSectionPlaceholders(section);
                  const sectionsRoot = isPlainObject(formData.sectionsData) ? formData.sectionsData : {};
                  const rawSectionData = sectionsRoot?.[section.id];
                  const sectionObj = isPlainObject(rawSectionData) ? rawSectionData : null;
                  const legacyText =
                    typeof rawSectionData === 'string'
                      ? rawSectionData
                      : typeof sectionObj?._text === 'string'
                        ? sectionObj._text
                        : '';

                  return (
                    <div key={section.id} className="crm-panel-muted p-4">
                      <h4 className="text-base font-semibold text-[var(--crm-ink)] mb-4">
                        {section.title}
                      </h4>

                      <div className="grid grid-cols-1 gap-4">
                        {placeholders.map((placeholder) => {
                          const rawValue = sectionObj ? sectionObj[placeholder] : '';
                          const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
                          const rows = placeholder.length > 70 ? 4 : 2;

                          return (
                            <div key={placeholder}>
                              <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                                {placeholder}
                              </label>
                              <textarea
                                rows={rows}
                                value={value}
                                onChange={(e) =>
                                  setFormData((prev) => {
                                    const root = isPlainObject(prev.sectionsData) ? prev.sectionsData : {};
                                    const current = root?.[section.id];
                                    const currentObj = isPlainObject(current) ? current : {};
                                    const nextObj = { ...currentObj };

                                    // Se a proposta antiga tinha texto livre por seção, preserva em _text ao migrar.
                                    if (typeof current === 'string' && current.trim() && typeof nextObj._text !== 'string') {
                                      nextObj._text = current;
                                    }

                                    nextObj[placeholder] = e.target.value;
                                    return {
                                      ...prev,
                                      sectionsData: {
                                        ...root,
                                        [section.id]: nextObj
                                      }
                                    };
                                  })
                                }
                                className="crm-input"
                                placeholder="Digite aqui..."
                              />
                            </div>
                          );
                        })}

                        {legacyText && legacyText.trim() && (
                          <div>
                            <label className="block text-sm font-medium text-[var(--crm-muted)] mb-2">
                              Observações (legado)
                            </label>
                            <textarea
                              rows={3}
                              value={legacyText}
                              onChange={(e) =>
                                setFormData((prev) => {
                                  const root = isPlainObject(prev.sectionsData) ? prev.sectionsData : {};
                                  const current = root?.[section.id];
                                  const nextValue = isPlainObject(current)
                                    ? { ...current, _text: e.target.value }
                                    : e.target.value;
                                  return {
                                    ...prev,
                                    sectionsData: { ...root, [section.id]: nextValue }
                                  };
                                })
                              }
                              className="crm-input"
                              placeholder="Texto livre desta seção..."
                            />
                            <p className="text-xs text-[var(--crm-muted)] mt-1">
                              Campo mantido para propostas antigas que tinham texto livre por seção.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t border-[color:var(--crm-border)]">
            <button
              type="button"
              onClick={resetForm}
              className="crm-btn crm-btn-secondary"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="crm-btn crm-btn-primary"
            >
              <FileText className="w-4 h-4" />
              {editingProposal ? 'Atualizar' : 'Criar'} Proposta
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Visualização */}
      <Modal
        isOpen={showViewModal}
        onClose={closeViewModal}
        title={viewType === 'TECHNICAL' ? 'Proposta Técnica' : 'Proposta Comercial'}
      >
        {viewModalLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--crm-accent-rgb))]"></div>
          </div>
        )}

        {!viewModalLoading && viewingProposal && (
          <div className="space-y-6">
            {/* Cabeçalho Profissional da Proposta */}
            <div className="-mx-6 -mt-6">
              <div className="crm-panel-muted overflow-hidden rounded-none">
                {/* Header Superior */}
                <div className="p-6 bg-gradient-to-r from-[rgb(var(--crm-surface-rgb)_/_0.65)] to-[rgb(var(--crm-surface-2-rgb)_/_0.65)]">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-6">
                      {/* Logo da Empresa */}
                      <div className="flex-shrink-0">
                        {viewingProposal?.opportunity?.company?.logo ? (
                          <img
                            src={viewingProposal.opportunity.company.logo}
                            alt={`Logo ${viewingProposal?.opportunity?.company?.name || 'Empresa'}`}
                            className="h-16 w-auto max-w-[200px] object-contain bg-white dark:bg-[#2d4a6f] rounded-lg shadow-sm border border-gray-200 p-2"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`h-16 w-32 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center ${viewingProposal?.opportunity?.company?.logo ? 'hidden' : 'flex'}`}
                        >
                          <Building2 className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      {/* Informações da Proposta */}
                      <div>
                        <h1 className="text-3xl font-bold text-[var(--crm-ink)] mb-2">
                          {viewType === 'TECHNICAL' ? 'PROPOSTA TÉCNICA' : 'PROPOSTA COMERCIAL'}
                        </h1>
                        <h2 className="text-xl font-semibold text-[rgb(var(--crm-accent-rgb))] mb-2">
                          {viewingProposal.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2 text-sm text-[var(--crm-muted)]">
                          <span className="font-medium">Nº {viewingProposal.number}</span>
                          <span className="opacity-60" aria-hidden="true">|</span>
                          <span className="font-medium">Versão {viewingProposal.version}</span>
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingProposal.status)}`}>
                            {getStatusLabel(viewingProposal.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações do Cliente e Data */}
                <div className="px-6 py-4 bg-[rgb(var(--crm-surface-2-rgb)_/_0.55)] border-t border-[color:var(--crm-border)]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-[var(--crm-muted)] uppercase tracking-wide mb-1">Cliente</h3>
                      <p className="text-lg font-semibold text-[var(--crm-ink)]">{viewingProposal?.opportunity?.company?.name || '-'}</p>
                      <p className="text-sm text-[var(--crm-muted)]">{viewingProposal?.opportunity?.company?.document || '-'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[var(--crm-muted)] uppercase tracking-wide mb-1">Data da Proposta</h3>
                      <p className="text-lg font-semibold text-[var(--crm-ink)]">
                        {new Date(viewingProposal.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      {viewingProposal.validUntil && (
                        <p className="text-sm text-[var(--crm-muted)]">
                          Válida até: {new Date(viewingProposal.validUntil).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[var(--crm-muted)] uppercase tracking-wide mb-1">Responsável</h3>
                      <p className="text-lg font-semibold text-[var(--crm-ink)]">{viewingProposal?.opportunity?.owner?.name || '-'}</p>
                      <p className="text-sm text-[var(--crm-muted)]">{viewingProposal?.opportunity?.owner?.email || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Informações da Oportunidade */}
              <div className="crm-panel-muted p-4">
                <h3 className="text-lg font-semibold text-[var(--crm-ink)] mb-3 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-blue-500" />
                  Informações do Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--crm-muted)]">Empresa</label>
                    <p className="text-[var(--crm-ink)] font-medium">{viewingProposal?.opportunity?.company?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--crm-muted)]">Documento</label>
                    <p className="text-[var(--crm-ink)]">{viewingProposal?.opportunity?.company?.document || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--crm-muted)]">Oportunidade</label>
                    <p className="text-[var(--crm-ink)]">{viewingProposal?.opportunity?.title || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--crm-muted)]">Responsável</label>
                    <p className="text-[var(--crm-ink)]">{viewingProposal?.opportunity?.owner?.name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {viewingProposal.description && (
                <div>
                  <h3 className="text-lg font-semibold text-[var(--crm-ink)] mb-2">Descrição</h3>
                  <p className="text-[var(--crm-ink)] bg-black/5 dark:bg-white/5 p-4 rounded-2xl">{viewingProposal.description}</p>
                </div>
              )}

              {/* Seções do Template */}
              {extraTemplateSectionsForView.length > 0 && (
                <div className="space-y-4">
                  {extraTemplateSectionsForView.map((section) => {
                    const placeholders = getSectionPlaceholders(section);
                    const sectionsRoot = isPlainObject(viewingProposal?.sectionsData) ? viewingProposal.sectionsData : {};
                    const rawSectionData = sectionsRoot?.[section.id];
                    const sectionObj = isPlainObject(rawSectionData) ? rawSectionData : null;
                    const legacyText =
                      typeof rawSectionData === 'string'
                        ? rawSectionData
                        : typeof sectionObj?._text === 'string'
                          ? sectionObj._text
                          : '';

                    return (
                      <div key={section.id} className="crm-panel-muted p-4">
                        <h3 className="text-lg font-semibold text-[var(--crm-ink)]">
                          {section.title}
                        </h3>
                        <div className="mt-4 grid grid-cols-1 gap-4">
                          {placeholders.map((placeholder) => {
                            const rawValue = sectionObj ? sectionObj[placeholder] : '';
                            const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
                            const hasValue = value.trim().length > 0;

                            return (
                              <div key={placeholder} className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
                                <div className="text-xs font-semibold text-[var(--crm-muted)] uppercase tracking-wide">
                                  {placeholder}
                                </div>
                                {hasValue ? (
                                  <div className="mt-2 whitespace-pre-wrap leading-relaxed text-[var(--crm-ink)]">
                                    {value}
                                  </div>
                                ) : (
                                  <div className="mt-2 text-sm text-[var(--crm-muted)]">-</div>
                                )}
                              </div>
                            );
                          })}

                          {legacyText && legacyText.trim() && (
                            <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
                              <div className="text-xs font-semibold text-[var(--crm-muted)] uppercase tracking-wide">
                                Observações
                              </div>
                              <div className="mt-2 whitespace-pre-wrap leading-relaxed text-[var(--crm-ink)]">
                                {legacyText}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Itens da Proposta */}
              {viewShowsItems && (
                (Array.isArray(viewingProposal.items) ? viewingProposal.items : []).length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--crm-ink)] mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-green-500" />
                      Itens da Proposta
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[color:var(--crm-border)]">
                        <thead className="bg-black/5 dark:bg-white/5">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--crm-muted)] uppercase tracking-wider">
                              Produto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--crm-muted)] uppercase tracking-wider">
                              Quantidade
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--crm-muted)] uppercase tracking-wider">
                              Preço Unit.
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--crm-muted)] uppercase tracking-wider">
                              Desconto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--crm-muted)] uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[color:var(--crm-border)]">
                          {(Array.isArray(viewingProposal.items) ? viewingProposal.items : []).map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-[var(--crm-ink)]">{item?.product?.name || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-[var(--crm-ink)]">{item.quantity}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-[var(--crm-ink)]">
                                  R$ {(item?.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-[var(--crm-ink)]">{item.discount}%</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-[var(--crm-ink)]">
                                  R$ {(item?.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="crm-panel-muted p-4 text-sm text-[var(--crm-muted)]">
                    Nenhum item cadastrado nesta proposta.
                  </div>
                )
              )}

              {/* Resumo Financeiro */}
              {viewShowsItems && (Array.isArray(viewingProposal.items) ? viewingProposal.items : []).length > 0 && (
                <div className="crm-panel-muted p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
                  <h3 className="text-lg font-semibold text-[var(--crm-ink)] mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                    Resumo Financeiro
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[var(--crm-muted)]">Subtotal:</span>
                        <span className="font-medium text-[var(--crm-ink)]">
                          R$ {(Array.isArray(viewingProposal.items) ? viewingProposal.items : []).reduce((sum, item) => sum + (item?.totalPrice || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {viewingProposal.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Desconto ({viewingProposal.discount}%):</span>
                          <span className="font-medium">
                            - R$ {(((Array.isArray(viewingProposal.items) ? viewingProposal.items : []).reduce((sum, item) => sum + (item?.totalPrice || 0), 0)) * viewingProposal.discount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {viewingProposal.tax > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Impostos ({viewingProposal.tax}%):</span>
                          <span className="font-medium">
                            + R$ {(((Array.isArray(viewingProposal.items) ? viewingProposal.items : []).reduce((sum, item) => sum + (item?.totalPrice || 0), 0)) * (1 - viewingProposal.discount / 100) * viewingProposal.tax / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="md:text-right">
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        Total: R$ {viewingProposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      {viewingProposal.validUntil && (
                        <div className="text-sm text-[var(--crm-muted)] mt-2 flex items-center justify-end">
                          <Calendar className="w-4 h-4 mr-1" />
                          Válida até: {new Date(viewingProposal.validUntil).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-[color:var(--crm-border)]">
                <button
                  onClick={closeViewModal}
                  className="crm-btn crm-btn-secondary"
                >
                  Fechar
                </button>
                
                {viewingProposal.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      handleSendProposal(viewingProposal.id);
                      closeViewModal();
                    }}
                    className="crm-btn crm-btn-primary"
                  >
                    <Send className="w-4 h-4" />
                    Enviar Proposta
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setEditingProposal(viewingProposal);
                    setFormData({
                      type: viewingProposal.type || 'COMMERCIAL',
                      title: viewingProposal.title,
                      description: viewingProposal.description || '',
                      sectionsData:
                        viewingProposal?.sectionsData &&
                        typeof viewingProposal.sectionsData === 'object' &&
                        !Array.isArray(viewingProposal.sectionsData)
                          ? viewingProposal.sectionsData
                          : {},
                      opportunityId: viewingProposal.opportunityId,
                      templateId: viewingProposal.templateId || '',
                      validUntil: viewingProposal.validUntil ? viewingProposal.validUntil.split('T')[0] : '',
                      discount: viewingProposal.discount,
                      tax: viewingProposal.tax,
                      items: (Array.isArray(viewingProposal.items) ? viewingProposal.items : []).map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount
                      }))
                    });
                    closeViewModal();
                    setShowForm(true);
                  }}
                  className="crm-btn crm-btn-secondary"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                
                <button
                  onClick={() => alert(`Download da proposta: ${viewingProposal.number}`)}
                  className="crm-btn crm-btn-secondary"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
	      </Modal>

	      {/* Tabela de Propostas */}
	      <ModernTable
        title="Lista de Propostas"
        data={Array.isArray(proposals) ? proposals.filter(proposal => 
          (!searchTerm || 
           proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           proposal.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
           proposal.opportunity.company.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) &&
          (!statusFilter || proposal.status === statusFilter)
        ) : []}
        columns={[
          {
            key: 'number',
            label: 'Número',
            render: (proposal) => (
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-blue-500 mr-2" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{proposal.number}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">v{proposal.version}</div>
                </div>
              </div>
            )
          },
          {
            key: 'title',
            label: 'Título',
            render: (proposal) => (
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{proposal.title}</div>
                <div className="text-sm text-gray-500 max-w-xs truncate">
                  {proposal.description}
                </div>
              </div>
            )
          },
          {
            key: 'company',
            label: 'Cliente',
            render: (proposal) => (
              <div className="flex items-center">
                <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {proposal.opportunity.company.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {proposal.opportunity.title}
                  </div>
                </div>
              </div>
            )
          },
          {
            key: 'value',
            label: 'Valor',
            render: (proposal) => (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                <div>
                  <div className="font-bold text-green-600">
                    R$ {proposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {proposal.discount > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      Desc: {proposal.discount}%
                    </div>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'status',
            label: 'Status',
            render: (proposal) => {
              const StatusIcon = getStatusIcon(proposal.status);
              return (
                <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(proposal.status)}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {getStatusLabel(proposal.status)}
                </span>
              );
            }
          },
          {
            key: 'validUntil',
            label: 'Válida até',
            render: (proposal) => (
              proposal.validUntil ? (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date(proposal.validUntil).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">-</span>
              )
            )
          },
          {
            key: 'owner',
            label: 'Responsável',
            render: (proposal) => (
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {proposal.opportunity.owner.name}
                </span>
              </div>
            )
          }
        ]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onView={handleViewProposal}
        onEdit={(proposal) => {
          setEditingProposal(proposal);
          setFormData({
            type: proposal.type || 'COMMERCIAL',
            title: proposal.title,
            description: proposal.description || '',
            sectionsData:
              proposal?.sectionsData &&
              typeof proposal.sectionsData === 'object' &&
              !Array.isArray(proposal.sectionsData)
                ? proposal.sectionsData
                : {},
            opportunityId: proposal.opportunityId,
            templateId: proposal.templateId || '',
            validUntil: proposal.validUntil ? proposal.validUntil.split('T')[0] : '',
            discount: proposal.discount,
            tax: proposal.tax,
            items: (Array.isArray(proposal.items) ? proposal.items : []).map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount
            }))
          });
          setShowForm(true);
        }}
        customActions={[
          {
            label: 'Enviar',
            icon: Send,
            onClick: (proposal) => {
              if (proposal.status === 'DRAFT') {
                handleSendProposal(proposal.id);
              } else {
                alert('Apenas propostas em rascunho podem ser enviadas');
              }
            },
            condition: (proposal) => proposal.status === 'DRAFT'
          },
          {
            label: 'Download',
            icon: Download,
            onClick: (proposal) => alert(`Download da proposta: ${proposal.number}`)
          }
        ]}
        emptyState={
          <div>
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma proposta encontrada</h3>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Comece criando sua primeira proposta comercial</p>
          </div>
        }
      />
    </div>
  );
};

export default Propostas;
