import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  BadgeDollarSign,
  Calendar,
  Check,
  CheckSquare,
  Eye,
  FileText,
  Handshake,
  LayoutGrid,
  List,
  Mail,
  PhoneCall,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  X
} from 'lucide-react';

import { buildApiUrl, getAuthHeaders } from '../config/api';
import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import ModernTable from '../components/ModernTable';
import Modal from '../components/Modal';
import {
  ACTIVITY_AREA_OPTIONS,
  addFlowMetadataToDescription,
  getAreaLabel,
  hydrateActivityFlow,
  updateFlowMetadataInDescription
} from '../utils/activityFlow';
import { openPreSalesBudgetPdf } from '../utils/preSalesBudgetPrint';

const TYPE_META = {
  CALL: { label: 'Ligacao', icon: PhoneCall },
  MEETING: { label: 'Reuniao', icon: Handshake },
  EMAIL: { label: 'E-mail', icon: Mail },
  TASK: { label: 'Tarefa', icon: CheckSquare },
  FOLLOW_UP: { label: 'Follow-up', icon: RefreshCcw },
  SOLICITACAO_ORCAMENTO: { label: 'Solicitacao de Orcamento', icon: BadgeDollarSign }
};

const STATUS_META = {
  PENDING: { label: 'Pendente', cls: 'bg-amber-500/10 text-amber-900 dark:text-amber-200' },
  IN_PROGRESS: { label: 'Em andamento', cls: 'bg-sky-500/10 text-sky-900 dark:text-sky-200' },
  COMPLETED: { label: 'Concluida', cls: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' },
  PROPOSAL_SENT: { label: 'Proposta enviada', cls: 'bg-cyan-500/10 text-cyan-900 dark:text-cyan-200' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-red-500/10 text-red-900 dark:text-red-200' }
};

const ACTIVITY_KANBAN_COLUMNS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PROPOSAL_SENT', 'CANCELLED'];

const PRIORITY_META = {
  LOW: { label: 'Baixa', cls: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' },
  MEDIUM: { label: 'Media', cls: 'bg-amber-500/10 text-amber-900 dark:text-amber-200' },
  HIGH: { label: 'Alta', cls: 'bg-red-500/10 text-red-900 dark:text-red-200' },
  URGENT: { label: 'Urgente', cls: 'bg-red-500/[0.15] text-red-900 dark:text-red-200' }
};

const DESTINATION_OPTIONS = [
  { value: 'PRE_VENDAS', label: 'Pré-Vendas' },
  { value: 'SDR', label: 'SDR' },
  { value: 'DIRETORIA_COMERCIAL', label: 'Diretoria Comercial' },
  { value: 'GERENTE_CONTAS', label: 'Gerente de Contas' },
  { value: 'COMERCIAL', label: 'Comercial' }
];

const BUDGET_REQUEST_TYPE = 'SOLICITACAO_ORCAMENTO';
const PROPOSAL_SENT_STAGE = 'PROPOSTA_ENVIADA';

const getActivityDisplayType = (activity) => {
  if (activity?.type === 'TASK' && activity?.flow?.targetArea === 'PRE_VENDAS') {
    return BUDGET_REQUEST_TYPE;
  }
  return activity?.type;
};

const getActivityDisplayStatus = (activity) => (
  activity?.flow?.activityStage === PROPOSAL_SENT_STAGE ? 'PROPOSAL_SENT' : activity?.status
);

const isOverdue = (dueDate, status) => {
  if (!dueDate) return false;
  if (status === 'COMPLETED' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
};

const getCurrentUserName = () => {
  try {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : {};
    return user?.name || '';
  } catch {
    return '';
  }
};

const getCurrentUserId = () => {
  try {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : {};
    return user?.id || '';
  } catch {
    return '';
  }
};

const getCurrentUserRole = () => {
  try {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : {};
    return String(user?.actualRole || user?.role || '').trim().toUpperCase();
  } catch {
    return '';
  }
};

export default function Atividades() {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const lastOpenedActivityId = useRef(null);
  const lastAppliedPresetKey = useRef('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [viewMode, setViewMode] = useState('KANBAN');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'CALL',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    companyId: '',
    opportunityId: '',
    assignedToId: '',
    sourceArea: 'COMERCIAL',
    targetArea: 'PRE_VENDAS'
  });

  const [empresas, setEmpresas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const canDeleteActivities = useMemo(() => ['ADMIN', 'MASTER'].includes(getCurrentUserRole()), []);

  const [filtros, setFiltros] = useState({
    status: '',
    type: '',
    priority: '',
    targetArea: ''
  });

  const loadDependencies = async () => {
    try {
      const [empresasRes, oportunidadesRes, usuariosRes] = await Promise.all([
        axios.get(buildApiUrl('/companies'), { headers: getAuthHeaders() }),
        axios.get(buildApiUrl('/opportunities'), { headers: getAuthHeaders() }),
        axios.get(buildApiUrl('/users'), { headers: getAuthHeaders() })
      ]);

      setEmpresas(Array.isArray(empresasRes.data) ? empresasRes.data : []);
      setOportunidades(Array.isArray(oportunidadesRes.data) ? oportunidadesRes.data : []);
      setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
    } catch (error) {
      console.error('Erro ao carregar dependencias:', error);
      const fallbackUserId = getCurrentUserId();
      const fallbackUserName = getCurrentUserName();
      setUsuarios(
        fallbackUserId
          ? [{ id: fallbackUserId, name: fallbackUserName || 'Usuário atual' }]
          : []
      );
    }
  };

  const loadAtividades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.status && filtros.status !== 'PROPOSAL_SENT') params.append('status', filtros.status);
      if (filtros.type) params.append('type', filtros.type);
      if (filtros.priority) params.append('priority', filtros.priority);

      const response = await axios.get(buildApiUrl('/activities-simple?') + params, {
        headers: getAuthHeaders()
      });

      const items = Array.isArray(response.data) ? response.data.map(hydrateActivityFlow) : [];
      setAtividades(items);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const openActivityDetails = (activity) => {
    if (!activity) return;
    setSelectedActivity(activity);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadAtividades();
  }, [filtros.status, filtros.type, filtros.priority]);

  const resetForm = () => {
    setFormData({
      type: 'CALL',
      subject: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
      companyId: '',
      opportunityId: '',
      assignedToId: '',
      sourceArea: 'COMERCIAL',
      targetArea: 'PRE_VENDAS'
    });
  };

  const closeModal = () => {
    setShowForm(false);
    setSaving(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const isBudgetRequest = formData.type === BUDGET_REQUEST_TYPE;
      const targetAreaForPayload = isBudgetRequest ? 'PRE_VENDAS' : formData.targetArea;
      const payload = {
        ...formData,
        type: isBudgetRequest ? 'TASK' : formData.type,
        targetArea: targetAreaForPayload,
        description: addFlowMetadataToDescription(formData.description, {
          sourceArea: formData.sourceArea,
          targetArea: targetAreaForPayload,
          createdFrom: 'ATIVIDADES',
          createdByName: getCurrentUserName()
        })
      };

      const assignedToId = String(formData.assignedToId || '').trim();
      if (assignedToId) {
        payload.assignedToId = assignedToId;
      }

      await axios.post(
        buildApiUrl('/activities-simple'),
        payload,
        { headers: getAuthHeaders() }
      );

      closeModal();
      loadAtividades();
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(
        buildApiUrl('/activities-simple'),
        { id, status },
        { headers: getAuthHeaders() }
      );
      loadAtividades();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const deleteActivity = async (activity) => {
    if (!activity?.id || !canDeleteActivities) return;
    const title = activity.subject || 'esta atividade';
    if (!window.confirm(`Excluir ${title}? Esta ação não poderá ser desfeita.`)) return;

    try {
      setLoading(true);
      await axios.delete(
        buildApiUrl(`/activities-simple/${encodeURIComponent(activity.id)}`),
        { headers: getAuthHeaders() }
      );
      setAtividades((prev) => prev.filter((item) => item.id !== activity.id));
      if (selectedActivity?.id === activity.id) {
        setSelectedActivity(null);
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      alert(error?.response?.data?.error || error?.response?.data?.message || 'Não foi possível excluir a atividade.');
    } finally {
      setLoading(false);
    }
  };

  const markProposalSent = async (activity) => {
    if (!activity?.id) return;

    try {
      const descriptionWithFlow = addFlowMetadataToDescription(activity.description, activity.flow || {});
      await axios.put(
        buildApiUrl('/activities-simple'),
        {
          id: activity.id,
          status: 'COMPLETED',
          description: updateFlowMetadataInDescription(descriptionWithFlow, {
            ...(activity.flow || {}),
            activityStage: PROPOSAL_SENT_STAGE,
            proposalSentAt: new Date().toISOString(),
            proposalSentByName: getCurrentUserName()
          })
        },
        { headers: getAuthHeaders() }
      );
      loadAtividades();
    } catch (error) {
      console.error('Erro ao marcar proposta enviada:', error);
    }
  };

  const openReturnedPreSalesBudget = async (activity) => {
    const preSalesRequestId = activity?.flow?.preSalesRequestId;
    const preSalesNumber = activity?.flow?.preSalesNumber;
    if (!preSalesRequestId && !preSalesNumber) return;

    try {
      const path = preSalesRequestId
        ? `/pre-vendas/${encodeURIComponent(preSalesRequestId)}`
        : `/pre-vendas/by-number/${encodeURIComponent(preSalesNumber)}`;
      const response = await axios.get(buildApiUrl(path), { headers: getAuthHeaders() });
      const budget = response.data?.data || response.data;
      if (!budget?.id) throw new Error('Orçamento não encontrado');
      openPreSalesBudgetPdf(budget);
    } catch (error) {
      console.error('Erro ao abrir orçamento devolvido:', error);
      alert('Não foi possível abrir o orçamento devolvido.');
    }
  };

  useEffect(() => {
    const activityId = searchParams.get('activityId');
    if (!activityId) return;
    if (lastOpenedActivityId.current === activityId) return;

    const found = Array.isArray(atividades)
      ? atividades.find((activity) => activity.id === activityId)
      : null;

    if (found) {
      openActivityDetails(found);
      lastOpenedActivityId.current = activityId;
    }
  }, [searchParams, atividades]);

  useEffect(() => {
    if (searchParams.get('openForm') !== '1') return;

    const presetKey = searchParams.toString();
    if (lastAppliedPresetKey.current === presetKey) return;

    const nextType = searchParams.get('type') || 'TASK';
    const nextSourceArea = searchParams.get('sourceArea') || 'COMERCIAL';
    const nextTargetArea = searchParams.get('targetArea') || (nextType === BUDGET_REQUEST_TYPE ? 'PRE_VENDAS' : '');
    const nextCompanyId = searchParams.get('companyId') || '';
    const nextOpportunityId = searchParams.get('opportunityId') || '';
    const nextSubject = searchParams.get('subject') || '';
    const nextDescription = searchParams.get('description') || '';

    setFormData({
      type: nextType,
      subject: nextSubject,
      description: nextDescription,
      priority: 'MEDIUM',
      dueDate: '',
      companyId: nextCompanyId,
      opportunityId: nextOpportunityId,
      assignedToId: '',
      sourceArea: nextSourceArea,
      targetArea: nextTargetArea
    });
    setShowForm(true);
    lastAppliedPresetKey.current = presetKey;
  }, [searchParams]);

  const filteredAtividades = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = (Array.isArray(atividades) ? atividades : []).filter((activity) => {
      if (filtros.status && getActivityDisplayStatus(activity) !== filtros.status) return false;
      if (filtros.type && getActivityDisplayType(activity) !== filtros.type) return false;
      if (filtros.priority && activity.priority !== filtros.priority) return false;
      if (filtros.targetArea && activity?.flow?.targetArea !== filtros.targetArea) return false;
      return true;
    });
    if (!term) return items;

    return items.filter((activity) => {
      const haystack = [
        activity.subject,
        activity.description,
        activity.company?.name,
        activity.opportunity?.title,
        activity.assignedTo?.name,
        TYPE_META[getActivityDisplayType(activity)]?.label,
        getAreaLabel(activity?.flow?.sourceArea),
        getAreaLabel(activity?.flow?.targetArea)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [atividades, searchTerm, filtros]);

  const kpis = useMemo(() => {
    const items = Array.isArray(atividades) ? atividades : [];
    const pending = items.filter((a) => a.status === 'PENDING').length;
    const inProgress = items.filter((a) => a.status === 'IN_PROGRESS').length;
    const completed = items.filter((a) => a.status === 'COMPLETED').length;
    const overdue = items.filter((a) => isOverdue(a.dueDate, a.status)).length;
    return { pending, inProgress, completed, overdue, total: items.length };
  }, [atividades]);

  const columns = useMemo(() => ([
    {
      key: 'subject',
      label: 'Atividade',
      render: (item) => {
        const displayType = getActivityDisplayType(item);
        const meta = TYPE_META[displayType] || { label: displayType || '-', icon: CheckSquare };
        const Icon = meta.icon;
        return (
          <div className="min-w-[260px]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-2-rgb)_/_0.6)]">
                <Icon className="h-4 w-4 text-[var(--crm-ink)]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-[var(--crm-ink)] truncate">{item.subject}</div>
                <div className="mt-0.5 text-xs text-[var(--crm-muted)] truncate">
                  {item.description || meta.label}
                </div>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        const displayStatus = getActivityDisplayStatus(item);
        const meta = STATUS_META[displayStatus] || { label: item.status || '-', cls: 'bg-slate-500/10 text-slate-700 dark:text-slate-200' };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.cls}`}>
            {meta.label}
          </span>
        );
      }
    },
    {
      key: 'priority',
      label: 'Prioridade',
      render: (item) => {
        const meta = PRIORITY_META[item.priority] || { label: item.priority || '-', cls: 'bg-slate-500/10 text-slate-700 dark:text-slate-200' };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.cls}`}>
            {meta.label}
          </span>
        );
      }
    },
    {
      key: 'dueDate',
      label: 'Vencimento',
      render: (item) => (
        <div className="min-w-[170px]">
          <div className="text-sm text-[var(--crm-ink)]">
            {item.dueDate
              ? `${new Date(item.dueDate).toLocaleDateString('pt-BR')} ${new Date(item.dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : '-'}
          </div>
          {isOverdue(item.dueDate, item.status) && (
            <div className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-red-500/10 text-red-900 dark:text-red-200">
              Atrasada
            </div>
          )}
        </div>
      )
    },
    {
      key: 'company',
      label: 'Empresa',
      render: (item) => (
        <span className="text-sm text-[var(--crm-ink)]">{item.company?.name || '-'}</span>
      )
    },
    {
      key: 'assignedTo',
      label: 'Responsavel',
      render: (item) => (
        <span className="text-sm text-[var(--crm-ink)]">{item.assignedTo?.name || '-'}</span>
      )
    },
    {
      key: 'targetArea',
      label: 'Destino',
      render: (item) => (
        <div className="min-w-[160px]">
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold bg-indigo-500/10 text-indigo-900 dark:text-indigo-200">
            {getAreaLabel(item?.flow?.targetArea)}
          </span>
          <div className="mt-1 text-[11px] text-[var(--crm-muted)]">
            Origem: {getAreaLabel(item?.flow?.sourceArea)}
          </div>
        </div>
      )
    }
  ]), []);

  const kanbanByStatus = useMemo(() => {
    return ACTIVITY_KANBAN_COLUMNS.reduce((acc, status) => {
      acc[status] = filteredAtividades.filter((activity) => getActivityDisplayStatus(activity) === status);
      return acc;
    }, {});
  }, [filteredAtividades]);

  const filterControls = [
    {
      label: 'Status',
      value: filtros.status,
      onChange: (value) => setFiltros((prev) => ({ ...prev, status: value })),
      options: [
        { value: 'PENDING', label: 'Pendente' },
        { value: 'IN_PROGRESS', label: 'Em andamento' },
        { value: 'COMPLETED', label: 'Concluida' },
        { value: 'PROPOSAL_SENT', label: 'Proposta enviada' },
        { value: 'CANCELLED', label: 'Cancelada' }
      ]
    },
    {
      label: 'Tipo',
      value: filtros.type,
      onChange: (value) => setFiltros((prev) => ({ ...prev, type: value })),
      options: [
        { value: 'CALL', label: 'Ligacao' },
        { value: 'MEETING', label: 'Reuniao' },
        { value: 'EMAIL', label: 'E-mail' },
        { value: 'TASK', label: 'Tarefa' },
        { value: 'FOLLOW_UP', label: 'Follow-up' },
        { value: 'SOLICITACAO_ORCAMENTO', label: 'Solicitacao de Orcamento' }
      ]
    },
    {
      label: 'Prioridade',
      value: filtros.priority,
      onChange: (value) => setFiltros((prev) => ({ ...prev, priority: value })),
      options: [
        { value: 'LOW', label: 'Baixa' },
        { value: 'MEDIUM', label: 'Media' },
        { value: 'HIGH', label: 'Alta' },
        { value: 'URGENT', label: 'Urgente' }
      ]
    },
    {
      label: 'Destino',
      value: filtros.targetArea,
      onChange: (value) => setFiltros((prev) => ({ ...prev, targetArea: value })),
      options: ACTIVITY_AREA_OPTIONS
    }
  ];

  const renderActivityActions = (item) => (
    <>
      {(item?.flow?.preSalesRequestId || item?.flow?.preSalesNumber) && (
        <button
          type="button"
          onClick={() => openReturnedPreSalesBudget(item)}
          className="crm-btn crm-btn-primary px-3 py-1.5 text-xs"
          title="Visualizar orçamento em PDF"
        >
          <FileText className="h-4 w-4" />
          PDF
        </button>
      )}
      {item.status === 'COMPLETED' && getActivityDisplayStatus(item) !== 'PROPOSAL_SENT' && (
        <button
          type="button"
          onClick={() => markProposalSent(item)}
          className="crm-btn crm-btn-primary px-3 py-1.5 text-xs"
          title="Proposta enviada"
        >
          <Send className="h-4 w-4" />
          Proposta enviada
        </button>
      )}
      {item.status === 'PENDING' && (
        <button
          type="button"
          onClick={() => updateStatus(item.id, 'IN_PROGRESS')}
          className="crm-btn crm-btn-secondary px-3 py-1.5 text-xs"
          title="Iniciar"
        >
          <RefreshCcw className="h-4 w-4" />
          Iniciar
        </button>
      )}
      {item.status === 'IN_PROGRESS' && (
        <button
          type="button"
          onClick={() => updateStatus(item.id, 'COMPLETED')}
          className="crm-btn crm-btn-primary px-3 py-1.5 text-xs"
          title="Concluir"
        >
          <Check className="h-4 w-4" />
          Concluir
        </button>
      )}
      {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
        <button
          type="button"
          onClick={() => updateStatus(item.id, 'CANCELLED')}
          className="crm-btn crm-btn-danger px-3 py-1.5 text-xs"
          title="Cancelar"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      )}
      <button
        type="button"
        onClick={() => openActivityDetails(item)}
        className="crm-btn crm-btn-secondary px-3 py-1.5 text-xs"
        title="Detalhes"
      >
        <Eye className="h-4 w-4" />
        Detalhes
      </button>
      {canDeleteActivities && (
        <button
          type="button"
          onClick={() => deleteActivity(item)}
          className="crm-btn crm-btn-danger px-3 py-1.5 text-xs"
          title="Excluir atividade"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </button>
      )}
    </>
  );

  const renderActivityCard = (item) => {
    const displayType = getActivityDisplayType(item);
    const typeMeta = TYPE_META[displayType] || { label: displayType || '-', icon: CheckSquare };
    const displayStatus = getActivityDisplayStatus(item);
    const statusMeta = STATUS_META[displayStatus] || { label: item.status || '-', cls: 'bg-slate-500/10 text-slate-700 dark:text-slate-200' };
    const priorityMeta = PRIORITY_META[item.priority] || { label: item.priority || '-', cls: 'bg-slate-500/10 text-slate-700 dark:text-slate-200' };
    const Icon = typeMeta.icon;

    return (
      <div key={item.id} className="rounded-xl border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-2-rgb)_/_0.72)] p-4 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-rgb)_/_0.65)]">
            <Icon className="h-4 w-4 text-[var(--crm-ink)]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-[var(--crm-ink)]">{item.subject || 'Atividade sem titulo'}</div>
            <div className="mt-1 line-clamp-2 text-xs text-[var(--crm-muted)]">{item.description || typeMeta.label}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${priorityMeta.cls}`}>
            {priorityMeta.label}
          </span>
        </div>

        <div className="mt-3 space-y-1 text-xs text-[var(--crm-muted)]">
          <div>Empresa: <span className="text-[var(--crm-ink)]">{item.company?.name || '-'}</span></div>
          <div>Responsavel: <span className="text-[var(--crm-ink)]">{item.assignedTo?.name || '-'}</span></div>
          <div>Destino: <span className="text-[var(--crm-ink)]">{getAreaLabel(item?.flow?.targetArea)}</span></div>
          <div>
            Vencimento:{' '}
            <span className={isOverdue(item.dueDate, item.status) ? 'font-bold text-red-400' : 'text-[var(--crm-ink)]'}>
              {item.dueDate ? new Date(item.dueDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {renderActivityActions(item)}
        </div>
      </div>
    );
  };

  const selectedDisplayStatus = selectedActivity ? getActivityDisplayStatus(selectedActivity) : '';

  return (
    <div>
      <PageHeader
        title="Atividades"
        subtitle="Gerencie suas tarefas e compromissos"
        icon={Calendar}
        gradient="blue"
        breadcrumbs={['Home', 'Atividades']}
        actions={[
          {
            label: 'Nova Atividade',
            onClick: () => setShowForm(true),
            icon: Plus,
            variant: 'primary'
          }
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <AnimatedStats title="Total" value={kpis.total} subtitle="Atividades" icon={Calendar} color="blue" />
        <AnimatedStats title="Pendentes" value={kpis.pending} subtitle="Aguardando inicio" icon={RefreshCcw} color="orange" />
        <AnimatedStats title="Em andamento" value={kpis.inProgress} subtitle="Sendo executadas" icon={RefreshCcw} color="purple" />
        <AnimatedStats title="Concluidas" value={kpis.completed} subtitle="Finalizadas" icon={CheckSquare} color="green" />
        <AnimatedStats title="Atrasadas" value={kpis.overdue} subtitle="Requer atencao" icon={X} color="red" />
      </div>

      <div className="crm-panel mb-6 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--crm-muted)]" />
              <input
                type="text"
                placeholder="Buscar atividade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="crm-input pl-10"
              />
            </div>
            {filterControls.map((filter) => (
              <label key={filter.label} className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-[var(--crm-muted)]">{filter.label}</span>
                <select
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                  className="crm-input"
                >
                  <option value="">Todos</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="inline-flex shrink-0 rounded-lg border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-2-rgb)_/_0.62)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                viewMode === 'KANBAN' ? 'bg-[var(--crm-accent)] text-white' : 'text-[var(--crm-muted)] hover:text-[var(--crm-ink)]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                viewMode === 'LIST' ? 'bg-[var(--crm-accent)] text-white' : 'text-[var(--crm-muted)] hover:text-[var(--crm-ink)]'
              }`}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'KANBAN' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 2xl:grid-cols-5">
          {ACTIVITY_KANBAN_COLUMNS.map((status) => {
            const meta = STATUS_META[status];
            const rows = kanbanByStatus[status] || [];
            return (
              <div key={status} className="crm-panel p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--crm-ink)]">{meta.label}</h3>
                    <p className="text-sm text-[var(--crm-muted)]">Atividades {meta.label.toLowerCase()}</p>
                  </div>
                  <span className="rounded-full bg-[rgb(var(--crm-surface-2-rgb)_/_0.75)] px-3 py-1 text-sm font-bold text-[var(--crm-ink)]">
                    {rows.length}
                  </span>
                </div>
                {rows.length > 0 ? (
                  <div className="space-y-3">
                    {rows.map(renderActivityCard)}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[color:var(--crm-border)] px-3 py-8 text-center text-sm text-[var(--crm-muted)]">
                    Nenhuma atividade nesta coluna.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <ModernTable
          title="Lista de Atividades"
          data={filteredAtividades}
          columns={columns}
          loading={loading}
          rowClassName={(item) => (isOverdue(item.dueDate, item.status) ? 'bg-red-500/5' : '')}
          renderActions={renderActivityActions}
          emptyState={(
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[var(--crm-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--crm-ink)] mb-2">Nenhuma atividade encontrada</h3>
            <p className="text-[var(--crm-muted)] max-w-sm mx-auto">
              Ajuste os filtros ou crie uma nova atividade.
            </p>
          </div>
          )}
        />
      )}

      {showDetailsModal && selectedActivity && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={selectedActivity.subject || 'Detalhes da Atividade'}
        >
          <div className="space-y-6">
            <div className="crm-panel-muted p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
                  STATUS_META[selectedDisplayStatus]?.cls || 'bg-slate-500/10 text-slate-700 dark:text-slate-200'
                }`}>
                  {STATUS_META[selectedDisplayStatus]?.label || selectedActivity.status}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
                  PRIORITY_META[selectedActivity.priority]?.cls || 'bg-slate-500/10 text-slate-700 dark:text-slate-200'
                }`}>
                  {PRIORITY_META[selectedActivity.priority]?.label || selectedActivity.priority}
                </span>
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold bg-slate-500/10 text-slate-700 dark:text-slate-200">
                  {TYPE_META[getActivityDisplayType(selectedActivity)]?.label || selectedActivity.type}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-[var(--crm-muted)] uppercase mb-1">Empresa</div>
                  <div className="text-[var(--crm-ink)] font-semibold">
                    {selectedActivity.company?.name || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--crm-muted)] uppercase mb-1">Oportunidade</div>
                  <div className="text-[var(--crm-ink)] font-semibold">
                    {selectedActivity.opportunity?.title || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--crm-muted)] uppercase mb-1">Responsável</div>
                  <div className="text-[var(--crm-ink)] font-semibold">
                    {selectedActivity.assignedTo?.name || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--crm-muted)] uppercase mb-1">Data</div>
                  <div className="text-[var(--crm-ink)] font-semibold">
                    {selectedActivity.dueDate
                      ? new Date(selectedActivity.dueDate).toLocaleDateString('pt-BR')
                      : 'Sem data'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--crm-muted)] uppercase mb-1">Origem</div>
                  <div className="text-[var(--crm-ink)] font-semibold">
                    {getAreaLabel(selectedActivity?.flow?.sourceArea) || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--crm-muted)] uppercase mb-1">Destino</div>
                  <div className="text-[var(--crm-ink)] font-semibold">
                    {getAreaLabel(selectedActivity?.flow?.targetArea) || 'Não informado'}
                  </div>
                </div>
              </div>
            </div>

            {selectedActivity.description && (
              <div>
                <div className="text-sm font-bold text-[var(--crm-ink)] mb-2">Descricao</div>
                <div className="crm-panel-muted p-4 text-sm text-[var(--crm-ink)] whitespace-pre-wrap">
                  {selectedActivity.description}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              {selectedActivity.status === 'COMPLETED' && selectedDisplayStatus !== 'PROPOSAL_SENT' && (
                <button
                  type="button"
                  onClick={() => {
                    markProposalSent(selectedActivity);
                    setShowDetailsModal(false);
                  }}
                  className="crm-btn crm-btn-primary"
                >
                  <Send className="h-4 w-4" />
                  Proposta enviada
                </button>
              )}
              {selectedActivity.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    updateStatus(selectedActivity.id, 'IN_PROGRESS');
                    setShowDetailsModal(false);
                  }}
                  className="crm-btn crm-btn-secondary"
                >
                  Iniciar
                </button>
              )}
              {selectedActivity.status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  onClick={() => {
                    updateStatus(selectedActivity.id, 'COMPLETED');
                    setShowDetailsModal(false);
                  }}
                  className="crm-btn crm-btn-primary"
                >
                  Concluir
                </button>
              )}
              {selectedActivity.status !== 'COMPLETED' && selectedActivity.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => {
                    updateStatus(selectedActivity.id, 'CANCELLED');
                    setShowDetailsModal(false);
                  }}
                  className="crm-btn crm-btn-danger"
                >
                  Cancelar
                </button>
              )}
              {canDeleteActivities && (
                <button
                  type="button"
                  onClick={() => deleteActivity(selectedActivity)}
                  className="crm-btn crm-btn-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="crm-btn crm-btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={showForm} onClose={closeModal} title="Nova Atividade">
        <form onSubmit={handleSubmit} className="space-y-6">
          {formData.type === BUDGET_REQUEST_TYPE && (
            <div className="crm-panel-muted p-4">
              <div className="text-sm font-extrabold text-[var(--crm-ink)]">Fluxo de orçamento</div>
              <div className="mt-1 text-sm text-[var(--crm-muted)]">
                Esta atividade será salva tecnicamente como tarefa e exibida em Pré-Vendas &gt; Solicitações.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Tipo *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setFormData((p) => ({
                    ...p,
                    type: nextType,
                    targetArea: nextType === BUDGET_REQUEST_TYPE ? 'PRE_VENDAS' : p.targetArea
                  }));
                }}
                className="crm-input"
              >
                <option value="CALL">Ligacao</option>
                <option value="MEETING">Reuniao</option>
                <option value="EMAIL">E-mail</option>
                <option value="TASK">Tarefa</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="SOLICITACAO_ORCAMENTO">Solicitacao de Orcamento</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                className="crm-input"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Assunto *</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                className="crm-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Descricao</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="crm-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Data/Hora de vencimento</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                className="crm-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Responsavel</label>
              <select
                value={formData.assignedToId}
                onChange={(e) => setFormData((p) => ({ ...p, assignedToId: e.target.value }))}
                className="crm-input"
              >
                <option value="">Selecionar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Origem</label>
              <select
                value={formData.sourceArea}
                onChange={(e) => setFormData((p) => ({ ...p, sourceArea: e.target.value }))}
                className="crm-input"
              >
                {ACTIVITY_AREA_OPTIONS.map((area) => (
                  <option key={area.value} value={area.value}>{area.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Destino da atividade *</label>
              <select
                required
                value={formData.targetArea}
                onChange={(e) => setFormData((p) => ({ ...p, targetArea: e.target.value }))}
                disabled={formData.type === BUDGET_REQUEST_TYPE}
                className="crm-input"
              >
                {DESTINATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {formData.targetArea === 'PRE_VENDAS' && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                  Este envio vira uma solicitação no módulo Pre-Vendas &gt; Solicitações.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Empresa</label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData((p) => ({ ...p, companyId: e.target.value }))}
                className="crm-input"
              >
                <option value="">Selecionar empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Oportunidade (opcional)</label>
              <select
                value={formData.opportunityId}
                onChange={(e) => setFormData((p) => ({ ...p, opportunityId: e.target.value }))}
                className="crm-input"
              >
                <option value="">Selecionar oportunidade</option>
                {oportunidades.map((o) => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button type="button" onClick={closeModal} className="crm-btn crm-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="crm-btn crm-btn-primary">
              {saving ? 'Salvando...' : 'Criar Atividade'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
