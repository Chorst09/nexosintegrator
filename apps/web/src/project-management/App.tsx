import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Compass, CheckSquare, Sparkles, Users, FileText,
  BarChart2, LayoutTemplate, MoreHorizontal,
  Search, Bell, Settings, Plus, ChevronDown, CheckCircle2,
  List as ListIcon, Calendar, Activity, Upload,
  Users2, GanttChartSquare, ArrowLeft, X, Target, Briefcase, DollarSign
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import KanbanBoard from './components/KanbanBoard';
import ListView from './components/ListView';
import Dashboard from './components/Dashboard';
import TeamView from './components/TeamView';
import CalendarView from './components/CalendarView';
import GanttView from './components/GanttView';
import ActivityView from './components/ActivityView';
import WorkloadView from './components/WorkloadView';
import { HomeView, PlannedView, DocsView, WhiteboardsView } from './components/GlobalViews';
import TaskModal from './components/TaskModal';
import CreateTaskModal from './components/CreateTaskModal';
import { buildApiUrl, getAuthHeaders } from '../config/api';
import { Space, Issue } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ViewMode = 'board' | 'list' | 'dashboard' | 'team' | 'calendar' | 'gantt' | 'activity' | 'workload';
type ProjectStatus = NonNullable<Space['status']>;
type ProjectPhase = NonNullable<Space['phase']>;
type ProjectPriority = 'Baixa' | 'Normal' | 'Alta' | 'Urgente';

type CompanyOption = {
  id: string;
  name: string;
  clientType?: 'B2B' | 'B2G' | string;
};

type UserOption = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  accessB2B?: boolean;
  accessB2G?: boolean;
  accessManagement?: boolean;
};

type ApiProject = {
  id: string;
  number?: string;
  name: string;
  description?: string | null;
  type?: 'B2B' | 'B2G';
  phase?: ProjectPhase;
  status?: ProjectStatus | string;
  budget?: number | string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
  companyId?: string;
  projectManagerId?: string;
  opportunityId?: string | null;
  company?: { id?: string; name?: string; clientType?: string } | null;
  projectManager?: { id?: string; name?: string; email?: string } | null;
  phases?: ApiProjectPhase[];
  tasks?: ApiProjectTask[];
};

type ApiProjectPhase = {
  id: string;
  name: string;
  description?: string | null;
  order?: number;
  status?: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  progressPercent?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ApiProjectTask = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: { id?: string; name?: string } | null;
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANEJADO: 'Planejado',
  EM_ANDAMENTO: 'Em andamento',
  PAUSADO: 'Pausado',
  CONCLUIDO: 'Concluido',
  CANCELADO: 'Cancelado'
};

const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'PLANEJADO', label: 'Planejado' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'PAUSADO', label: 'Pausado' },
  { value: 'CONCLUIDO', label: 'Concluido' },
  { value: 'CANCELADO', label: 'Cancelado' }
];

const emptyProjectForm = {
  name: '',
  type: 'B2B' as 'B2B' | 'B2G',
  companyId: '',
  client: '',
  sponsor: '',
  projectManagerId: '',
  manager: '',
  status: 'PLANEJADO' as ProjectStatus,
  phase: 'SETUP' as ProjectPhase,
  priority: 'Normal' as ProjectPriority,
  startDate: '',
  endDate: '',
  budget: '',
  opportunityId: '',
  objective: '',
  scope: '',
  deliverables: '',
  successCriteria: '',
  risks: '',
  notes: ''
};

type ProjectForm = typeof emptyProjectForm;

type GeneratedProjectPhase = {
  name: string;
  description?: string;
  order?: number;
  plannedStartDay?: number | null;
  plannedEndDay?: number | null;
  deliverable?: string;
  requirements?: string[];
  materials?: string[];
  pmbokProcessGroup?: string;
};

function normalizeProjectStatus(value?: string | null): ProjectStatus {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'PLANEJAMENTO') return 'PLANEJADO';
  if (raw === 'EM EXECUCAO' || raw === 'EM EXECUÇÃO' || raw === 'EM PROGRESSO') return 'EM_ANDAMENTO';
  if (raw === 'EM RISCO') return 'PAUSADO';
  if (raw === 'CONCLUÍDO') return 'CONCLUIDO';
  if (['PLANEJADO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'].includes(raw)) {
    return raw as ProjectStatus;
  }
  return 'PLANEJADO';
}

