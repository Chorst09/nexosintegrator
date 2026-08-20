import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl, getAuthHeaders } from '../config/api';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';
import { FolderKanban, Plus, Rocket, AlertTriangle, TrendingUp, Search, Filter, Eye, Pencil, Trash2 } from 'lucide-react';

const statusColors = {
  PLANEJADO: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAUSADO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONCLUIDO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const phaseColors = {
  SETUP: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  KICKOFF_INTERNO: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  KICKOFF_EXTERNO: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  EXECUCAO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MONITORAMENTO: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  ENCERRAMENTO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

const healthColors = (score) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export default function Projetos() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [createForm, setCreateForm] = useState({ name: '', type: 'B2B', companyId: '', projectManagerId: '', budget: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projRes, dashRes] = await Promise.all([
        fetch(buildApiUrl('/projetos'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/projetos/dashboard'), { headers: getAuthHeaders() })
      ]);
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData.projects || []);
      }
      if (dashRes.ok) setDashboard(await dashRes.json());
    } catch (e) {
      console.error('Erro ao carregar projetos:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      const [compRes, userRes] = await Promise.all([
        fetch(buildApiUrl('/companies'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl('/users'), { headers: getAuthHeaders() })
      ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (userRes.ok) setUsers(await userRes.json());
    } catch (e) {
      console.error('Erro ao carregar dados do formulário:', e);
    }
  };

  const handleOpenCreate = () => {
    loadFormData();
    setShowCreateModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(buildApiUrl('/projetos'), {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        const project = await res.json();
        setShowCreateModal(false);
        navigate(`/projetos/${project.id}`);
      }
    } catch (e) {
      console.error('Erro ao criar projeto:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      await fetch(buildApiUrl(`/projetos/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Erro ao deletar projeto:', e);
    }
  };

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.number?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterType && p.type !== filterType) return false;
      return true;
    });
  }, [projects, search, filterStatus, filterType]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Projetos"
        subtitle="Gerencie o ciclo de vida completo dos projetos"
        gradient="green"
        actions={
          <button onClick={handleOpenCreate} className="crm-btn crm-btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo Projeto
          </button>
        }
      />

      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={FolderKanban} label="Total de Projetos" value={dashboard.total} color="blue" />
          <StatsCard icon={Rocket} label="Em Execução" value={dashboard.active} color="green" />
          <StatsCard icon={AlertTriangle} label="Com Atraso" value={dashboard.delayed} color="red" />
          <StatsCard icon={TrendingUp} label="Margem Média" value={`${(dashboard.avgMargin || 0).toFixed(1)}%`} color="purple" />
        </div>
      )}

      <div className="crm-panel p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--crm-muted)]" />
            <input
              type="text"
              placeholder="Buscar por nome ou número..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="crm-input pl-9 w-full"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="crm-input w-auto">
            <option value="">Todos os status</option>
            <option value="PLANEJADO">Planejado</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="PAUSADO">Pausado</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="crm-input w-auto">
            <option value="">Todos os tipos</option>
            <option value="B2B">B2B</option>
            <option value="B2G">B2G</option>
          </select>
        </div>
      </div>

      <div className="crm-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--crm-muted)]">Carregando projetos...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban size={48} className="mx-auto mb-4 text-[var(--crm-muted)] opacity-40" />
            <p className="text-[var(--crm-muted)]">Nenhum projeto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--crm-border)] bg-[var(--crm-surface-alt)]">
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Número</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Nome</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Tipo</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Cliente</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Fase</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Status</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Saúde</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Progresso</th>
                  <th className="text-left p-3 font-semibold text-[var(--crm-ink)]">Gestor</th>
                  <th className="text-right p-3 font-semibold text-[var(--crm-ink)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(project => (
                  <tr key={project.id} className="border-b border-[var(--crm-border)] hover:bg-[var(--crm-surface-alt)] transition-colors">
                    <td className="p-3 font-mono text-xs text-[var(--crm-muted)]">{project.number}</td>
                    <td className="p-3 font-medium text-[var(--crm-ink)]">{project.name}</td>
                    <td className="p-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${project.type === 'B2G' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {project.type}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--crm-ink)]">{project.company?.name || '-'}</td>
                    <td className="p-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${phaseColors[project.phase] || ''}`}>
                        {project.phase?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[project.status] || ''}`}>
                        {project.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${healthColors(project.healthScore)}`}>
                        {project.healthScore}/100
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${project.progressPercent || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--crm-muted)]">{project.progressPercent || 0}%</span>
                    </td>
                    <td className="p-3 text-[var(--crm-ink)]">{project.projectManager?.name || '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/projetos/${project.id}`)} className="p-1.5 rounded hover:bg-[var(--crm-surface-alt)] text-[var(--crm-muted)] hover:text-blue-600" title="Ver">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDelete(project.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--crm-muted)] hover:text-red-600" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="crm-panel w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--crm-border)]">
              <h2 className="text-lg font-bold text-[var(--crm-ink)]">Novo Projeto</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--crm-ink)] mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="crm-input w-full"
                  placeholder="Nome do projeto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--crm-ink)] mb-1">Tipo *</label>
                  <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })} className="crm-input w-full">
                    <option value="B2B">B2B</option>
                    <option value="B2G">B2G</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--crm-ink)] mb-1">Valor (Budget)</label>
                  <input
                    type="number"
                    value={createForm.budget}
                    onChange={e => setCreateForm({ ...createForm, budget: e.target.value })}
                    className="crm-input w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--crm-ink)] mb-1">Cliente *</label>
                <select required value={createForm.companyId} onChange={e => setCreateForm({ ...createForm, companyId: e.target.value })} className="crm-input w-full">
                  <option value="">Selecione...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--crm-ink)] mb-1">Gestor do Projeto *</label>
                <select required value={createForm.projectManagerId} onChange={e => setCreateForm({ ...createForm, projectManagerId: e.target.value })} className="crm-input w-full">
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--crm-ink)] mb-1">Descrição</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  className="crm-input w-full"
                  rows={3}
                  placeholder="Descrição do projeto"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="crm-btn crm-btn-secondary">Cancelar</button>
                <button type="submit" disabled={creating} className="crm-btn crm-btn-primary">
                  {creating ? 'Criando...' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
