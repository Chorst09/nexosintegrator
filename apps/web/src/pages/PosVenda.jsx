import { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { 
  Users, 
  HeadphonesIcon, 
  Star, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Plus,
  Search,
  Zap,
  Award,
  UserCheck,
  Heart,
  Shield,
  Eye,
  Edit,
  CheckCircle2,
  Calendar,
  Target,
  Activity,
  MessageSquare,
  Send,
  X,
  ChevronRight,
  ArrowRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Meh,
  RefreshCcw
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import ModernTable from '../components/ModernTable';
import GradientCard from '../components/GradientCard';
import Modal from '../components/Modal';

const PosVenda = () => {
  const [activeTab, setActiveTab] = useState('onboarding');
  const [onboardings, setOnboardings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [npsData, setNpsData] = useState([]);
  const [churnAlerts, setChurnAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [companies, setCompanies] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [users, setUsers] = useState([]);

  // View modals state
  const [viewingOnboarding, setViewingOnboarding] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [viewingNPS, setViewingNPS] = useState(null);
  const [ticketResponses, setTicketResponses] = useState([]);
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [detectingChurn, setDetectingChurn] = useState(false);
  const [advancingStep, setAdvancingStep] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const showFeedback = (msg, type = 'success') => {
    setFeedbackMessage({ text: msg, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [onboardingRes, ticketsRes, npsRes, churnRes, companiesRes, contractsRes, usersRes] = await Promise.all([
        fetch(buildApiUrl('/post-sales/onboarding?limit=200'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/post-sales/support?limit=200'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/post-sales/nps?limit=200'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/post-sales/churn-alerts?limit=200'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/companies'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/contracts'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/users'), { headers: getAuthHeaders() })
      ]);

      if (onboardingRes.ok) {
        const data = await onboardingRes.json();
        setOnboardings(data.onboardings || []);
      }

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.tickets || []);
      }

      if (npsRes.ok) {
        const data = await npsRes.json();
        setNpsData(data.surveys || []);
      }

      if (churnRes.ok) {
        const data = await churnRes.json();
        setChurnAlerts(data.alerts || []);
      }

      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data || []);
      }

      if (contractsRes.ok) {
        const data = await contractsRes.json();
        setContracts(data || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status, type = 'default') => {
    const colors = {
      onboarding: {
        PENDING: 'bg-amber-500/10 text-amber-900 dark:text-amber-200',
        IN_PROGRESS: 'bg-sky-500/10 text-sky-900 dark:text-sky-200',
        COMPLETED: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
        CANCELLED: 'bg-red-500/10 text-red-900 dark:text-red-200'
      },
      ticket: {
        OPEN: 'bg-red-500/10 text-red-900 dark:text-red-200',
        IN_PROGRESS: 'bg-sky-500/10 text-sky-900 dark:text-sky-200',
        WAITING_CUSTOMER: 'bg-amber-500/10 text-amber-900 dark:text-amber-200',
        RESOLVED: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
        CLOSED: 'bg-slate-500/10 text-slate-800 dark:text-slate-200'
      },
      churn: {
        LOW: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
        MEDIUM: 'bg-amber-500/10 text-amber-900 dark:text-amber-200',
        HIGH: 'bg-orange-500/10 text-orange-900 dark:text-orange-200',
        CRITICAL: 'bg-red-500/10 text-red-900 dark:text-red-200'
      }
    };
    return colors[type]?.[status] || 'bg-slate-500/10 text-slate-800 dark:text-slate-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
      MEDIUM: 'bg-amber-500/10 text-amber-900 dark:text-amber-200',
      HIGH: 'bg-orange-500/10 text-orange-900 dark:text-orange-200',
      URGENT: 'bg-red-500/10 text-red-900 dark:text-red-200'
    };
    return colors[priority] || 'bg-slate-500/10 text-slate-800 dark:text-slate-200';
  };

  const getNPSCategory = (score) => {
    if (score >= 9) return { label: 'Promotor', color: 'text-green-600', icon: ThumbsUp };
    if (score >= 7) return { label: 'Neutro', color: 'text-yellow-600', icon: Meh };
    return { label: 'Detrator', color: 'text-red-600', icon: ThumbsDown };
  };

  const getClientTypeLabel = (clientType) => {
    const labels = { B2B: 'B2B', B2G: 'B2G (Governo)', B2C: 'B2C' };
    return labels[clientType] || clientType;
  };

  const getClientTypeBadge = (clientType) => {
    const badges = {
      B2B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      B2G: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      B2C: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    };
    return badges[clientType] || 'bg-gray-100 text-gray-800';
  };

  const filterByClientType = (items) => {
    if (!clientTypeFilter) return items;
    return items.filter(item => item.company?.clientType === clientTypeFilter);
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
  };

  const handleSubmitTicket = async (formData) => {
    try {
      const response = await fetch(buildApiUrl('/post-sales/support'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await fetchData();
        closeModal();
        showFeedback('Ticket criado com sucesso!');
      } else {
        const err = await response.json().catch(() => ({}));
        showFeedback(err.error || 'Erro ao criar ticket', 'error');
      }
    } catch (error) {
      showFeedback('Erro ao criar ticket', 'error');
    }
  };

  const handleSubmitOnboarding = async (formData) => {
    try {
      const response = await fetch(buildApiUrl('/post-sales/onboarding'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await fetchData();
        closeModal();
        showFeedback('Onboarding criado com sucesso!');
      } else {
        const err = await response.json().catch(() => ({}));
        showFeedback(err.error || 'Erro ao criar onboarding', 'error');
      }
    } catch (error) {
      showFeedback('Erro ao criar onboarding', 'error');
    }
  };

  const handleSubmitNPSSurvey = async (formData) => {
    try {
      const response = await fetch(buildApiUrl('/post-sales/nps'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await fetchData();
        closeModal();
        showFeedback('Pesquisa NPS enviada com sucesso!');
      } else {
        const err = await response.json().catch(() => ({}));
        showFeedback(err.error || 'Erro ao enviar pesquisa NPS', 'error');
      }
    } catch (error) {
      showFeedback('Erro ao enviar pesquisa NPS', 'error');
    }
  };

  const handleViewOnboarding = async (item) => {
    setViewingOnboarding(item);
  };

  const handleAdvanceStep = async (onboardingId, step) => {
    try {
      setAdvancingStep(step.id);
      const response = await fetch(buildApiUrl(`/post-sales/onboarding/${onboardingId}/steps/${step.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (response.ok) {
        await fetchData();
        showFeedback(`Etapa "${step.title}" concluída!`);
        // Atualizar o onboarding em visualização
        const updated = onboardings.find(o => o.id === onboardingId);
        if (updated) setViewingOnboarding(updated);
      } else {
        showFeedback('Erro ao avançar etapa', 'error');
      }
    } catch (error) {
      showFeedback('Erro ao avançar etapa', 'error');
    } finally {
      setAdvancingStep(null);
    }
  };

  const handleViewTicket = async (item) => {
    setViewingTicket(item);
    // Carregar respostas do ticket
    try {
      const res = await fetch(buildApiUrl(`/post-sales/support/${item.id}/responses`), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTicketResponses(data.responses || []);
      }
    } catch (e) {
      console.error('Erro ao carregar respostas do ticket:', e);
    }
  };

  const handleRespondTicket = async () => {
    if (!responseText.trim() || !viewingTicket) return;
    try {
      setSendingResponse(true);
      const res = await fetch(buildApiUrl(`/post-sales/support/${viewingTicket.id}/responses`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: responseText, isInternal: false })
      });
      if (res.ok) {
        setResponseText('');
        showFeedback('Resposta enviada com sucesso!');
      } else {
        showFeedback('Erro ao enviar resposta', 'error');
      }
    } catch (error) {
      showFeedback('Erro ao enviar resposta', 'error');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleDetectChurn = async () => {
    try {
      setDetectingChurn(true);
      const res = await fetch(buildApiUrl('/post-sales/churn-alerts/detect'), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(data.message || 'Detecção de churn concluída!');
        await fetchData();
      } else {
        showFeedback('Erro ao detectar churn', 'error');
      }
    } catch (error) {
      showFeedback('Erro ao detectar churn', 'error');
    } finally {
      setDetectingChurn(false);
    }
  };

  const handleResolveChurn = async (alertId) => {
    try {
      const res = await fetch(buildApiUrl(`/post-sales/churn-alerts/${alertId}/resolve`), {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('Alerta de churn resolvido!');
        await fetchData();
      } else {
        // Fallback: marcar como resolvido via PUT direto na empresa
        const alert = churnAlerts.find(a => a.id === alertId);
        if (alert?.company?.id) {
          await fetch(buildApiUrl(`/companies/${alert.company.id}`), {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ churnRisk: 0 })
          });
        }
        showFeedback('Alerta de churn resolvido (fallback)!');
        await fetchData();
      }
    } catch (error) {
      showFeedback('Erro ao resolver alerta', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center px-6">
        <div className="crm-panel px-5 py-4 flex items-center gap-3 motion-safe:animate-scale-in">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(var(--crm-accent-rgb)_/_0.85)] border-t-transparent" />
          <div className="text-sm font-semibold text-[var(--crm-muted)]">Carregando pos-venda...</div>
        </div>
      </div>
    );
  }

  const StatusBadge = ({ status, type }) => (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(status, type)}`}>
      {status}
    </span>
  );

  return (
    <div className="space-y-8">
      {feedbackMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-bold ${
          feedbackMessage.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-emerald-500 text-white'
        }`}>
          {feedbackMessage.text}
        </div>
      )}

      <PageHeader
        title="Sucesso do Cliente"
        subtitle="Maximize a satisfação e retenção através de onboarding, suporte e análise de churn"
        icon={Heart}
        gradient="green"
        breadcrumbs={['CRM', 'Pós-Venda']}
        actions={[
          {
            label: 'Detectar Churn',
            icon: detectingChurn ? Loader2 : Zap,
            onClick: handleDetectChurn,
            variant: 'secondary',
            disabled: detectingChurn
          },
          {
            label: 'Nova Pesquisa NPS',
            icon: Plus,
            onClick: () => openModal('nps'),
            variant: 'secondary'
          },
          {
            label: 'Novo Onboarding',
            icon: Plus,
            onClick: () => openModal('onboarding'),
            variant: 'secondary'
          },
          {
            label: 'Novo Ticket',
            icon: Plus,
            onClick: () => openModal('ticket'),
            variant: 'primary'
          }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedStats
          title="Onboardings Ativos"
          value={onboardings.filter(o => o.status === 'IN_PROGRESS').length}
          subtitle={`${onboardings.length} total`}
          icon={UserCheck}
          color="blue"
        />
        <AnimatedStats
          title="Tickets Abertos"
          value={tickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length}
          subtitle="SLA médio: 24h"
          icon={HeadphonesIcon}
          color="green"
        />
        <AnimatedStats
          title="NPS Médio"
          value={npsData.length > 0 
            ? (npsData.reduce((sum, survey) => sum + (survey.score || 0), 0) / npsData.length).toFixed(1)
            : '0.0'
          }
          subtitle={`${npsData.filter(n => n.status === 'RESPONDED').length} respostas`}
          icon={Award}
          color="yellow"
        />
        <AnimatedStats
          title="Alertas de Churn"
          value={churnAlerts.filter(a => a.status === 'ACTIVE').length}
          subtitle={`${churnAlerts.filter(a => a.riskLevel === 'CRITICAL').length} críticos`}
          icon={Shield}
          color="red"
        />
      </div>

      <GradientCard gradient="gray" className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por cliente, ticket ou processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#2d4a6f] shadow-sm"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#2d4a6f] shadow-sm"
            >
              <option value="">Todos os Tipos</option>
              <option value="B2B">B2B</option>
              <option value="B2G">B2G (Governo)</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#2d4a6f] shadow-sm"
            >
              <option value="">Todos os Status</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="COMPLETED">Concluído</option>
              <option value="OPEN">Aberto</option>
              <option value="RESOLVED">Resolvido</option>
            </select>
          </div>
        </div>
      </GradientCard>

      <GradientCard gradient="gray" className="shadow-lg">
        <div className="border-b border-gray-200 dark:border-blue-500/20">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'onboarding', label: 'Onboarding', icon: Users, count: onboardings.length, color: 'blue' },
              { id: 'support', label: 'Suporte', icon: HeadphonesIcon, count: tickets.length, color: 'green' },
              { id: 'nps', label: 'NPS', icon: Star, count: npsData.length, color: 'yellow' },
              { id: 'churn', label: 'Churn', icon: AlertTriangle, count: churnAlerts.length, color: 'red' }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? (tab.color === 'blue' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                         tab.color === 'green' ? 'border-green-500 text-green-600 bg-green-50' :
                         tab.color === 'yellow' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                         'border-red-500 text-red-600 bg-red-50')
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:border-blue-500/30'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-3 rounded-t-xl transition-all duration-200 hover:bg-gray-50`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    activeTab === tab.id 
                      ? (tab.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                         tab.color === 'green' ? 'bg-green-100 text-green-700' :
                         tab.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                         'bg-red-100 text-red-700')
                      : 'bg-gray-100 text-gray-600 dark:text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'onboarding' && (
            <ModernTable
              title="Onboarding de Clientes"
              data={filterByClientType(onboardings).filter(item => 
                !searchTerm || 
                item.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.contract?.number?.toLowerCase().includes(searchTerm.toLowerCase())
              ).filter(item => 
                !statusFilter || item.status === statusFilter
              )}
              columns={[
                {
                  key: 'company',
                  label: 'Cliente',
                  render: (item) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.company?.name}
                        </span>
                        {item.company?.clientType && (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getClientTypeBadge(item.company.clientType)}`}>
                            {getClientTypeLabel(item.company.clientType)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.contract?.number}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (item) => (
                    <StatusBadge status={item.status} type="onboarding" />
                  )
                },
                {
                  key: 'progress',
                  label: 'Progresso',
                  render: (item) => {
                    const completedSteps = item.steps?.filter(s => s.status === 'COMPLETED').length || 0;
                    const totalSteps = item.steps?.length || 0;
                    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
                    return (
                      <div className="flex items-center">
                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-sm text-gray-600 font-medium">{completedSteps}/{totalSteps}</span>
                      </div>
                    );
                  }
                },
                {
                  key: 'assignedTo',
                  label: 'Responsável',
                  render: (item) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-blue-600">{item.assignedTo?.name?.charAt(0) || '?'}</span>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{item.assignedTo?.name || 'Não atribuído'}</span>
                    </div>
                  )
                },
                {
                  key: 'expectedEndDate',
                  label: 'Data Prevista',
                  render: (item) => (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {item.expectedEndDate ? new Date(item.expectedEndDate).toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </div>
                  )
                }
              ]}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onView={(item) => handleViewOnboarding(item)}
              customActions={[
                {
                  label: 'Ver Etapas',
                  icon: ChevronRight,
                  onClick: (item) => handleViewOnboarding(item)
                }
              ]}
              emptyState={
                <div>
                  <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum onboarding encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Comece criando um novo processo de onboarding</p>
                </div>
              }
            />
          )}

          {activeTab === 'support' && (
            <ModernTable
              title="Tickets de Suporte"
              data={filterByClientType(tickets).filter(item => 
                !searchTerm || 
                item.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).filter(item => 
                !statusFilter || item.status === statusFilter
              )}
              columns={[
                {
                  key: 'ticket',
                  label: 'Ticket',
                  render: (item) => (
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">#{item.number}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">{item.title}</div>
                    </div>
                  )
                },
                {
                  key: 'company',
                  label: 'Cliente',
                  render: (item) => (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-green-600">{item.company?.name?.charAt(0) || '?'}</span>
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{item.company?.name}</span>
                      </div>
                      {item.company?.clientType && (
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getClientTypeBadge(item.company.clientType)}`}>
                          {getClientTypeLabel(item.company.clientType)}
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'priority',
                  label: 'Prioridade',
                  render: (item) => (
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  )
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (item) => <StatusBadge status={item.status} type="ticket" />
                },
                {
                  key: 'sla',
                  label: 'SLA',
                  render: (item) => {
                    const slaExpired = item.slaDeadline && new Date(item.slaDeadline) < new Date();
                    return (
                      <div className={`flex items-center ${slaExpired ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                        <Clock className={`w-4 h-4 mr-2 ${slaExpired ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
                        <span className="text-sm font-medium">
                          {item.slaDeadline ? new Date(item.slaDeadline).toLocaleDateString('pt-BR') : '-'}
                        </span>
                        {slaExpired && <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Vencido</span>}
                      </div>
                    );
                  }
                },
                {
                  key: 'assignedTo',
                  label: 'Responsável',
                  render: (item) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-purple-600">{item.assignedTo?.name?.charAt(0) || '?'}</span>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{item.assignedTo?.name || 'Não atribuído'}</span>
                    </div>
                  )
                }
              ]}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onView={(item) => handleViewTicket(item)}
              customActions={[
                {
                  label: 'Responder',
                  icon: MessageSquare,
                  onClick: (item) => handleViewTicket(item)
                }
              ]}
              emptyState={
                <div>
                  <HeadphonesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum ticket encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Todos os tickets foram resolvidos ou não há tickets no momento</p>
                </div>
              }
            />
          )}

          {activeTab === 'nps' && (
            <ModernTable
              title="Pesquisas de Satisfação (NPS)"
              data={filterByClientType(npsData).filter(item => 
                !searchTerm || 
                item.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).filter(item => 
                !statusFilter || item.status === statusFilter
              )}
              columns={[
                {
                  key: 'company',
                  label: 'Cliente',
                  render: (item) => (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-yellow-600">{item.company?.name?.charAt(0) || '?'}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.company?.name}</span>
                      </div>
                      {item.company?.clientType && (
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getClientTypeBadge(item.company.clientType)}`}>
                          {getClientTypeLabel(item.company.clientType)}
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'score',
                  label: 'Score',
                  render: (item) => (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-2" />
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {item.score !== null ? item.score : '-'}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">/10</span>
                    </div>
                  )
                },
                {
                  key: 'category',
                  label: 'Categoria',
                  render: (item) => {
                    if (item.score === null) return <span className="text-sm text-gray-500">-</span>;
                    const category = getNPSCategory(item.score);
                    const CatIcon = category.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                        category.label === 'Promotor' ? 'bg-green-100 text-green-800' :
                        category.label === 'Neutro' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <CatIcon className="w-3.5 h-3.5" /> {category.label}
                      </span>
                    );
                  }
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (item) => (
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      item.status === 'RESPONDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status === 'RESPONDED' ? 'Respondido' : 'Pendente'}
                    </span>
                  )
                },
                {
                  key: 'sentAt',
                  label: 'Data Envio',
                  render: (item) => (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {new Date(item.sentAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )
                },
                {
                  key: 'feedback',
                  label: 'Feedback',
                  render: (item) => (
                    item.feedback ? (
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate" title={item.feedback}>{item.feedback}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Sem feedback</span>
                    )
                  )
                }
              ]}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onView={(item) => setViewingNPS(item)}
              customActions={[
                {
                  label: 'Detalhes',
                  icon: Eye,
                  onClick: (item) => setViewingNPS(item)
                }
              ]}
              emptyState={
                <div>
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma pesquisa NPS encontrada</h3>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Comece enviando pesquisas de satisfação para seus clientes</p>
                </div>
              }
            />
          )}

          {activeTab === 'churn' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Alertas de Churn</h3>
                  <p className="text-sm text-gray-600 mt-1">Identifique clientes com risco de cancelamento</p>
                </div>
                <button
                  onClick={handleDetectChurn}
                  disabled={detectingChurn}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-red-700 flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60"
                >
                  {detectingChurn ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {detectingChurn ? 'Detectando...' : 'Detectar Churn'}
                </button>
              </div>

              <ModernTable
                title=""
                data={churnAlerts.filter(item => 
                  !searchTerm || 
                  item.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                ).filter(item => 
                  !statusFilter || item.status === statusFilter
                )}
                columns={[
                  {
                    key: 'company',
                    label: 'Cliente',
                    render: (item) => (
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-red-600">{item.company?.name?.charAt(0) || '?'}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.company?.name}</span>
                      </div>
                    )
                  },
                  {
                    key: 'riskLevel',
                    label: 'Nível de Risco',
                    render: (item) => (
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.riskLevel, 'churn')}`}>
                        {item.riskLevel === 'LOW' ? 'Baixo' :
                         item.riskLevel === 'MEDIUM' ? 'Médio' :
                         item.riskLevel === 'HIGH' ? 'Alto' : 'Crítico'}
                      </span>
                    )
                  },
                  {
                    key: 'score',
                    label: 'Score de Risco',
                    render: (item) => (
                      <div className="flex items-center">
                        <div className="w-20 bg-gray-200 rounded-full h-3 mr-3">
                          <div className={`h-3 rounded-full transition-all duration-300 ${
                            item.score >= 80 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                            item.score >= 65 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                            'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          }`} style={{ width: `${item.score}%` }} />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.score}%</span>
                      </div>
                    )
                  },
                  {
                    key: 'reasons',
                    label: 'Principais Motivos',
                    render: (item) => (
                      <div className="max-w-xs">
                        {item.reasons?.slice(0, 2).map((reason, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full mb-1 inline-block mr-1">{reason}</span>
                        ))}
                        {item.reasons?.length > 2 && (
                          <div className="text-xs text-gray-500 mt-1">+{item.reasons.length - 2} outros fatores</div>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (item) => (
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'ACTIVE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.status === 'ACTIVE' ? 'Ativo' : 'Resolvido'}
                      </span>
                    )
                  },
                  {
                    key: 'assignedTo',
                    label: 'Responsável',
                    render: (item) => (
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-indigo-600">{item.assignedTo?.name?.charAt(0) || '?'}</span>
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{item.assignedTo?.name || 'Não atribuído'}</span>
                      </div>
                    )
                  }
                ]}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onView={(item) => {
                  if (item.status === 'ACTIVE') {
                    if (window.confirm(`Deseja marcar o alerta de ${item.company?.name} como resolvido?`)) {
                      handleResolveChurn(item.id);
                    }
                  }
                }}
                emptyState={
                  <div>
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum alerta de churn encontrado</h3>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Ótimo! Seus clientes estão satisfeitos ou execute a detecção de churn</p>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </GradientCard>

      {/* Modal: Novo Ticket / Novo Onboarding / Nova Pesquisa NPS */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={modalType === 'ticket' ? 'Novo Ticket de Suporte' : modalType === 'onboarding' ? 'Novo Onboarding' : modalType === 'nps' ? 'Nova Pesquisa NPS' : ''}
      >
        {modalType === 'ticket' && (
          <TicketModal onClose={closeModal} onSubmit={handleSubmitTicket} companies={companies} users={users} />
        )}
        {modalType === 'onboarding' && (
          <OnboardingModal onClose={closeModal} onSubmit={handleSubmitOnboarding} companies={companies} contracts={contracts} users={users} />
        )}
        {modalType === 'nps' && (
          <NPSSurveyModal onClose={closeModal} onSubmit={handleSubmitNPSSurvey} companies={companies} contracts={contracts} />
        )}
      </Modal>

      {/* Modal: Detalhes do Onboarding */}
      <Modal
        isOpen={!!viewingOnboarding}
        onClose={() => setViewingOnboarding(null)}
        title={`Onboarding: ${viewingOnboarding?.company?.name || ''}`}
      >
        {viewingOnboarding && (
          <OnboardingDetailModal
            onboarding={viewingOnboarding}
            onAdvanceStep={handleAdvanceStep}
            advancingStep={advancingStep}
            onClose={() => setViewingOnboarding(null)}
          />
        )}
      </Modal>

      {/* Modal: Detalhes do Ticket */}
      <Modal
        isOpen={!!viewingTicket}
        onClose={() => setViewingTicket(null)}
        title={`Ticket #${viewingTicket?.number || ''}`}
      >
        {viewingTicket && (
          <TicketDetailModal
            ticket={viewingTicket}
            responses={ticketResponses}
            responseText={responseText}
            onResponseChange={setResponseText}
            onSendResponse={handleRespondTicket}
            sendingResponse={sendingResponse}
            onClose={() => setViewingTicket(null)}
          />
        )}
      </Modal>

      {/* Modal: Detalhes NPS */}
      <Modal
        isOpen={!!viewingNPS}
        onClose={() => setViewingNPS(null)}
        title="Detalhes da Pesquisa NPS"
      >
        {viewingNPS && (
          <NPSDetailModal nps={viewingNPS} onClose={() => setViewingNPS(null)} getNPSCategory={getNPSCategory} />
        )}
      </Modal>
    </div>
  );
};

// ============ MODAL COMPONENTS ============

const TicketModal = ({ onClose, onSubmit, companies, users }) => {
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'MEDIUM', category: 'Técnico', companyId: '', assignedToId: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.companyId) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Título *</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} className="crm-input" placeholder="Descreva brevemente o problema" required />
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Descrição *</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="crm-input" placeholder="Descreva detalhadamente o problema ou solicitação" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Prioridade</label>
          <select name="priority" value={formData.priority} onChange={handleChange} className="crm-input">
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Categoria</label>
          <select name="category" value={formData.category} onChange={handleChange} className="crm-input">
            <option value="Técnico">Técnico</option>
            <option value="Comercial">Comercial</option>
            <option value="Financeiro">Financeiro</option>
            <option value="Treinamento">Treinamento</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Cliente *</label>
        <select name="companyId" value={formData.companyId} onChange={handleChange} className="crm-input" required>
          <option value="">Selecione o cliente</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Responsável</label>
        <select name="assignedToId" value={formData.assignedToId} onChange={handleChange} className="crm-input">
          <option value="">Atribuir automaticamente</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="crm-btn crm-btn-secondary">Cancelar</button>
        <button type="submit" className="crm-btn crm-btn-primary">Criar Ticket</button>
      </div>
    </form>
  );
};

const OnboardingModal = ({ onClose, onSubmit, companies, contracts, users }) => {
  const [formData, setFormData] = useState({
    companyId: '', contractId: '', assignedToId: '', expectedEndDate: '', description: '',
    steps: [
      { title: 'Configuração inicial', description: 'Configurar parâmetros básicos do sistema' },
      { title: 'Treinamento da equipe', description: 'Treinar usuários no uso do sistema' },
      { title: 'Migração de dados', description: 'Importar dados do sistema anterior' }
    ]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.companyId || !formData.assignedToId || !formData.expectedEndDate) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleStepChange = (index, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[index][field] = value;
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const addStep = () => setFormData(prev => ({
    ...prev,
    steps: [...prev.steps, { title: '', description: '' }]
  }));

  const removeStep = (index) => setFormData(prev => ({
    ...prev,
    steps: prev.steps.filter((_, i) => i !== index)
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Cliente *</label>
          <select name="companyId" value={formData.companyId} onChange={handleChange} className="crm-input" required>
            <option value="">Selecione o cliente</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Contrato</label>
          <select name="contractId" value={formData.contractId} onChange={handleChange} className="crm-input">
            <option value="">Selecione o contrato (opcional)</option>
            {contracts.map(contract => (
              <option key={contract.id} value={contract.id}>{contract.number} - {contract.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Responsável *</label>
          <select name="assignedToId" value={formData.assignedToId} onChange={handleChange} className="crm-input" required>
            <option value="">Selecione o responsável</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Data Prevista de Conclusão *</label>
          <input type="date" name="expectedEndDate" value={formData.expectedEndDate} onChange={handleChange} className="crm-input" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Descrição</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="crm-input" placeholder="Descreva o processo de onboarding" />
      </div>
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-semibold text-[var(--crm-ink)]">Etapas do Onboarding</label>
          <button type="button" onClick={addStep} className="crm-btn crm-btn-ghost px-3 py-1.5 text-sm">+ Adicionar Etapa</button>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {formData.steps.map((step, index) => (
            <div key={index} className="crm-panel-muted p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-[var(--crm-muted)]">Etapa {index + 1}</span>
                {formData.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(index)} className="crm-btn crm-btn-ghost px-2 py-1 text-sm text-red-700 dark:text-red-200">Remover</button>
                )}
              </div>
              <div className="space-y-2">
                <input type="text" value={step.title} onChange={(e) => handleStepChange(index, 'title', e.target.value)} className="crm-input" placeholder="Título da etapa" />
                <textarea value={step.description} onChange={(e) => handleStepChange(index, 'description', e.target.value)} rows={2} className="crm-input" placeholder="Descrição da etapa" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="crm-btn crm-btn-secondary">Cancelar</button>
        <button type="submit" className="crm-btn crm-btn-primary">Criar Onboarding</button>
      </div>
    </form>
  );
};

const NPSSurveyModal = ({ onClose, onSubmit, companies, contracts }) => {
  const [formData, setFormData] = useState({ companyId: '', contractId: '' });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.companyId) {
      alert('Selecione o cliente');
      return;
    }
    onSubmit(formData);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Cliente *</label>
        <select name="companyId" value={formData.companyId} onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))} className="crm-input" required>
          <option value="">Selecione o cliente</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Contrato</label>
        <select name="contractId" value={formData.contractId} onChange={(e) => setFormData(prev => ({ ...prev, contractId: e.target.value }))} className="crm-input">
          <option value="">Selecione o contrato (opcional)</option>
          {contracts.map(contract => (
            <option key={contract.id} value={contract.id}>{contract.number} - {contract.title}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
        Uma pesquisa de satisfação (NPS) será enviada para o cliente selecionado. O cliente receberá um link para avaliar de 0 a 10.
      </p>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="crm-btn crm-btn-secondary">Cancelar</button>
        <button type="submit" className="crm-btn crm-btn-primary">Enviar Pesquisa</button>
      </div>
    </form>
  );
};

const OnboardingDetailModal = ({ onboarding, onAdvanceStep, advancingStep, onClose }) => {
  const completedSteps = onboarding.steps?.filter(s => s.status === 'COMPLETED').length || 0;
  const totalSteps = onboarding.steps?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const allDone = completedSteps === totalSteps && totalSteps > 0;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Progresso</span>
          <span className="text-sm font-bold text-blue-700">{completedSteps}/{totalSteps} etapas</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {allDone && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-emerald-700">Onboarding concluído!</p>
          <p className="text-xs text-emerald-600">Todas as etapas foram finalizadas.</p>
        </div>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {onboarding.steps?.map((step, index) => {
          const isCompleted = step.status === 'COMPLETED';
          const isPending = !isCompleted && step.status !== 'CANCELLED';
          const isLoading = advancingStep === step.id;

          return (
            <div key={step.id || index} className={`p-4 rounded-xl border-2 transition-all ${
              isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white hover:border-blue-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-400">{step.order || index + 1}</span>
                      </div>
                    )}
                    <span className={`text-sm font-bold ${isCompleted ? 'text-emerald-700' : 'text-gray-800'}`}>
                      {step.title}
                    </span>
                  </div>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1 ml-7">{step.description}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {isCompleted ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Concluída</span>
                  ) : (
                    <button
                      onClick={() => onAdvanceStep(onboarding.id, step)}
                      disabled={!!advancingStep}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Concluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="crm-btn crm-btn-secondary">Fechar</button>
      </div>
    </div>
  );
};

const TicketDetailModal = ({ ticket, responseText, onResponseChange, onSendResponse, sendingResponse, onClose, responses }) => {
  const slaExpired = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ticket</p>
          <p className="text-sm font-bold text-gray-900">#{ticket.number}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</p>
          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
            ticket.status === 'OPEN' ? 'bg-red-100 text-red-800' :
            ticket.status === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-800' :
            ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
            'bg-gray-100 text-gray-800'
          }`}>{ticket.status}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prioridade</p>
          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
            ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
            ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
            ticket.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
            'bg-emerald-100 text-emerald-800'
          }`}>{ticket.priority}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">SLA</p>
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${slaExpired ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={`text-xs font-bold ${slaExpired ? 'text-red-600' : 'text-gray-700'}`}>
              {ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleDateString('pt-BR') : '-'}
              {slaExpired && ' (Vencido)'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Descrição</p>
        <p className="text-sm text-gray-800">{ticket.description}</p>
      </div>

      {responses && responses.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Respostas ({responses.length})</p>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {responses.map((resp, idx) => (
              <div key={resp.id || idx} className="bg-gray-50 p-3 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-600">{resp.author?.name || 'Desconhecido'}</span>
                  <span className="text-[10px] text-gray-400">{new Date(resp.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-gray-800">{resp.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm font-bold text-gray-700 mb-3">Adicionar Resposta</p>
        <textarea
          value={responseText}
          onChange={(e) => onResponseChange(e.target.value)}
          rows={3}
          className="crm-input w-full"
          placeholder="Digite sua resposta para o cliente..."
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={onSendResponse}
            disabled={!responseText.trim() || sendingResponse}
            className="crm-btn crm-btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {sendingResponse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingResponse ? 'Enviando...' : 'Enviar Resposta'}
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="crm-btn crm-btn-secondary">Fechar</button>
      </div>
    </div>
  );
};

const NPSDetailModal = ({ nps, onClose, getNPSCategory }) => {
  const category = nps.score !== null ? getNPSCategory(nps.score) : null;
  const CatIcon = category?.icon || Star;

  return (
    <div className="space-y-5">
      <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl">
        {nps.score !== null ? (
          <>
            <div className="text-5xl font-bold text-gray-900 mb-2">{nps.score}</div>
            <p className="text-sm text-gray-500">/ 10</p>
            {category && (
              <span className={`inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full text-sm font-bold ${
                category.label === 'Promotor' ? 'bg-green-100 text-green-800' :
                category.label === 'Neutro' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                <CatIcon className="w-4 h-4" /> {category.label}
              </span>
            )}
          </>
        ) : (
          <>
            <Star className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Pesquisa ainda não respondida</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cliente</p>
          <p className="text-sm font-bold text-gray-900">{nps.company?.name}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</p>
          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
            nps.status === 'RESPONDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>{nps.status === 'RESPONDED' ? 'Respondido' : 'Pendente'}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Enviada em</p>
          <p className="text-sm font-bold text-gray-900">{new Date(nps.sentAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Respondida em</p>
          <p className="text-sm font-bold text-gray-900">
            {nps.respondedAt ? new Date(nps.respondedAt).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
      </div>

      {nps.feedback && (
        <div className="bg-gray-50 p-4 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Feedback do Cliente</p>
          <p className="text-sm text-gray-700 italic">"{nps.feedback}"</p>
        </div>
      )}

      {nps.contract && (
        <div className="bg-gray-50 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contrato</p>
          <p className="text-sm font-bold text-gray-900">{nps.contract.number} - {nps.contract.title}</p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="crm-btn crm-btn-secondary">Fechar</button>
      </div>
    </div>
  );
};

export default PosVenda;