function normalizeProjectPhase(value?: string | null): ProjectPhase {
  const raw = String(value || '').trim().toUpperCase();
  if (['SETUP', 'KICKOFF_INTERNO', 'KICKOFF_EXTERNO', 'EXECUCAO', 'MONITORAMENTO', 'ENCERRAMENTO'].includes(raw)) {
    return raw as ProjectPhase;
  }
  return 'SETUP';
}

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function parseCurrencyValue(value: string) {
  const normalized = String(value || '')
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLookupText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findOptionByName<T extends { name: string }>(options: T[], value?: string | null) {
  const target = normalizeLookupText(value);
  if (!target) return undefined;
  return options.find((option) => normalizeLookupText(option.name) === target)
    || options.find((option) => normalizeLookupText(option.name).includes(target) || target.includes(normalizeLookupText(option.name)));
}

function normalizeAiPriority(value?: string | null): ProjectForm['priority'] | undefined {
  const raw = normalizeLookupText(value);
  if (!raw) return undefined;
  if (raw.includes('critica') || raw.includes('critical') || raw.includes('urgente')) return 'Urgente';
  if (raw.includes('alta') || raw.includes('high')) return 'Alta';
  if (raw.includes('baixa') || raw.includes('low')) return 'Baixa';
  return 'Normal';
}

function normalizeAiDateInput(value?: string | null) {
  const text = String(value || '').trim();
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = text.match(/\b([0-3]?\d)[\/\-.]([0-1]?\d)[\/\-.](\d{4})\b/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return '';
}

function formatAiBudget(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? String(numeric) : '';
}

function formatAiLongText(value: unknown, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function mapProjectToSpace(project: ApiProject, index = 0): Space {
  const metadata = project.metadata && typeof project.metadata === 'object' ? project.metadata : {};
  const colors = ['bg-[#ff7a00]', 'bg-[#18c8df]', 'bg-[#22c55e]', 'bg-[#f6b40b]', 'bg-[#1f7fe5]'];
  const name = project.name || 'Projeto sem nome';

  return {
    id: project.id,
    number: project.number,
    name,
    initial: name.charAt(0).toUpperCase(),
    color: colors[index % colors.length],
    type: project.type,
    companyId: project.companyId || project.company?.id,
    projectManagerId: project.projectManagerId || project.projectManager?.id,
    opportunityId: project.opportunityId || undefined,
    client: project.company?.name || String(metadata.client || ''),
    sponsor: String(metadata.sponsor || ''),
    manager: project.projectManager?.name || String(metadata.manager || ''),
    status: normalizeProjectStatus(project.status),
    phase: normalizeProjectPhase(project.phase),
    priority: (metadata.priority as Space['priority']) || 'Normal',
    startDate: toDateInputValue(project.plannedStartDate),
    endDate: toDateInputValue(project.plannedEndDate),
    budget: project.budget !== undefined && project.budget !== null ? String(project.budget) : '',
    objective: String(metadata.objective || ''),
    scope: String(metadata.scope || project.description || ''),
    deliverables: String(metadata.deliverables || ''),
    successCriteria: String(metadata.successCriteria || ''),
    risks: String(metadata.risks || ''),
    notes: String(metadata.notes || ''),
    createdAt: project.createdAt
  };
}

function normalizeIssueStatus(value?: string | null): Issue['status'] {
  const raw = String(value || '').trim().toUpperCase();
  if (['PENDING', 'TODO'].includes(raw)) return 'PENDENTE';
  if (['IN_PROGRESS', 'IN PROGRESS', 'DOING', 'EM_ANDAMENTO', 'EM EXECUCAO', 'EM EXECUÇÃO'].includes(raw)) return 'EM PROGRESSO';
  if (['AT_RISK', 'RISK', 'BLOCKED', 'PAUSADO'].includes(raw)) return 'EM RISCO';
  if (['DONE', 'COMPLETED', 'CONCLUIDO', 'CONCLUÍDO'].includes(raw)) return 'CONCLUÍDO';
  if (['SKIPPED', 'CANCELLED', 'CANCELED', 'CANCELADO'].includes(raw)) return 'CANCELADO';
  if (['PLANNED', 'PLANEJADO', 'PLANEJAMENTO'].includes(raw)) return 'PLANEJAMENTO';
  return 'PENDENTE';
}

function normalizeIssuePriority(value?: string | null): Issue['priority'] {
  const raw = String(value || '').trim().toUpperCase();
  if (['URGENT', 'URGENTE', 'CRITICAL'].includes(raw)) return 'Urgente';
  if (['HIGH', 'ALTA'].includes(raw)) return 'Alta';
  if (['LOW', 'BAIXA'].includes(raw)) return 'Baixa';
  return 'Normal';
}

function getIssueSequence(issue: Issue) {
  const keyMatch = String(issue.key || '').match(/^[A-Z]+-(\d+)$/i);
  if (keyMatch) return Number(keyMatch[1]);

  const titleMatch = String(issue.title || '').match(/\b(?:Fase|Etapa)\s*(\d+)\b/i);
  if (titleMatch) return Number(titleMatch[1]);

  return Number.MAX_SAFE_INTEGER;
}

function sortIssuesBySequence(items: Issue[]) {
  return [...items].sort((a, b) => {
    const sequenceDiff = getIssueSequence(a) - getIssueSequence(b);
    if (sequenceDiff !== 0) return sequenceDiff;

    const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;

    return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
  });
}

function mapProjectPhaseToIssue(project: ApiProject, phase: ApiProjectPhase): Issue {
  return {
    id: `phase-${phase.id}`,
    projectId: project.id,
    key: phase.order ? `FAS-${String(phase.order).padStart(2, '0')}` : undefined,
    title: phase.name || 'Fase sem nome',
    description: phase.description || '',
    status: normalizeIssueStatus(phase.status),
    priority: 'Normal',
    startDate: toDateInputValue(phase.plannedStartDate || phase.actualStartDate),
    dueDate: toDateInputValue(phase.plannedEndDate || phase.actualEndDate),
    createdAt: phase.createdAt || project.createdAt || new Date().toISOString(),
    updatedAt: phase.updatedAt || project.createdAt || new Date().toISOString()
  };
}

function mapProjectTaskToIssue(project: ApiProject, task: ApiProjectTask): Issue {
  const initials = String(task.assignedTo?.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return {
    id: `task-${task.id}`,
    projectId: project.id,
    key: undefined,
    title: task.title || 'Fase sem nome',
    description: task.description || '',
    status: normalizeIssueStatus(task.status),
    priority: normalizeIssuePriority(task.priority),
    dueDate: toDateInputValue(task.dueDate),
    assignee: task.assignedTo?.name ? {
      id: task.assignedTo.id || '',
      name: task.assignedTo.name,
      initials: initials || task.assignedTo.name.charAt(0).toUpperCase(),
      color: 'bg-[#ff7a00]'
    } : undefined,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString()
  };
}

function getProjectPhaseId(issue: Issue) {
  const id = String(issue.id || '');
  if (!id.startsWith('phase-') || !issue.projectId) return '';
  return id.replace(/^phase-/, '');
}

function issueStatusToProjectPhaseStatus(status?: Issue['status']) {
  switch (status) {
    case 'EM PROGRESSO':
    case 'EM RISCO':
    case 'ATUALIZAÇÃO NECESSÁRIA':
      return 'IN_PROGRESS';
    case 'CONCLUÍDO':
      return 'COMPLETED';
    case 'CANCELADO':
      return 'SKIPPED';
    case 'PENDENTE':
    case 'PLANEJAMENTO':
    case 'EM ESPERA':
    default:
      return 'PENDING';
  }
}

function buildPhaseRequestPayload(issue: Issue) {
  return {
    name: issue.title.trim(),
    description: issue.description || '',
    status: issueStatusToProjectPhaseStatus(issue.status),
    plannedStartDate: issue.startDate || null,
    plannedEndDate: issue.dueDate || null
  };
}

function getStoredProjectIssues(): Issue[] {
  const saved = localStorage.getItem('pm_issues_v4');
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((issue) => issue?.projectId) : [];
  } catch (e) {
    return [];
  }
}

function projectToForm(project: Space): ProjectForm {
  return {
    ...emptyProjectForm,
    name: project.name || '',
    type: project.type || 'B2B',
    companyId: project.companyId || '',
    client: project.client || '',
    sponsor: project.sponsor || '',
    projectManagerId: project.projectManagerId || '',
    manager: project.manager || '',
    status: project.status || 'PLANEJADO',
    phase: project.phase || 'SETUP',
    priority: project.priority || 'Normal',
    startDate: project.startDate || '',
    endDate: project.endDate || '',
    budget: project.budget || '',
    opportunityId: project.opportunityId || '',
    objective: project.objective || '',
    scope: project.scope || '',
    deliverables: project.deliverables || '',
    successCriteria: project.successCriteria || '',
    risks: project.risks || '',
    notes: project.notes || ''
  };
}

export default function App({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate();
  const issueSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [globalView, setGlobalView] = useState('spaces');

  const [issues, setIssues] = useState<Issue[]>(() => {
    return getStoredProjectIssues();
  });

  // Save issues to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pm_issues_v4', JSON.stringify(issues));
  }, [issues]);

  const [spaces, setSpaces] = useState<Space[]>(() => {
    const saved = localStorage.getItem('pm_projects_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed)
          ? parsed.map((space, index) => ({
              ...space,
              status: normalizeProjectStatus(space.status),
              phase: normalizeProjectPhase(space.phase),
              color: space.color || ['bg-[#ff7a00]', 'bg-[#18c8df]', 'bg-[#22c55e]'][index % 3],
              initial: space.initial || String(space.name || 'P').charAt(0).toUpperCase()
            }))
          : [];
      } catch (e) {}
    }
    return [];
  });
  const [activeSpaceId, setActiveSpaceId] = useState<string>('');
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({});
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectLoadError, setProjectLoadError] = useState('');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  // New States
  const [selectedTask, setSelectedTask] = useState<Issue | null>(null);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [projectFormError, setProjectFormError] = useState('');
  const [generatedProjectPhases, setGeneratedProjectPhases] = useState<GeneratedProjectPhase[]>([]);

  useEffect(() => {
    localStorage.setItem('pm_projects_v1', JSON.stringify(spaces));
  }, [spaces]);

  useEffect(() => {
    return () => {
      Object.values(issueSaveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    setProjectLoadError('');

    try {
      const response = await fetch(buildApiUrl('/projetos?limit=200'), {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao carregar projetos`);
      }

      const payload = await response.json();
      const projects = Array.isArray(payload) ? payload : payload.projects || payload.data || [];
      const mapped = Array.isArray(projects) ? projects.map(mapProjectToSpace) : [];
      const apiIssues = Array.isArray(projects)
        ? projects.flatMap((project: ApiProject) => {
            const phaseIssues = Array.isArray(project.phases) ? project.phases.map((phase) => mapProjectPhaseToIssue(project, phase)) : [];
            const taskIssues = Array.isArray(project.tasks) ? project.tasks.map((task) => mapProjectTaskToIssue(project, task)) : [];
            return [...phaseIssues, ...taskIssues];
          })
        : [];
      setIssues((current) => {
        const projectIds = new Set(mapped.map((project) => project.id));
        const apiIssueIds = new Set(apiIssues.map((issue) => issue.id));
        const localProjectIssues = current.filter((issue) => (
          issue.projectId
          && projectIds.has(issue.projectId)
          && !String(issue.id).startsWith('phase-')
          && !String(issue.id).startsWith('task-')
          && !apiIssueIds.has(issue.id)
        ));
        return [...apiIssues, ...localProjectIssues];
      });
      setSpaces(mapped);
      setExpandedSpaces((prev) => {
        const next = { ...prev };
        mapped.forEach((project) => {
          if (next[project.id] === undefined) next[project.id] = true;
        });
        return next;
      });
      setActiveSpaceId((current) => {
        if (current && mapped.some((project) => project.id === current)) return current;
        return mapped[0]?.id || '';
      });
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      setProjectLoadError(error instanceof Error ? error.message : 'Erro ao carregar projetos');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadProjectDependencies = async () => {
    try {
      const [companiesRes, usersRes] = await Promise.all([
        fetch(buildApiUrl('/companies'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/users'), { headers: getAuthHeaders() })
      ]);

      if (companiesRes.ok) {
        const payload = await companiesRes.json();
        const rows = Array.isArray(payload) ? payload : payload.companies || payload.data || [];
        setCompanies(Array.isArray(rows) ? rows : []);
      }

      if (usersRes.ok) {
        const payload = await usersRes.json();
        const rows = Array.isArray(payload) ? payload : payload.users || payload.data || [];
        const assignable = Array.isArray(rows)
          ? rows.filter((user: UserOption) => {
              const role = String(user.role || '').toUpperCase();
              return ['MASTER', 'ADMIN', 'MANAGER', 'DIRECTOR', 'SELLER', 'USER', 'USER_B2B', 'USER_B2G'].includes(role)
                || user.accessManagement
                || user.accessB2B
                || user.accessB2G;
            })
          : [];
        setUsers(assignable);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas e usuários:', error);
    }
  };

  useEffect(() => {
    loadProjects();
    loadProjectDependencies();
  }, []);

  const activeProject = spaces.find(s => s.id === activeSpaceId) || spaces[0];
  const activeProjectIssues = sortIssuesBySequence(issues.filter(issue => {
    if (!activeProject) return false;
    return issue.projectId === activeProject.id;
  }));
  const isDashboardFocus = (globalView === 'spaces' && activeView === 'dashboard') || globalView === 'dashboards';

  const submitNewSpace = async () => {
    const name = projectForm.name.trim();
    const scope = projectForm.scope.trim();
    const objective = projectForm.objective.trim();

    if (!name || !projectForm.companyId || !projectForm.projectManagerId || !scope || !objective) {
      setProjectFormError('Informe nome, cliente, gestor, objetivo e escopo antes de criar o projeto planejado.');
      return;
    }

    if (isCreatingSpace || editingSpaceId) {
      try {
        setProjectFormError('');
        const response = await fetch(buildApiUrl(editingSpaceId ? `/projetos/${editingSpaceId}` : '/projetos'), {
          method: editingSpaceId ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name,
            type: projectForm.type,
            companyId: projectForm.companyId,
            projectManagerId: projectForm.projectManagerId,
            status: projectForm.status,
            phase: projectForm.phase,
            budget: parseCurrencyValue(projectForm.budget),
            plannedStartDate: projectForm.startDate || null,
            plannedEndDate: projectForm.endDate || null,
            opportunityId: projectForm.opportunityId || null,
            description: scope,
            metadata: {
              objective,
              scope,
              methodology: 'PMBOK/PMI',
              charterFramework: 'Project Charter + Declaração de Escopo',
              analysisSource: generatedProjectPhases.length > 0 ? 'GEMINI_AI_ANALYSIS' : 'MANUAL',
              sponsor: projectForm.sponsor.trim(),
              priority: projectForm.priority,
              deliverables: projectForm.deliverables.trim(),
              successCriteria: projectForm.successCriteria.trim(),
              risks: projectForm.risks.trim(),
              notes: projectForm.notes.trim()
            },
            ...(!editingSpaceId && generatedProjectPhases.length > 0 ? { phases: generatedProjectPhases } : {})
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || `Erro ${response.status} ao ${editingSpaceId ? 'atualizar' : 'criar'} projeto`);
        }

        const savedSpace = mapProjectToSpace(payload, spaces.findIndex((project) => project.id === payload.id));
        setSpaces(prev => editingSpaceId
          ? prev.map(project => project.id === savedSpace.id ? { ...project, ...savedSpace } : project)
          : [savedSpace, ...prev.filter(project => project.id !== savedSpace.id)]
        );
        setActiveSpaceId(savedSpace.id);
        setExpandedSpaces(prev => ({ ...prev, [savedSpace.id]: true }));
        setActiveView('dashboard');
        setGlobalView('spaces');
        navigate(`/projetos/${savedSpace.id}`);
      } catch (error) {
        console.error('Erro ao salvar projeto:', error);
        setProjectFormError(error instanceof Error ? error.message : 'Erro ao salvar projeto');
        return;
      }
    }
    setIsCreatingSpace(false);
    setEditingSpaceId(null);
    setProjectForm(emptyProjectForm);
    setGeneratedProjectPhases([]);
    setProjectFormError('');
  };

  const openProject = (projectId: string, view: ViewMode = 'dashboard') => {
    setActiveSpaceId(projectId);
    setGlobalView('spaces');
    setActiveView(view);
    navigate(`/projetos/${projectId}`);
  };

  const editProject = (projectId: string) => {
    const project = spaces.find((item) => item.id === projectId);
    if (!project) return;
    setProjectForm(projectToForm(project));
    setGeneratedProjectPhases([]);
    setEditingSpaceId(projectId);
    setIsCreatingSpace(false);
    setProjectFormError('');
  };

  const deleteProject = async (projectId: string) => {
    const project = spaces.find((item) => item.id === projectId);
    if (!project) return;
    const confirmed = window.confirm(`Excluir o projeto "${project.name}"? Esta ação remove o projeto e suas fases.`);
    if (!confirmed) return;

    try {
      const response = await fetch(buildApiUrl(`/projetos/${projectId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Erro ${response.status} ao excluir projeto`);
      }
      setSpaces(prev => prev.filter(item => item.id !== projectId));
      setIssues(prev => prev.filter(issue => issue.projectId !== projectId));
      setExpandedSpaces(prev => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      setActiveSpaceId(current => {
        if (current !== projectId) return current;
        return spaces.find(item => item.id !== projectId)?.id || '';
      });
      if (activeSpaceId === projectId) {
        setGlobalView('home');
      }
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      alert(error instanceof Error ? error.message : 'Erro ao excluir projeto');
    }
  };

  const getProjectIssueCount = (projectId: string) => {
    return issues.filter(issue => issue.projectId === projectId).length;
  };

  const toggleSpace = (id: string) => {
    setExpandedSpaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [isCreatingTaskGlobal, setIsCreatingTaskGlobal] = useState(false);

  // Create a new task test flow
  const handleCreateTask = () => {
    setIsCreatingTaskGlobal(true);
  };

  const saveProjectPhaseIssue = async (issue: Issue) => {
    const phaseId = getProjectPhaseId(issue);
    if (!phaseId || !issue.projectId) return;

    const payload = buildPhaseRequestPayload(issue);
    if (!payload.name) throw new Error('Informe o nome da fase antes de salvar.');

    const response = await fetch(buildApiUrl(`/projetos/${issue.projectId}/phases/${phaseId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responsePayload.error || `Erro ${response.status} ao salvar fase`);
    }
  };

  const scheduleProjectPhaseSave = (issue: Issue) => {
    const phaseId = getProjectPhaseId(issue);
    if (!phaseId || !issue.title.trim()) return;

    if (issueSaveTimers.current[issue.id]) {
      clearTimeout(issueSaveTimers.current[issue.id]);
    }

    issueSaveTimers.current[issue.id] = setTimeout(() => {
      saveProjectPhaseIssue(issue).catch((error) => {
        console.error('Erro ao salvar fase:', error);
        alert(error instanceof Error ? error.message : 'Erro ao salvar fase');
      });
    }, 700);
  };

  const handlePersistedIssueChange = async (updatedIssue: Issue, previousIssue: Issue) => {
    try {
      await saveProjectPhaseIssue(updatedIssue);
    } catch (error) {
      setIssues(prev => prev.map(issue => issue.id === previousIssue.id ? previousIssue : issue));
      console.error('Erro ao salvar fase:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar fase');
    }
  };

  const handleGlobalCreateTaskSubmit = async (title: string, data: any) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || !activeProject?.id) return;

    try {
      const response = await fetch(buildApiUrl(`/projetos/${activeProject.id}/phases`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: normalizedTitle,
          description: data.description || '',
          status: issueStatusToProjectPhaseStatus(data.status || 'PENDENTE'),
          plannedEndDate: data.dueDate || null
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Erro ${response.status} ao criar fase`);
      }

      const newTask = {
        ...mapProjectPhaseToIssue({ id: activeProject.id, createdAt: activeProject.createdAt } as ApiProject, payload),
        priority: data.priority || 'Normal',
        assignee: data.assignee,
        customFields: data.customFields || []
      };
      setIssues(prev => [...prev.filter(issue => issue.id !== newTask.id), newTask]);
      setIsCreatingTaskGlobal(false);

      if (data.phaseKind === 'KICKOFF_INTERNO' || data.phaseKind === 'KICKOFF_EXTERNO') {
        const kickoffContext = {
          source: 'project-management',
          projectId: activeProject.id,
          projectName: activeProject.name,
          projectClient: activeProject.client,
          projectManager: activeProject.manager,
          projectScope: activeProject.scope,
          projectObjective: activeProject.objective,
          phaseId: newTask.id,
          phaseTitle: normalizedTitle,
          phaseDescription: data.description || '',
          kickoffType: data.phaseKind === 'KICKOFF_INTERNO' ? 'internal' : 'external',
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('pm_kickoff_context', JSON.stringify(kickoffContext));
        navigate(`/kickoff?from=project&openCreate=1&type=${kickoffContext.kickoffType}`);
      }
    } catch (error) {
      console.error('Erro ao criar fase:', error);
      alert(error instanceof Error ? error.message : 'Erro ao criar fase');
    }
  };

  const handleUpdateIssue = (updatedIssue: Issue) => {
    setIssues(prev => prev.map(issue => issue.id === updatedIssue.id ? updatedIssue : issue));
    setSelectedTask(updatedIssue);
    scheduleProjectPhaseSave(updatedIssue);
  };

  return (
    <div className="flex h-screen bg-[#050914] font-sans overflow-hidden text-slate-300 text-sm">

      {/* Far Left Thin Navigation */}
      {!isDashboardFocus && (
      <nav className="w-16 bg-[#050914] flex-shrink-0 flex flex-col items-center py-4 border-r border-[#263345] z-30">
        <div className="w-8 h-8 bg-[#22c55e] rounded text-white flex items-center justify-center font-bold mb-6 cursor-pointer shadow-[0_0_22px_rgba(34,197,94,0.25)]">
          C
        </div>

        <div className="flex flex-col gap-4 w-full px-2">
          <NavItem icon={Home} label="Início" active={globalView === 'home'} onClick={() => setGlobalView('home')} />
          <NavItem icon={Compass} label="Projetos" active={globalView === 'spaces'} onClick={() => setGlobalView('spaces')} />
          <NavItem icon={CheckSquare} label="Planejado" active={globalView === 'planned'} onClick={() => setGlobalView('planned')} />
          <NavItem icon={Users} label="Equipes" active={globalView === 'teams'} onClick={() => setGlobalView('teams')} />
          <NavItem icon={FileText} label="Documentos" active={globalView === 'docs'} onClick={() => setGlobalView('docs')} />
          <NavItem icon={BarChart2} label="Painéis" active={globalView === 'dashboards'} onClick={() => setGlobalView('dashboards')} />
          <NavItem icon={LayoutTemplate} label="Quadros" active={globalView === 'whiteboards'} onClick={() => setGlobalView('whiteboards')} />
        </div>
      </nav>
      )}

      {/* Second Sidebar (Spaces) */}
      {globalView === 'spaces' && !isDashboardFocus && (
        <aside className="w-[280px] bg-[#111827] flex-shrink-0 flex flex-col h-full border-r border-[#263345] z-20">
          <div className="p-4 flex items-center justify-between border-b border-[#263345] bg-[linear-gradient(90deg,rgba(255,122,0,0.13),transparent)]">
          <h2 className="font-semibold text-slate-100">Projetos</h2>
          <button onClick={() => setIsCreatingSpace(true)} className="bg-[#ff7a00] hover:bg-[#f6b40b] text-white hover:text-[#050914] text-xs font-semibold px-3 py-2 rounded flex items-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> Criar
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div
            className="flex items-center gap-2 text-slate-400 hover:bg-[#1f2937] p-1.5 rounded cursor-pointer mb-4"
            onClick={() => setGlobalView('home')}
          >
            <LayoutTemplate className="w-4 h-4" />
            <span className="text-sm">Todos os projetos</span>
          </div>

          <div className="flex flex-col gap-2">
            {spaces.map(space => (
              <div key={space.id}>
                <div
                  className={cn("flex items-center justify-between p-2 rounded cursor-pointer group", activeSpaceId === space.id ? "bg-[#263345] text-slate-100 ring-1 ring-[#ff7a00]/35" : "text-slate-300 hover:bg-[#1f2937]")}
                  onClick={() => setActiveSpaceId(space.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-bold text-white", space.color)}>{space.initial}</div>
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-sm">{space.name}</span>
                      <span className="block truncate text-[10px] text-slate-500">{space.client || space.status || 'Projeto'}</span>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn("w-4 h-4 transition-transform", expandedSpaces[space.id] ? "rotate-180 text-slate-300" : "opacity-0 group-hover:opacity-100")}
                    onClick={(e) => { e.stopPropagation(); toggleSpace(space.id); }}
                  />
                </div>

                {expandedSpaces[space.id] && (
                  <div className="ml-5 mt-1 border-l border-slate-700 pl-2 flex flex-col gap-1">
                    <div
                      className={cn("flex items-center justify-between p-1.5 rounded cursor-pointer", activeView === 'list' && activeSpaceId === space.id ? 'bg-[#263345] text-slate-100' : 'text-slate-400 hover:bg-[#1f2937]')}
                      onClick={() => { setActiveView('list'); setActiveSpaceId(space.id); }}
                    >
                      <div className="flex items-center gap-2">
                        <ListIcon className="w-4 h-4" />
                        <span className="text-sm">Fases</span>
                      </div>
                      <span className="text-xs text-slate-500">{getProjectIssueCount(space.id)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div onClick={() => setIsCreatingSpace(true)} className="flex items-center gap-2 text-slate-500 hover:text-[#ffb15c] p-1.5 ml-5 rounded cursor-pointer mt-1">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-sm">Novo Projeto</span>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#070b16]">

        {/* Top Global Bar */}
        {!isDashboardFocus && (
        <header className="h-12 border-b border-[#263345] px-4 flex items-center justify-between bg-[#111827] flex-shrink-0">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-8 items-center gap-1.5 rounded-md border border-[#374151] px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[#ff7a00] hover:bg-[#1f2937] hover:text-white"
                title="Voltar ao CRM"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer hover:bg-[#1f2937] px-2 py-1 rounded transition-colors">
              <div className="w-5 h-5 bg-[#22c55e] rounded text-white flex items-center justify-center font-bold text-xs">C</div>
              <span className="font-semibold text-slate-200">Gestão de Projetos</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="flex-1 max-w-lg mx-4 flex items-center gap-2">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-8 pr-3 py-1 bg-[#0d1423] border border-[#374151] rounded-md text-slate-300 placeholder-slate-500 focus:outline-none focus:border-[#ff7a00] text-xs transition-colors"
                placeholder="Pesquisar ⌘ K"
                onClick={() => alert('Pesquisa global ativada. Use ⌘ K para buscar fases, documentos ou pessoas.')}
              />
            </div>
            <button onClick={() => alert('Abrindo painel de Chat com IA...')} className="bg-[#0d1423] hover:bg-[#1f2937] border border-[#374151] text-slate-300 px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2 transition-colors">
              Chats com IA <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <CheckCircle2 onClick={() => setGlobalView('planned')} className="w-5 h-5 hover:text-slate-200 cursor-pointer" />
            <Bell onClick={() => alert('Painel de Notificações')} className="w-5 h-5 hover:text-slate-200 cursor-pointer" />
            <div onClick={() => alert('Menu do Perfil')} className="w-6 h-6 rounded-full bg-[#ff7a00] flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#111827] cursor-pointer">
              CH
            </div>
          </div>
        </header>
        )}

        {globalView === 'spaces' ? (
          isDashboardFocus ? (
            <div className="flex-1 overflow-hidden bg-[#070b16]">
              <Dashboard
                projects={spaces}
                issues={issues}
                activeProjectId={activeSpaceId}
                onProjectChange={setActiveSpaceId}
                onBack={() => setActiveView('list')}
                onCreateProject={() => setIsCreatingSpace(true)}
              />
            </div>
          ) : (
          <>
            {/* Project Header & Tabs */}
            <div className="bg-[#111827] border-b border-[#263345] flex-shrink-0">
          <div className="px-6 pt-4 pb-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xl font-bold text-slate-200">
                <div className={cn("w-5 h-5 rounded-sm text-[10px] flex items-center justify-center font-bold text-white mr-1", activeProject?.color || "bg-slate-700")}>
                  {activeProject?.initial || "P"}
                </div>
                {activeProject?.name || (isLoadingProjects ? "Carregando projetos..." : "Projetos")} <span className="text-slate-500 font-normal">/</span>
                <ListIcon className="w-5 h-5 text-slate-400 ml-1" /> Fases
                <ChevronDown className="w-5 h-5 text-slate-500 cursor-pointer" />
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <button onClick={() => alert('Funcionalidade de Agentes será lançada em breve')} className="hover:text-slate-200 flex items-center gap-1"><Users2 className="w-4 h-4" /> Agentes</button>
                <button onClick={() => alert('ClickUp Brain em processamento...')} className="hover:text-slate-200 flex items-center gap-1"><Sparkles className="w-4 h-4 text-teal-400" /> Brain</button>
                <button onClick={() => alert('Compartilhar este projeto com outras pessoas')} className="hover:text-slate-200 flex items-center gap-1"><Users className="w-4 h-4" /> Compartilhar</button>
              </div>
            </div>

            <div className="flex items-center gap-6 overflow-x-auto text-sm font-medium hide-scrollbar">
              <Tab icon={Users} label="Equipe" active={activeView === 'team'} onClick={() => setActiveView('team')} />
              <Tab icon={BarChart2} label="Painéis" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
              <Tab icon={ListIcon} label="Lista" active={activeView === 'list'} onClick={() => setActiveView('list')} />
              <Tab icon={LayoutTemplate} label="Quadro" active={activeView === 'board'} onClick={() => setActiveView('board')} />
              <Tab icon={Calendar} label="Calendário" active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} />
              <Tab icon={GanttChartSquare} label="Gantt" active={activeView === 'gantt'} onClick={() => setActiveView('gantt')} />
              <Tab icon={Activity} label="Atividade" active={activeView === 'activity'} onClick={() => setActiveView('activity')} />
              <Tab icon={ListIcon} label="Carga de trabalho" active={activeView === 'workload'} onClick={() => setActiveView('workload')} />
              <div className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer pb-2">
                <Plus className="w-4 h-4" /> Visualização
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 flex flex-col gap-3 flex-shrink-0 bg-[#070b16] border-b border-[#263345]">
          {activeProject && (
            <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
              <div className="rounded-lg border border-[#263345] bg-[#111827] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#8f9caf]">Escopo</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-200">{activeProject.scope || 'Escopo ainda não informado.'}</p>
              </div>
              <div className="rounded-lg border border-[#263345] bg-[#111827] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#8f9caf]">Objetivo</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-200">{activeProject.objective || 'Objetivo ainda não informado.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#263345] bg-[linear-gradient(140deg,rgba(255,122,0,0.16),rgba(17,24,39,0.98))] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8f9caf]">Status</p>
                  <p className="mt-1 text-sm font-black text-[#ffb15c]">{PROJECT_STATUS_LABELS[activeProject.status || 'PLANEJADO']}</p>
                </div>
                <div className="rounded-lg border border-[#263345] bg-[linear-gradient(140deg,rgba(34,197,94,0.14),rgba(17,24,39,0.98))] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8f9caf]">Fases</p>
                  <p className="mt-1 text-sm font-black text-[#22c55e]">{activeProjectIssues.length}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => alert('Controles de Visão (Filtros, Agrupamento)')} className="bg-[#111827] hover:bg-[#1f2937] text-slate-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 border border-[#374151]">
              <LayersIcon className="w-4 h-4 text-[#ff7a00]" /> Controles
            </button>

          <div className="ml-auto flex items-center gap-3 text-slate-400">
            <button onClick={() => alert('Busca específica na lista atual')} className="hover:bg-[#111827] p-1.5 rounded"><Search className="w-4 h-4" /></button>
            <button onClick={() => alert('Configurações da visualização atual')} className="hover:bg-[#111827] p-1.5 rounded"><Settings className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <button onClick={handleCreateTask} className="bg-[#ff7a00] hover:bg-[#f6b40b] text-white hover:text-[#050914] px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Fase <ChevronDown className="w-3 h-3 ml-1" />
            </button>
          </div>
          </div>
        </div>

        {/* View Renderer */}
        <div className="flex-1 overflow-hidden relative bg-[#070b16]">
          {projectLoadError && (
            <div className="m-6 rounded-md border border-[#ff7a00]/35 bg-[#ff7a00]/10 px-4 py-3 text-sm font-semibold text-[#ffb15c]">
              {projectLoadError}
            </div>
          )}
          {!isLoadingProjects && spaces.length === 0 && !projectLoadError && (
            <div className="m-6 rounded-lg border border-[#263345] bg-[#111827] p-8 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-[#ff7a00]" />
              <h2 className="text-lg font-black text-slate-100">Nenhum projeto cadastrado</h2>
              <p className="mt-2 text-sm text-slate-500">Crie o primeiro projeto para iniciar o planejamento.</p>
              <button onClick={() => setIsCreatingSpace(true)} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#ff7a00] px-4 py-2 text-sm font-black text-white hover:bg-[#f6b40b] hover:text-[#050914]">
                <Plus className="h-4 w-4" />
                Novo Projeto
              </button>
            </div>
          )}
          {activeView === 'board' && activeProject && <KanbanBoard issues={activeProjectIssues} setIssues={setIssues} onTaskClick={setSelectedTask} onCreateTask={handleGlobalCreateTaskSubmit} onIssueChange={handlePersistedIssueChange} />}
          {activeView === 'list' && activeProject && <ListView issues={activeProjectIssues} onTaskClick={setSelectedTask} />}
          {activeView === 'dashboard' && (
            <Dashboard
              projects={spaces}
              issues={issues}
              activeProjectId={activeSpaceId}
              onProjectChange={setActiveSpaceId}
              onBack={() => setActiveView('list')}
              onCreateProject={() => setIsCreatingSpace(true)}
            />
          )}
          {activeView === 'team' && <TeamView />}
          {activeView === 'calendar' && <CalendarView issues={activeProjectIssues} onTaskClick={setSelectedTask} />}
          {activeView === 'gantt' && <GanttView issues={activeProjectIssues} />}
          {activeView === 'activity' && <ActivityView />}
          {activeView === 'workload' && <WorkloadView issues={activeProjectIssues} />}
        </div>

          </>
          )
        ) : (
          <div className="flex-1 overflow-hidden relative bg-[#070b16]">
            {globalView === 'home' && (
              <HomeView
                projects={spaces}
                getPhaseCount={getProjectIssueCount}
                onCreateProject={() => {
                  setIsCreatingSpace(true);
                  setGeneratedProjectPhases([]);
                  setGlobalView('spaces');
                }}
                onOpenDashboard={() => {
                  setGlobalView('spaces');
                  setActiveView('dashboard');
                }}
                onViewProject={(projectId) => openProject(projectId, 'dashboard')}
                onEditProject={editProject}
                onDeleteProject={deleteProject}
              />
            )}
            {globalView === 'planned' && (
              <PlannedView
                projects={spaces}
                issues={issues}
                onCreateProject={() => {
                  setGlobalView('spaces');
                  setIsCreatingSpace(true);
                }}
                onOpenProject={(projectId) => {
                  setActiveSpaceId(projectId);
                  setGlobalView('spaces');
                  setActiveView('dashboard');
                }}
              />
            )}
            {globalView === 'teams' && <TeamView />}
            {globalView === 'docs' && (
              <DocsView
                projects={spaces}
                activeProjectId={activeSpaceId}
                onProjectChange={setActiveSpaceId}
                onCreateProject={() => {
                  setGlobalView('spaces');
                  setIsCreatingSpace(true);
                }}
              />
            )}
            {globalView === 'dashboards' && (
              <Dashboard
                projects={spaces}
                issues={issues}
                activeProjectId={activeSpaceId}
                onProjectChange={setActiveSpaceId}
                onBack={() => setGlobalView('home')}
                onCreateProject={() => {
                  setGlobalView('spaces');
                  setIsCreatingSpace(true);
                }}
              />
            )}
            {globalView === 'whiteboards' && <WhiteboardsView />}
          </div>
        )}
      </main>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleUpdateIssue} />
      )}

      {isCreatingTaskGlobal && (
        <CreateTaskModal
          onClose={() => setIsCreatingTaskGlobal(false)}
          onCreate={handleGlobalCreateTaskSubmit}
        />
      )}

      {(isCreatingSpace || editingSpaceId) && (
        <ProjectCreateModal
          mode={editingSpaceId ? 'edit' : 'create'}
          form={projectForm}
          error={projectFormError}
          generatedPhases={generatedProjectPhases}
          companies={companies}
          users={users}
          statusOptions={PROJECT_STATUS_OPTIONS}
          onChange={(patch) => {
            setProjectForm(prev => ({ ...prev, ...patch }));
            setProjectFormError('');
          }}
          onAnalyzeResult={(patch, phases) => {
            setProjectForm(prev => ({ ...prev, ...patch }));
            setGeneratedProjectPhases(phases);
            setProjectFormError('');
          }}
          onCancel={() => {
            setIsCreatingSpace(false);
            setEditingSpaceId(null);
            setProjectForm(emptyProjectForm);
            setGeneratedProjectPhases([]);
            setProjectFormError('');
          }}
          onSubmit={submitNewSpace}
        />
      )}
    </div>
  );
}

function ProjectCreateModal({
  mode = 'create',
  form,
  error,
  generatedPhases = [],
  companies,
  users,
  statusOptions,
  onChange,
  onAnalyzeResult,
  onCancel,
  onSubmit
}: {
  mode?: 'create' | 'edit';
  form: ProjectForm;
  error: string;
  generatedPhases?: GeneratedProjectPhase[];
  companies: CompanyOption[];
  users: UserOption[];
  statusOptions: Array<{ value: ProjectStatus; label: string }>;
  onChange: (patch: Partial<ProjectForm>) => void;
  onAnalyzeResult: (patch: Partial<ProjectForm>, phases: GeneratedProjectPhase[]) => void;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiFileInputKey, setAiFileInputKey] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const fieldClass = "w-full rounded-md border border-[#374151] bg-[#070b16] px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-[#ff7a00] focus:ring-2 focus:ring-[#ff7a00]/20";
  const labelClass = "text-[11px] font-bold uppercase tracking-wide text-[#8f9caf]";
  const filteredCompanies = companies.filter((company) => !company.clientType || String(company.clientType).toUpperCase() === form.type);
  const filteredUsers = users.filter((user) => {
    if (form.type === 'B2G') return user.accessB2G || ['MASTER', 'ADMIN', 'MANAGER', 'DIRECTOR', 'USER_B2G'].includes(String(user.role || '').toUpperCase());
    return user.accessB2B || ['MASTER', 'ADMIN', 'MANAGER', 'DIRECTOR', 'SELLER', 'USER', 'USER_B2B'].includes(String(user.role || '').toUpperCase());
  });

  const handleAnalyzeWithAi = async () => {
    const sourceText = aiSourceText.trim();
    if (!sourceText && !aiFile) {
      setAiError('Anexe o edital/projeto ou cole o texto antes de usar a IA.');
      return;
    }

    setIsAnalyzing(true);
    setAiError('');

    try {
      const formData = new FormData();
      if (sourceText) formData.append('sourceText', sourceText);
      if (aiFile) formData.append('file', aiFile);
      formData.append('projectName', form.name);
      formData.append('projectType', form.type);
      formData.append('client', form.client);

      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/projetos/ai-analyze'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAiError(payload.error || `Erro ${response.status} ao analisar com IA`);
        return;
      }

      const analysis = payload.analysis || {};
      const matchedCompany = findOptionByName(companies, analysis.client || form.client);
      const matchedManager = findOptionByName(users, analysis.manager || form.manager);
      const nextType = String(matchedCompany?.clientType || analysis.type || form.type).toUpperCase() === 'B2G' ? 'B2G' : 'B2B';
      const aiPriority = normalizeAiPriority(analysis.priority);
      onAnalyzeResult({
        name: analysis.name || form.name,
        type: nextType,
        companyId: matchedCompany?.id || form.companyId,
        client: matchedCompany?.name || analysis.client || form.client,
        sponsor: analysis.sponsor || form.sponsor,
        projectManagerId: matchedManager?.id || form.projectManagerId,
        manager: matchedManager?.name || analysis.manager || form.manager,
        budget: formatAiBudget(analysis.budget) || form.budget,
        startDate: normalizeAiDateInput(analysis.startDate) || form.startDate,
        endDate: normalizeAiDateInput(analysis.endDate) || form.endDate,
        objective: analysis.objective || form.objective,
        scope: analysis.scope || form.scope,
        deliverables: formatAiLongText(analysis.deliverables, form.deliverables),
        successCriteria: formatAiLongText(analysis.successCriteria, form.successCriteria),
        risks: formatAiLongText(analysis.risks, form.risks),
        notes: analysis.notes || form.notes,
        status: normalizeProjectStatus(analysis.status || 'PLANEJADO'),
        priority: aiPriority || form.priority,
        phase: 'SETUP'
      }, Array.isArray(analysis.phases) ? analysis.phases : []);
    } catch (error) {
      console.error('Erro ao analisar projeto com IA:', error);
      setAiError(error instanceof Error ? error.message : 'Erro ao analisar projeto com IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#374151] bg-[#0b1020] shadow-2xl">
        <div className="relative overflow-hidden border-b border-[#263345] bg-[radial-gradient(circle_at_12%_0%,rgba(255,122,0,0.28),transparent_28%),linear-gradient(120deg,#111827,#070b16_58%,#111827)] px-6 py-5">
          <div className="absolute right-10 top-0 h-24 w-24 rounded-full bg-[#22c55e]/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ff7a00] text-white shadow-[0_0_24px_rgba(255,122,0,0.28)]">
                  <Briefcase className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-[#f6b40b]/40 bg-[#f6b40b]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#f6b40b]">
                  {mode === 'edit' ? 'Editar projeto' : 'Novo projeto'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-100">
                {mode === 'edit' ? 'Editar cadastro do projeto' : 'Cadastro completo do projeto'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                {mode === 'edit' ? 'Atualize escopo, objetivo, responsáveis e governança do projeto.' : 'Escopo, objetivo, responsáveis e critérios entram antes da criação das fases.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[#374151] bg-[#111827]/80 p-2 text-slate-400 transition-colors hover:border-[#ff7a00] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-md border border-[#ff7a00]/40 bg-[#ff7a00]/10 px-4 py-3 text-sm font-semibold text-[#ffb15c]">
              {error}
            </div>
          )}

          {mode === 'create' && (
            <div className="mb-5 rounded-lg border border-[#263345] bg-[#111827] p-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-slate-100">
                    <Sparkles className="h-4 w-4 text-[#18c8df]" />
                    Analisar com IA PMBOK/PMI
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Anexe o edital/projeto ou cole o conteúdo para preencher requisitos, escopo e fases.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[#18c8df]/45 bg-[#18c8df]/10 px-4 py-2 text-xs font-black text-[#67e8f9] transition-colors hover:border-[#67e8f9] hover:bg-[#18c8df]/15">
                    <Upload className="h-3.5 w-3.5" />
                    Anexar edital/projeto
                    <input
                      key={aiFileInputKey}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown,text/csv,application/json"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setAiFile(file);
                        setAiError('');
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAnalyzeWithAi}
                    disabled={isAnalyzing}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#18c8df] px-4 py-2 text-xs font-black text-[#050914] transition-colors hover:bg-[#67e8f9] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isAnalyzing ? 'Analisando...' : 'Gerar requisitos e fases'}
                  </button>
                </div>
              </div>
              {aiFile && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-[#263345] bg-[#070b16] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-[#18c8df]" />
                    <span className="truncate text-xs font-semibold text-slate-300">{aiFile.name}</span>
                    <span className="text-[11px] text-slate-600">{Math.max(1, Math.round(aiFile.size / 1024))} KB</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAiFile(null);
                      setAiFileInputKey((value) => value + 1);
                      setAiError('');
                    }}
                    className="rounded-md p-1 text-slate-500 transition-colors hover:bg-[#1f2937] hover:text-white"
                    title="Remover anexo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <textarea
                className={`${fieldClass} min-h-[120px] resize-y`}
                value={aiSourceText}
                onChange={(e) => {
                  setAiSourceText(e.target.value);
                  setAiError('');
                }}
                placeholder="Opcional: cole aqui também trechos do edital, termo de referência, requisitos técnicos, prazos e entregáveis..."
              />
              {aiError && (
                <div className="mt-3 rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
                  {aiError}
                </div>
              )}
              {generatedPhases.length > 0 && (
                <div className="mt-4 rounded-md border border-[#18c8df]/25 bg-[#18c8df]/5 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-[#18c8df]">{generatedPhases.length} fases geradas</p>
                    <span className="text-[11px] font-semibold text-slate-500">Serão criadas junto com o projeto</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {generatedPhases.map((phase, index) => (
                      <div key={`${phase.name}-${index}`} className="rounded-md border border-[#263345] bg-[#070b16] p-3">
                        <p className="text-xs font-black text-slate-100">{index + 1}. {phase.name}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{phase.description || phase.deliverable || 'Fase gerada pela IA.'}</p>
                        {phase.pmbokProcessGroup && (
                          <p className="mt-2 text-[11px] font-bold text-[#67e8f9]">{phase.pmbokProcessGroup}</p>
                        )}
                        {(phase.plannedStartDay || phase.plannedEndDay) && (
                          <p className="mt-2 text-[11px] font-bold text-[#ffb15c]">
                            Dia {phase.plannedStartDay || '?'} a {phase.plannedEndDay || '?'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 lg:col-span-2">
              <span className={labelClass}>Nome do projeto *</span>
              <input className={fieldClass} value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ex.: Implantação Paranacidade" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Tipo</span>
              <select
                className={fieldClass}
                value={form.type}
                onChange={(e) => onChange({ type: e.target.value as ProjectForm['type'], companyId: '', client: '' })}
              >
                <option value="B2B">B2B Privado</option>
                <option value="B2G">B2G Governo</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Cliente *</span>
              <select
                className={fieldClass}
                value={form.companyId}
                onChange={(e) => {
                  const company = companies.find((item) => item.id === e.target.value);
                  onChange({
                    companyId: e.target.value,
                    client: company?.name || '',
                    type: (String(company?.clientType || form.type).toUpperCase() === 'B2G' ? 'B2G' : 'B2B') as ProjectForm['type']
                  });
                }}
              >
                <option value="">Selecione...</option>
                {filteredCompanies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Patrocinador</span>
              <input className={fieldClass} value={form.sponsor} onChange={(e) => onChange({ sponsor: e.target.value })} placeholder="Sponsor" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Gerente *</span>
              <select
                className={fieldClass}
                value={form.projectManagerId}
                onChange={(e) => {
                  const user = users.find((item) => item.id === e.target.value);
                  onChange({ projectManagerId: e.target.value, manager: user?.name || '' });
                }}
              >
                <option value="">Selecione...</option>
                {filteredUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}{user.email ? ` - ${user.email}` : ''}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Orçamento</span>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#22c55e]" />
                <input className={`${fieldClass} pl-9`} value={form.budget} onChange={(e) => onChange({ budget: e.target.value })} placeholder="R$ 0,00" />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Status</span>
              <select className={fieldClass} value={form.status} onChange={(e) => onChange({ status: e.target.value as ProjectForm['status'] })}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Prioridade</span>
              <select className={fieldClass} value={form.priority} onChange={(e) => onChange({ priority: e.target.value as ProjectForm['priority'] })}>
                <option>Baixa</option>
                <option>Normal</option>
                <option>Alta</option>
                <option>Urgente</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Início</span>
                <input type="date" className={fieldClass} value={form.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Fim</span>
                <input type="date" className={fieldClass} value={form.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Objetivo *</span>
              <textarea className={`${fieldClass} min-h-[110px] resize-none`} value={form.objective} onChange={(e) => onChange({ objective: e.target.value })} placeholder="Resultado esperado e impacto do projeto" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Escopo *</span>
              <textarea className={`${fieldClass} min-h-[110px] resize-none`} value={form.scope} onChange={(e) => onChange({ scope: e.target.value })} placeholder="O que entra e os limites principais do projeto" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Entregáveis</span>
              <textarea className={`${fieldClass} min-h-[90px] resize-none`} value={form.deliverables} onChange={(e) => onChange({ deliverables: e.target.value })} placeholder="Pacotes, documentos, homologações e entregas" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Critérios de sucesso</span>
              <textarea className={`${fieldClass} min-h-[90px] resize-none`} value={form.successCriteria} onChange={(e) => onChange({ successCriteria: e.target.value })} placeholder="Indicadores, aceite e metas" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Riscos</span>
              <textarea className={`${fieldClass} min-h-[90px] resize-none`} value={form.risks} onChange={(e) => onChange({ risks: e.target.value })} placeholder="Dependências, bloqueios e pontos de atenção" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Observações</span>
              <textarea className={`${fieldClass} min-h-[90px] resize-none`} value={form.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Contexto adicional" />
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-[#374151] bg-[linear-gradient(140deg,rgba(255,122,0,0.16),rgba(17,24,39,0.96))] p-3">
              <Target className="mb-3 h-5 w-5 text-[#ff7a00]" />
              <p className="text-xs font-bold text-slate-100">Objetivo definido</p>
              <p className="mt-1 text-[11px] text-slate-500">{form.objective.trim() ? 'Pronto para validação executiva.' : 'Pendente'}</p>
            </div>
            <div className="rounded-lg border border-[#374151] bg-[linear-gradient(140deg,rgba(246,180,11,0.14),rgba(17,24,39,0.96))] p-3">
              <FileText className="mb-3 h-5 w-5 text-[#f6b40b]" />
              <p className="text-xs font-bold text-slate-100">Escopo registrado</p>
              <p className="mt-1 text-[11px] text-slate-500">{form.scope.trim() ? 'Base para montar as fases.' : 'Pendente'}</p>
            </div>
            <div className="rounded-lg border border-[#374151] bg-[linear-gradient(140deg,rgba(34,197,94,0.14),rgba(17,24,39,0.96))] p-3">
              <CheckCircle2 className="mb-3 h-5 w-5 text-[#22c55e]" />
              <p className="text-xs font-bold text-slate-100">Governança</p>
              <p className="mt-1 text-[11px] text-slate-500">{form.manager.trim() || form.sponsor.trim() ? 'Responsáveis informados.' : 'Pendente'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#263345] bg-[#111827] px-6 py-4">
          <button type="button" onClick={onCancel} className="rounded-md border border-[#374151] px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-[#1f2937] hover:text-white">
            Cancelar
          </button>
          <button type="button" onClick={onSubmit} className="rounded-md bg-[#ff7a00] px-5 py-2 text-sm font-black text-white shadow-[0_0_24px_rgba(255,122,0,0.2)] transition-colors hover:bg-[#f6b40b] hover:text-[#050914]">
            {mode === 'edit' ? 'Salvar alterações' : 'Criar projeto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-full py-2 px-1 rounded-md transition-colors group",
      active ? "text-[#ff7a00] bg-[#ff7a00]/10" : "text-slate-500 hover:text-slate-300 hover:bg-[#263345]"
    )}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

function Tab({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 pb-2 border-b-2 transition-colors whitespace-nowrap",
        active ? "border-[#ff7a00] text-slate-200" : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-[#ff7a00]" : "")} />
      {label}
    </button>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 12 12 17 22 12"/>
      <polyline points="2 17 12 22 22 17"/>
    </svg>
  );
}
