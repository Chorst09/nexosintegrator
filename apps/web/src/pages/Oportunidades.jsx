import { useEffect, useRef, useState } from "react";
import { useSearchParams } from 'react-router-dom';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { 
  Plus, 
  Target, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Building,
  User,
  Percent,
  ArrowRight,
  Check,
  X,
  Edit,
  Search,
  BarChart3,
  Filter,
  Trash2
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import GradientCard from '../components/GradientCard';
import Modal from '../components/Modal';
import OpportunityForm from '../components/OpportunityForm';
import {
  isCompanyInClientType,
  isOpportunityInClientType,
  normalizeClientType
} from '../utils/businessModel';

const stages = ["LEAD", "QUALIFICATION", "DIAGNOSIS", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

const stageLabels = {
  LEAD: "Lead",
  QUALIFICATION: "Qualificação",
  DIAGNOSIS: "Diagnóstico",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganhou",
  LOST: "Perdeu"
};

const stageColors = {
  LEAD: "#94a3b8",
  QUALIFICATION: "#60a5fa",
  DIAGNOSIS: "#34d399",
  PROPOSAL: "#fbbf24",
  NEGOTIATION: "#f87171",
  WON: "#10b981",
  LOST: "#6b7280"
};

const projectClientTypeLabels = {
  NEW_CLIENT: "Cliente Novo",
  BASE_CLIENT: "Cliente da Base",
  RENEWAL: "Renovação"
};

export default function Oportunidades() {
  const [opportunities, setOpportunities] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [searchParams] = useSearchParams();
  const requestedClientType = normalizeClientType(searchParams.get('clientType'));
  const pipelineClientType = requestedClientType || 'B2B';
  const pipelineLabel = pipelineClientType === 'B2G' ? 'B2G Governo' : 'B2B Privado';
  const pipelineTitle = pipelineClientType === 'B2G' ? 'Pipeline B2G' : 'Pipeline de Vendas';
  const pipelineSubtitle = pipelineClientType === 'B2G'
    ? 'Edição de oportunidades do funil público sem mistura com o pipeline B2B.'
    : 'Gerencie oportunidades e acompanhe o funil de vendas em tempo real';
  const lastOpenedOpportunityId = useRef(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Verificar se usuário é admin/master
  const currentUserRole = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return String(u?.role || '').toUpperCase();
    } catch { return ''; }
  })();
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'MASTER';
  const scopedClientTypeQuery = `clientType=${encodeURIComponent(pipelineClientType)}`;
  const scopedOpportunitiesUrl = buildApiUrl(`/opportunities?${scopedClientTypeQuery}`);
  const buildScopedOpportunityByIdUrl = (id) =>
    buildApiUrl(`/opportunities/${encodeURIComponent(id)}?${scopedClientTypeQuery}`);
  const scopedCompaniesUrl = buildApiUrl(`/companies?${scopedClientTypeQuery}`);

  const handleDragStart = (e, opportunity) => {
    setDraggedItem(opportunity);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.dataTransfer.setDragImage(e.target, 0, 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, stage) => {
    e.preventDefault();
    if (draggedItem && stage !== 'WON' && stage !== 'LOST') {
      setDragOverColumn(stage);
    }
  };

  const handleDragLeave = (e) => {
    // Só remove o highlight se realmente saiu da coluna
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedItem && draggedItem.stage !== targetStage) {
      // Não permitir mover diretamente para WON ou LOST via drag and drop
      if (targetStage === 'WON' || targetStage === 'LOST') {
        setDraggedItem(null);
        return;
      }
      
      try {
        const response = await fetch(buildScopedOpportunityByIdUrl(draggedItem.id), {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            id: draggedItem.id, 
            stage: targetStage 
          })
        });
        
        if (response.ok) {
          fetchOpportunities();
        }
      } catch (error) {
        console.error('Erro ao mover oportunidade:', error);
      }
    }
    
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverColumn(null);
  };
  
  const [formData, setFormData] = useState({
    title: '',
    projectName: '',
    projectClientType: 'NEW_CLIENT',
    description: '',
    value: '',
    probability: 50,
    stage: 'LEAD',
    source: 'MANUAL',
    expectedCloseDate: '',
    companyId: '',
    ownerId: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch(scopedOpportunitiesUrl, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const opportunitiesArray = Array.isArray(data) ? data : [];
        const filtered = opportunitiesArray.filter((item) =>
          isOpportunityInClientType(item, pipelineClientType, item?.company || null)
        );
        setOpportunities(filtered);
      }
    } catch (error) {
      console.error('Erro ao carregar oportunidades:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [companiesRes, usersRes] = await Promise.all([
        fetch(scopedCompaniesUrl, { headers: getAuthHeaders() }),
        fetch(API_ENDPOINTS.users, { headers: getAuthHeaders() })
      ]);
      
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        const companiesArray = Array.isArray(companiesData) ? companiesData : [];
        setCompanies(companiesArray.filter((item) => isCompanyInClientType(item, pipelineClientType)));
      }
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData.filter(user => user.role === 'SELLER' || user.role === 'ADMIN') : []);
      }
    } catch (error) {
      console.error('Erro ao carregar dependências:', error);
    }
  };

  const buildStats = (data) => {
    const opportunities = Array.isArray(data) ? data : [];
    const total = opportunities.length;
    const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
    const won = opportunities.filter(opp => opp.stage === 'WON').length;
    const wonValue = opportunities.filter(opp => opp.stage === 'WON').reduce((sum, opp) => sum + (opp.value || 0), 0);
    const conversionRate = total > 0 ? (won / total) * 100 : 0;
    const avgValue = total > 0 ? totalValue / total : 0;

    return {
      total,
      totalValue,
      won,
      wonValue,
      conversionRate,
      avgValue
    };
  };

  useEffect(() => {
    fetchOpportunities();
    fetchDependencies();
  }, [pipelineClientType]);

  useEffect(() => {
    const opportunityId = searchParams.get('opportunityId');
    const mode = (searchParams.get('mode') || '').toLowerCase();
    if (!opportunityId) return;
    const requestKey = `${opportunityId}:${mode || 'view'}`;
    if (lastOpenedOpportunityId.current === requestKey) return;

    const openOpportunity = (opp) => {
      if (mode === 'edit') {
        setSelectedOpportunity(opp);
        setFormData({
          title: opp.title,
          projectName: opp.projectName || opp.title || '',
          projectClientType: opp.projectClientType || 'NEW_CLIENT',
          description: opp.description || '',
          value: opp.value?.toString() || '',
          probability: opp.probability || 50,
          stage: opp.stage,
          source: opp.source || 'MANUAL',
          expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '',
          companyId: opp.companyId,
          ownerId: opp.ownerId
        });
        setShowDetailsModal(false);
        setShowModal(true);
      } else {
        setSelectedOpportunity(opp);
        setShowDetailsModal(true);
      }
      lastOpenedOpportunityId.current = requestKey;
    };

    const found = Array.isArray(opportunities)
      ? opportunities.find((opp) => opp.id === opportunityId)
      : null;

    if (found) {
      openOpportunity(found);
      return;
    }

    // Race condition: oportunidade ainda não carregou na lista — busca direto pela API
    if (loading) return; // aguarda o fetch terminar, o useEffect vai re-rodar
    fetch(buildScopedOpportunityByIdUrl(opportunityId), {
      headers: getAuthHeaders()
    })
      .then(r => r.ok ? r.json() : null)
      .then(opp => {
        if (!opp?.id) return;
        setOpportunities(prev => {
          const exists = prev.some(o => o.id === opp.id);
          return exists ? prev : [opp, ...prev];
        });
        openOpportunity(opp);
      })
      .catch(() => {});
  }, [searchParams, opportunities, loading]);

  const moveOpportunity = async (id, stage) => {
    try {
      const response = await fetch(buildScopedOpportunityByIdUrl(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, stage })
      });
      
      if (response.ok) {
        fetchOpportunities();
      }
    } catch (error) {
      console.error('Erro ao mover oportunidade:', error);
    }
  };

  const handleSubmit = async (e, overrideFormData = null) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const payloadFormData = overrideFormData || formData;
    console.log('[handleSubmit] chamado, payloadFormData keys:', Object.keys(payloadFormData));
    console.log('[handleSubmit] selectedOpportunity:', selectedOpportunity?.id);

    const selectedCompany = companies.find((item) => item.id === payloadFormData.companyId);
    if (selectedCompany && !isCompanyInClientType(selectedCompany, pipelineClientType)) {
      alert(`Selecione uma empresa ${pipelineClientType} para este pipeline.`);
      return;
    }
    
    try {
      const url = selectedOpportunity
        ? buildScopedOpportunityByIdUrl(selectedOpportunity.id)
        : scopedOpportunitiesUrl;
      
      const method = selectedOpportunity ? 'PUT' : 'POST';
      
      const parsedValue = parseFloat(payloadFormData.value);
      const parsedProbability = parseInt(payloadFormData.probability);

      // Construir body explicitamente — nunca usar spread para evitar campos inválidos no Prisma
      const body = {
        id: selectedOpportunity?.id,
        title: payloadFormData.title || '',
        projectName: payloadFormData.projectName || payloadFormData.title || '',
        projectClientType: payloadFormData.projectClientType || null,
        description: typeof payloadFormData.description === 'string'
          ? payloadFormData.description
          : (payloadFormData.description ? JSON.stringify(payloadFormData.description) : null),
        value: Number.isFinite(parsedValue) ? parsedValue : 0,
        probability: Number.isFinite(parsedProbability) ? Math.min(100, Math.max(0, parsedProbability)) : 50,
        stage: payloadFormData.stage || 'LEAD',
        source: payloadFormData.source || null,
        expectedCloseDate: (() => {
          const v = payloadFormData.expectedCloseDate || '';
          if (!v) return null;
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : v;
        })(),
        companyId: payloadFormData.companyId || '',
        ownerId: payloadFormData.ownerId || '',
        b2gStage: payloadFormData.b2gStage || null,
        lossReason: payloadFormData.lossReason || null,
      };

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      if (response.ok) {
        fetchOpportunities();
        setShowModal(false);
        resetForm();
        alert(selectedOpportunity ? 'Oportunidade atualizada!' : 'Oportunidade criada!');
      } else {
        let errMsg = 'Erro ao salvar oportunidade';
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch (_) {}
        console.error('[handleSubmit] Erro HTTP', response.status, errMsg);
        alert(`Erro ${response.status}: ${errMsg}`);
      }
    } catch (error) {
      console.error('[handleSubmit] Erro de conexão:', error);
      alert('Erro de conexão: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      projectName: '',
      projectClientType: 'NEW_CLIENT',
      description: '',
      value: '',
      probability: 50,
      stage: 'LEAD',
      source: 'MANUAL',
      expectedCloseDate: '',
      companyId: '',
      ownerId: ''
    });
    setSelectedOpportunity(null);
  };

  const handleEdit = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      projectName: opportunity.projectName || opportunity.title || '',
      projectClientType: opportunity.projectClientType || 'NEW_CLIENT',
      description: opportunity.description || '',
      value: opportunity.value?.toString() || '',
      probability: opportunity.probability || 50,
      stage: opportunity.stage,
      source: opportunity.source || 'MANUAL',
      expectedCloseDate: opportunity.expectedCloseDate ? opportunity.expectedCloseDate.split('T')[0] : '',
      companyId: opportunity.companyId,
      ownerId: opportunity.ownerId
    });
    setShowModal(true);
  };

  const handleDelete = async (opportunity, e) => {
    if (e) e.stopPropagation();
    if (!isAdmin || !opportunity?.id) return;
    if (!window.confirm(`Excluir a oportunidade "${opportunity.title}"?`)) return;
    try {
      const res = await fetch(buildScopedOpportunityByIdUrl(opportunity.id), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setOpportunities(prev => prev.filter(o => o.id !== opportunity.id));
        if (selectedOpportunity?.id === opportunity.id) setShowDetailsModal(false);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d?.error || 'Erro ao excluir oportunidade');
      }
    } catch (err) {
      alert('Erro ao excluir oportunidade');
    }
  };

  const handleViewDetails = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDetailsModal(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getNextStage = (currentStage) => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 3) { // Não avançar para WON ou LOST automaticamente
      return stages[currentIndex + 1];
    }
    return null;
  };

  const getAdvanceLabel = (currentStage) => {
    if (currentStage === 'LEAD') return 'Converter Lead';
    return 'Avançar';
  };

  // Filtrar oportunidades
  const filteredOpportunities = Array.isArray(opportunities) ? opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (opp.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.owner?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = !stageFilter || opp.stage === stageFilter;
    const matchesSeller = !sellerFilter || opp.ownerId === sellerFilter || opp.owner?.id === sellerFilter;
    return matchesSearch && matchesStage && matchesSeller;
  }) : [];

  const filteredStats = buildStats(filteredOpportunities);

  // Calcular totais por etapa (sincronizado com filtros)
  const stageTotals = stages.reduce((acc, stage) => {
    const stageItems = filteredOpportunities.filter(i => i.stage === stage);
    acc[stage] = {
      count: stageItems.length,
      value: stageItems.reduce((sum, item) => sum + (item.value || 0), 0)
    };
    return acc;
  }, {});

  const modalContainerClass = 'rounded-2xl border border-[color:var(--crm-border)] bg-[linear-gradient(155deg,rgb(var(--crm-surface-rgb)_/_0.96)_0%,rgb(var(--crm-surface-rgb)_/_0.88)_58%,rgb(var(--crm-accent-rgb)_/_0.12)_100%)] p-5 md:p-6 shadow-[0_25px_70px_rgba(2,8,23,0.35)]';
  const modalLabelClass = 'block text-sm font-semibold text-[var(--crm-ink)] mb-2';
  const modalInputClass = 'crm-input !px-4 !py-3 text-base';
  const modalActionsClass = 'flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-5 border-t border-[color:var(--crm-border)]';
  const modalCancelButtonClass = 'crm-btn crm-btn-secondary min-w-[130px]';
  const modalSubmitButtonClass = 'crm-btn min-w-[190px] text-white border border-cyan-300/45 bg-[linear-gradient(135deg,#2563eb_0%,#0891b2_100%)] hover:brightness-110 shadow-[0_14px_30px_rgba(37,99,235,0.35)]';

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center px-6">
        <div className="crm-panel px-5 py-4 flex items-center gap-3 motion-safe:animate-scale-in">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(var(--crm-accent-rgb)_/_0.85)] border-t-transparent" />
          <div className="text-sm font-semibold text-[var(--crm-muted)]">Carregando pipeline...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={pipelineTitle}
        subtitle={pipelineSubtitle}
        icon={Target}
        gradient="blue"
        breadcrumbs={['CRM', pipelineLabel, 'Oportunidades']}
        actions={[
          {
            label: 'Nova Oportunidade',
            icon: Plus,
            onClick: () => setShowModal(true),
            variant: 'primary'
          }
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedStats
          title="Total de Oportunidades"
          value={filteredStats.total}
          subtitle="Todas as oportunidades"
          icon={Target}
          color="blue"
          trend={{ direction: 'up', value: '+12% este mês' }}
        />
        
        <AnimatedStats
          title="Valor Total"
          value={formatCurrency(filteredStats.totalValue)}
          subtitle="Pipeline completo"
          icon={DollarSign}
          color="green"
          trend={{ direction: 'up', value: '+18% este mês' }}
        />
        
        <AnimatedStats
          title="Taxa de Conversão"
          value={`${filteredStats.conversionRate.toFixed(1)}%`}
          subtitle={`${filteredStats.won} oportunidades ganhas`}
          icon={TrendingUp}
          color="purple"
          trend={{ direction: 'up', value: '+2.3% este mês' }}
        />
        
        <AnimatedStats
          title="Ticket Médio"
          value={formatCurrency(filteredStats.avgValue)}
          subtitle="Valor médio por oportunidade"
          icon={BarChart3}
          color="orange"
          trend={{ direction: 'up', value: '+8.5% este mês' }}
        />
      </div>

      {/* Filtros */}
      <GradientCard gradient="gray" className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--crm-muted)] w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar oportunidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="crm-input pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--crm-muted)]" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="crm-input w-auto min-w-[220px]"
            >
              <option value="">Todas as etapas</option>
              {stages.map(stage => (
                <option key={stage} value={stage}>{stageLabels[stage]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--crm-muted)]" />
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="crm-input w-auto min-w-[220px]"
            >
              <option value="">Todos os vendedores</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>
      </GradientCard>



      {/* Pipeline Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div
            key={stage}
            className={`min-w-[300px] max-w-[300px] transition-all duration-200 ${dragOverColumn === stage ? 'scale-[1.02]' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className={`rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 h-full transition-all duration-200 ${
              dragOverColumn === stage && stage !== 'WON' && stage !== 'LOST'
                ? 'ring-2 ring-blue-400/60 shadow-lg'
                : ''
            }`}>
              {/* Header da Coluna */}
              <div className="mb-4 pb-3 border-b-2" style={{ borderColor: stageColors[stage] }}>
                <h3 className="text-base font-bold mb-1.5" style={{ color: stageColors[stage] }}>
                  {stageLabels[stage]}
                  {dragOverColumn === stage && stage !== 'WON' && stage !== 'LOST' && (
                    <span className="ml-2 text-blue-400 animate-pulse text-sm">📥</span>
                  )}
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--crm-muted)]">
                    {stageTotals[stage].count} oportunidade{stageTotals[stage].count !== 1 ? 's' : ''}
                  </span>
                  <span className="font-bold text-[var(--crm-ink)]">
                    {formatCurrency(stageTotals[stage].value)}
                  </span>
                </div>
              </div>

              {/* Cards das Oportunidades */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-0.5">
                {filteredOpportunities
                  .filter(opp => opp.stage === stage)
                  .length === 0 ? (
                    <div className={`text-center py-8 text-[var(--crm-muted)] transition-all duration-200 ${
                      dragOverColumn === stage && stage !== 'WON' && stage !== 'LOST'
                        ? 'bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg'
                        : ''
                    }`}>
                      <Target className="w-12 h-12 mx-auto mb-2 text-[var(--crm-muted)] opacity-40" />
                      <p className="text-sm">
                        {dragOverColumn === stage && stage !== 'WON' && stage !== 'LOST'
                          ? 'Solte aqui para mover'
                          : 'Nenhuma oportunidade nesta etapa'
                        }
                      </p>
                    </div>
                  ) : (
                    filteredOpportunities
                      .filter(opp => opp.stage === stage)
                      .map(opp => (
                    <div
                      key={opp.id}
                      draggable={stage !== 'WON' && stage !== 'LOST'}
                      onDragStart={(e) => handleDragStart(e, opp)}
                      onDragEnd={handleDragEnd}
                      className={`group relative rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                        draggedItem?.id === opp.id ? 'opacity-50 rotate-2 scale-95' : ''
                      } ${stage !== 'WON' && stage !== 'LOST' ? 'cursor-move' : 'cursor-pointer'}`}
                      onClick={() => handleViewDetails(opp)}
                    >
                      {/* Drag handle + título + edit */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-1.5 flex-1 min-w-0">
                          {stage !== 'WON' && stage !== 'LOST' && (
                            <span className="text-[var(--crm-muted)] text-xs mt-0.5 shrink-0">⋮⋮</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--crm-ink)] leading-snug line-clamp-2">
                              {opp.company?.name || 'Cliente não informado'}
                            </p>
                            <p className="text-xs text-[var(--crm-muted)] mt-0.5 line-clamp-1">
                              Projeto: {opp.projectName || opp.title || 'Não informado'}
                            </p>
                            {opp.projectName && opp.title && opp.title !== opp.projectName && (
                              <p className="text-xs text-[var(--crm-muted)] mt-0.5 line-clamp-1">
                                Oportunidade: {opp.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(opp); }}
                          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-lg text-[var(--crm-muted)] hover:text-[var(--crm-accent)] hover:bg-[var(--crm-bg)] transition-all"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Valor */}
                      <p className="text-base font-extrabold text-emerald-400 mb-3">
                        {formatCurrency(opp.value)}
                      </p>

                      {/* Infos */}
                      <div className="space-y-1.5 mb-3">
                        {opp.projectClientType && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--crm-muted)]">
                            <BarChart3 className="w-3 h-3 shrink-0" />
                            <span>{projectClientTypeLabels[opp.projectClientType] || opp.projectClientType}</span>
                          </div>
                        )}
                        {opp.owner && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--crm-muted)]">
                            <User className="w-3 h-3 shrink-0" />
                            <span>{opp.owner.name}</span>
                          </div>
                        )}
                        {opp.probability > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--crm-muted)]">
                            <Percent className="w-3 h-3 shrink-0" />
                            <span>{opp.probability}% de chance</span>
                          </div>
                        )}
                        {opp.expectedCloseDate && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--crm-muted)]">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{new Date(opp.expectedCloseDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                      </div>

                      {/* Botões de ação */}
                      {stage !== 'WON' && stage !== 'LOST' && (
                        <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--crm-border)]">
                          {getNextStage(stage) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveOpportunity(opp.id, getNextStage(stage)); }}
                              className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                            >
                              {getAdvanceLabel(stage)} <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); moveOpportunity(opp.id, 'WON'); }}
                            className="flex items-center justify-center rounded-xl bg-emerald-600 p-1.5 text-white hover:bg-emerald-500 transition-colors"
                            title="Marcar como Ganha"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveOpportunity(opp.id, 'LOST'); }}
                            className="flex items-center justify-center rounded-xl bg-red-600 p-1.5 text-white hover:bg-red-500 transition-colors"
                            title="Marcar como Perdida"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDelete(opp, e)}
                              className="flex items-center justify-center rounded-xl border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Formulário */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); resetForm(); }}
          title={selectedOpportunity ? 'Editar Oportunidade' : 'Nova Oportunidade'}
          size="large"
        >
          <OpportunityForm
            formData={formData}
            setFormData={setFormData}
            selectedOpportunity={selectedOpportunity}
            companies={companies}
            users={users}
            stages={stages}
            stageLabels={stageLabels}
            modalInputClass={modalInputClass}
            modalLabelClass={modalLabelClass}
            modalContainerClass={modalContainerClass}
            modalActionsClass={modalActionsClass}
            modalCancelButtonClass={modalCancelButtonClass}
            modalSubmitButtonClass={modalSubmitButtonClass}
            onCancel={() => { setShowModal(false); resetForm(); }}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedOpportunity && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOpportunity(null);
          }}
          title={selectedOpportunity.title}
          size="large"
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-[color:var(--crm-border)] bg-[linear-gradient(155deg,rgb(var(--crm-surface-rgb)_/_0.95)_0%,rgb(var(--crm-surface-rgb)_/_0.86)_60%,rgb(var(--crm-accent-rgb)_/_0.1)_100%)] p-5 md:p-6 shadow-[0_24px_65px_rgba(2,8,23,0.35)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-2xl border border-emerald-300/35 bg-[linear-gradient(140deg,rgba(16,185,129,0.2),rgba(5,46,22,0.5))] p-5">
                  <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-emerald-100/90">Valor da Oportunidade</h3>
                  <p className="mt-2 text-3xl font-bold text-emerald-200">
                    {formatCurrency(selectedOpportunity.value)}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-300/35 bg-[linear-gradient(140deg,rgba(14,116,144,0.28),rgba(30,58,138,0.45))] p-5">
                  <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-cyan-100/90">Etapa Atual</h3>
                  <div className="mt-3">
                    <span
                      className="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full"
                      style={{
                        backgroundColor: stageColors[selectedOpportunity.stage],
                        color: selectedOpportunity.stage === 'PROPOSAL' ? '#0f172a' : '#f8fafc'
                      }}
                    >
                      {stageLabels[selectedOpportunity.stage]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="crm-panel-muted rounded-xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Projeto</h3>
                  <span className="text-[var(--crm-ink)] font-medium">{selectedOpportunity.projectName || 'Não informado'}</span>
                </div>

                <div className="crm-panel-muted rounded-xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Tipo de Projeto</h3>
                  <span className="text-[var(--crm-ink)] font-medium">
                    {projectClientTypeLabels[selectedOpportunity.projectClientType] || selectedOpportunity.projectClientType || 'Não informado'}
                  </span>
                </div>

                <div className="crm-panel-muted rounded-xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Empresa</h3>
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-[rgb(var(--crm-accent-rgb))] mr-2" />
                    <span className="text-[var(--crm-ink)] font-medium">{selectedOpportunity.company?.name || 'Não informado'}</span>
                  </div>
                </div>

                <div className="crm-panel-muted rounded-xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Responsável</h3>
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-[rgb(var(--crm-accent-rgb))] mr-2" />
                    <span className="text-[var(--crm-ink)] font-medium">{selectedOpportunity.owner?.name || 'Não informado'}</span>
                  </div>
                </div>

                <div className="crm-panel-muted rounded-xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Probabilidade</h3>
                  <div className="flex items-center">
                    <Percent className="w-4 h-4 text-[rgb(var(--crm-accent-rgb))] mr-2" />
                    <span className="text-[var(--crm-ink)] font-medium">{selectedOpportunity.probability}%</span>
                  </div>
                </div>

                {selectedOpportunity.source && (
                  <div className="crm-panel-muted rounded-xl p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Origem</h3>
                    <span className="text-[var(--crm-ink)] font-medium">{selectedOpportunity.source}</span>
                  </div>
                )}

                {selectedOpportunity.expectedCloseDate && (
                  <div className="crm-panel-muted rounded-xl p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Data Prevista</h3>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-[rgb(var(--crm-accent-rgb))] mr-2" />
                      <span className="text-[var(--crm-ink)] font-medium">
                        {new Date(selectedOpportunity.expectedCloseDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                )}

                {selectedOpportunity.actualCloseDate && (
                  <div className="crm-panel-muted rounded-xl p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--crm-muted-rgb)_/_0.9)] mb-2">Data de Fechamento</h3>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-[rgb(var(--crm-accent-rgb))] mr-2" />
                      <span className="text-[var(--crm-ink)] font-medium">
                        {new Date(selectedOpportunity.actualCloseDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedOpportunity.description && (
              <div className="rounded-xl border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-rgb)_/_0.7)] p-5">
                <h3 className="text-lg font-semibold text-[var(--crm-ink)] mb-2">Descrição</h3>
                <p className="text-[var(--crm-muted)] leading-relaxed whitespace-pre-wrap">{selectedOpportunity.description}</p>
              </div>
            )}

            {selectedOpportunity.lossReason && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4">
                <h3 className="text-sm font-semibold text-red-200 mb-2">Motivo da Perda</h3>
                <p className="text-red-100/90">{selectedOpportunity.lossReason}</p>
              </div>
            )}

            {selectedOpportunity.activities && selectedOpportunity.activities.length > 0 && (
              <div className="rounded-xl border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-rgb)_/_0.65)] p-5">
                <h3 className="text-lg font-semibold text-[var(--crm-ink)] mb-4">Atividades Recentes</h3>
                <div className="space-y-3">
                  {selectedOpportunity.activities.slice(0, 5).map(activity => (
                    <div key={activity.id} className="crm-panel-muted rounded-xl p-3">
                      <div className="font-medium text-[var(--crm-ink)]">{activity.subject}</div>
                      <div className="text-sm text-[var(--crm-muted)] mt-1">
                        {activity.assignedTo?.name} - {new Date(activity.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={modalActionsClass}>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOpportunity(null);
                }}
                className={modalCancelButtonClass}
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  handleEdit(selectedOpportunity);
                  setShowDetailsModal(false);
                }}
                className={modalSubmitButtonClass}
              >
                <Edit className="w-4 h-4" />
                Editar Oportunidade
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
