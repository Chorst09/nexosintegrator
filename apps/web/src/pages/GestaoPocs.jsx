import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
  XCircle
} from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '../config/api';

const EMPTY_FORM = {
  relatedOpportunityId: '',
  relatedOpportunityNumber: '',
  relatedOpportunityTitle: '',
  title: '',
  client: '',
  solution: '',
  environment: '',
  objective: '',
  scope: '',
  successCriteria: '',
  commercialOwner: '',
  technicalOwner: '',
  startDate: '',
  dueDate: '',
  priority: 'MEDIUM',
  status: 'PLANEJAMENTO',
  progress: 0,
  nextStep: '',
  risks: '',
  resultSummary: '',
  decisionReason: '',
  notes: ''
};

const STATUS_OPTIONS = [
  { value: 'PLANEJAMENTO', label: 'Planejamento' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'VALIDACAO', label: 'Validação' },
  { value: 'BLOQUEADA', label: 'Bloqueada' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'DESCARTADA', label: 'Descartada' }
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
];

const statusLabel = (value) => STATUS_OPTIONS.find((item) => item.value === value)?.label || 'Planejamento';
const priorityLabel = (value) => PRIORITY_OPTIONS.find((item) => item.value === value)?.label || 'Média';

const inputClass = 'w-full rounded-[8px] border border-[#2a4260] bg-[#09182a] px-4 py-3 text-[15px] text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/60 placeholder:text-slate-500';
const selectClass = `${inputClass} appearance-none pr-10`;
const labelClass = 'mb-2 block text-[15px] font-medium text-slate-100';

const toDateInput = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const normalizeOpportunity = (item) => ({
  id: item.id || item.numeroOportunidade || item.numero || '',
  number: item.numeroOportunidade || item.numero || '',
  title: item.titulo || item.title || '',
  client: item.cliente || item.client || '',
  solution: item.produto || item.solution || item.solucao || ''
});

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="flex min-h-[118px] items-center justify-between rounded-[8px] border border-[#294764] bg-[#16263a] px-6 py-5">
    <div>
      <p className="text-[15px] text-slate-400">{label}</p>
      <p className="mt-2 text-[34px] font-semibold leading-none text-slate-50">{value}</p>
    </div>
    <Icon className={`h-8 w-8 ${color}`} strokeWidth={2.4} />
  </div>
);

const SelectShell = ({ children }) => (
  <div className="relative">
    {children}
    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
  </div>
);

const Field = ({ label, required, children, className = '' }) => (
  <label className={className}>
    <span className={labelClass}>{label}{required ? ' *' : ''}</span>
    {children}
  </label>
);

export default function GestaoPocs() {
  const [pocs, setPocs] = useState([]);
  const [stats, setStats] = useState({ total: 0, andamento: 0, bloqueadas: 0, aprovadas: 0, atrasadas: 0 });
  const [opportunities, setOpportunities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoc, setEditingPoc] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    const query = params.toString();
    return buildApiUrl(`/pre-sales-pocs${query ? `?${query}` : ''}`);
  }, [priorityFilter, searchTerm, statusFilter]);

  const loadPocs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiUrl, { headers: getAuthHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Erro ao carregar POCs');
      setPocs(Array.isArray(payload.data) ? payload.data : []);
      setStats(payload.stats || { total: 0, andamento: 0, bloqueadas: 0, aprovadas: 0, atrasadas: 0 });
    } catch (err) {
      setError(err.message || 'Erro ao carregar POCs');
    } finally {
      setLoading(false);
    }
  };

  const loadOpportunities = async () => {
    try {
      const response = await fetch(buildApiUrl('/prevendas-cadastros/oportunidades'), { headers: getAuthHeaders() });
      const payload = await response.json().catch(() => ({}));
      const list = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.oportunidades) ? payload.oportunidades : [];
      setOpportunities(list.map(normalizeOpportunity).filter((item) => item.id || item.number || item.title));
    } catch {
      setOpportunities([]);
    }
  };

  useEffect(() => {
    loadPocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const openNewModal = () => {
    setEditingPoc(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (poc) => {
    setEditingPoc(poc);
    setForm({
      ...EMPTY_FORM,
      ...poc,
      startDate: toDateInput(poc.startDate),
      dueDate: toDateInput(poc.dueDate),
      progress: Number(poc.progress || 0)
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingPoc(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleOpportunityChange = (value) => {
    if (!value) {
      setForm((current) => ({
        ...current,
        relatedOpportunityId: '',
        relatedOpportunityNumber: '',
        relatedOpportunityTitle: ''
      }));
      return;
    }

    const opportunity = opportunities.find((item) => item.id === value || item.number === value);
    setForm((current) => ({
      ...current,
      relatedOpportunityId: opportunity?.id || value,
      relatedOpportunityNumber: opportunity?.number || '',
      relatedOpportunityTitle: opportunity?.title || '',
      title: current.title || opportunity?.title || '',
      client: current.client || opportunity?.client || '',
      solution: current.solution || opportunity?.solution || ''
    }));
  };

  const savePoc = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = editingPoc ? `/pre-sales-pocs/${editingPoc.id}` : '/pre-sales-pocs';
      const response = await fetch(buildApiUrl(endpoint), {
        method: editingPoc ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(form)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Erro ao salvar POC');
      setModalOpen(false);
      setEditingPoc(null);
      setForm(EMPTY_FORM);
      await loadPocs();
    } catch (err) {
      setError(err.message || 'Erro ao salvar POC');
    } finally {
      setSaving(false);
    }
  };

  const actionPoc = async (poc, action) => {
    const actionLabel = action === 'approve' ? 'aprovar' : 'descartar';
    if (!window.confirm(`Deseja ${actionLabel} esta POC?`)) return;
    try {
      const response = await fetch(buildApiUrl(`/pre-sales-pocs/${poc.id}/${action}`), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || `Erro ao ${actionLabel} POC`);
      await loadPocs();
    } catch (err) {
      setError(err.message || `Erro ao ${actionLabel} POC`);
    }
  };

  const deletePoc = async (poc) => {
    if (!window.confirm('Deseja excluir esta POC?')) return;
    try {
      const response = await fetch(buildApiUrl(`/pre-sales-pocs/${poc.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Erro ao excluir POC');
      await loadPocs();
    } catch (err) {
      setError(err.message || 'Erro ao excluir POC');
    }
  };

  return (
    <div className="min-h-screen bg-[#07182b] px-6 py-8 text-slate-100">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <Beaker className="h-10 w-10 text-sky-400" strokeWidth={2.2} />
            <h1 className="text-[34px] font-semibold leading-tight text-slate-50">Gestão de POCs</h1>
          </div>
          <p className="mt-2 text-[18px] text-slate-400">Planeje, execute e valide provas de conceito com critérios objetivos e decisão registrada.</p>
        </div>
        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex h-[58px] items-center justify-center gap-4 rounded-[8px] bg-sky-400 px-8 text-[17px] font-medium text-[#082036] transition hover:bg-sky-300"
        >
          <Plus className="h-5 w-5" />
          Nova POC
        </button>
      </div>

      <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={Beaker} color="text-sky-400" />
        <StatCard label="Em andamento" value={stats.andamento} icon={CalendarClock} color="text-blue-400" />
        <StatCard label="Bloqueadas" value={stats.bloqueadas} icon={AlertTriangle} color="text-amber-400" />
        <StatCard label="Aprovadas" value={stats.aprovadas} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Atrasadas" value={stats.atrasadas} icon={XCircle} color="text-rose-400" />
      </div>

      <section className="rounded-[8px] border border-[#294764] bg-[#16263a] p-6">
        <h2 className="mb-7 text-[28px] font-semibold text-slate-50">Portfólio de POCs</h2>

        <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_300px_250px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`${inputClass} pl-12`}
              placeholder="Buscar por POC, cliente, solução ou responsável..."
            />
          </div>
          <SelectShell>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectClass}>
              <option value="all">Todos os status</option>
              {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </SelectShell>
          <SelectShell>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className={selectClass}>
              <option value="all">Todas prioridades</option>
              {PRIORITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </SelectShell>
        </div>

        {error && <div className="mb-4 rounded-[8px] border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <div className="overflow-x-auto rounded-[8px] border border-[#294764]">
          <table className="min-w-[1100px] w-full text-left">
            <thead className="bg-[#17263a] text-[15px] text-slate-400">
              <tr>
                <th className="px-5 py-5 font-medium">POC / Cliente</th>
                <th className="px-5 py-5 font-medium">Responsáveis</th>
                <th className="px-5 py-5 font-medium">Prazo</th>
                <th className="px-5 py-5 font-medium">Progresso</th>
                <th className="px-5 py-5 font-medium">Status</th>
                <th className="px-5 py-5 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#294764] bg-[#16263a]">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-slate-400">Carregando POCs...</td></tr>
              ) : pocs.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-slate-400">Nenhuma POC registrada.</td></tr>
              ) : pocs.map((poc) => (
                <tr key={poc.id} className="align-middle">
                  <td className="max-w-[430px] px-5 py-6">
                    <p className="font-semibold text-slate-50">{poc.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{poc.client}</p>
                    <p className="text-sm text-slate-400">{poc.solution}</p>
                    {poc.relatedOpportunityNumber && <p className="mt-2 text-sm font-medium text-sky-400">{poc.relatedOpportunityNumber}</p>}
                  </td>
                  <td className="px-5 py-6 text-sm text-slate-300">
                    <p>{poc.technicalOwner}</p>
                    <p className="text-slate-400">Comercial:</p>
                    <p>{poc.commercialOwner}</p>
                  </td>
                  <td className="px-5 py-6">
                    <p className="text-sm text-slate-100">{formatDate(poc.dueDate)}</p>
                    <span className="mt-2 inline-flex rounded-full border border-[#38506b] px-3 py-1 text-xs font-medium text-slate-100">{priorityLabel(poc.priority)}</span>
                  </td>
                  <td className="px-5 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-[#2a4260]">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${Number(poc.progress || 0)}%` }} />
                      </div>
                      <span className="text-sm text-slate-200">{Number(poc.progress || 0)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-6">
                    <span className="inline-flex rounded-full border border-[#38506b] bg-slate-400/10 px-4 py-1 text-sm text-slate-200">{statusLabel(poc.status)}</span>
                  </td>
                  <td className="px-5 py-6">
                    <div className="flex items-center justify-end gap-5">
                      <button type="button" onClick={() => actionPoc(poc, 'approve')} className="text-sm font-medium text-emerald-400 hover:text-emerald-300">Aprovar</button>
                      <button type="button" onClick={() => actionPoc(poc, 'discard')} className="text-sm font-medium text-rose-400 hover:text-rose-300">Descartar</button>
                      <button type="button" onClick={() => openEditModal(poc)} className="text-slate-100 hover:text-sky-300" aria-label="Editar POC">
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => deletePoc(poc)} className="text-rose-400 hover:text-rose-300" aria-label="Excluir POC">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-y-0 left-0 right-0 z-50 overflow-y-auto bg-black/70 p-4 lg:left-[312px]">
          <form onSubmit={savePoc} className="mx-auto my-2 w-full max-w-[1320px] rounded-[8px] border border-[#294764] bg-[#09182a] p-6 shadow-2xl sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <h2 className="text-[26px] font-semibold text-slate-50">{editingPoc ? 'Editar POC' : 'Nova POC'}</h2>
                <p className="mt-2 text-[17px] text-slate-400">Registre escopo, critérios mensuráveis, responsáveis, prazo e resultado esperado.</p>
              </div>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-100" aria-label="Fechar">
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="grid gap-7">
              <Field label="Registro de Oportunidade relacionado">
                <SelectShell>
                  <select value={form.relatedOpportunityId || ''} onChange={(event) => handleOpportunityChange(event.target.value)} className={selectClass}>
                    <option value="">Sem vínculo com RO</option>
                    {opportunities.map((item) => (
                      <option key={`${item.id}-${item.number}`} value={item.id || item.number}>
                        {item.number ? `${item.number} - ` : ''}{item.title || item.client}
                      </option>
                    ))}
                  </select>
                </SelectShell>
              </Field>

              <div className="grid gap-7 lg:grid-cols-2">
                <Field label="Título da POC" required>
                  <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Cliente" required>
                  <input value={form.client} onChange={(event) => updateForm('client', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Solução / Produto" required>
                  <input value={form.solution} onChange={(event) => updateForm('solution', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Ambiente">
                  <input value={form.environment || ''} onChange={(event) => updateForm('environment', event.target.value)} className={inputClass} placeholder="Cloud, laboratório, cliente..." />
                </Field>
              </div>

              <Field label="Objetivo" required>
                <textarea value={form.objective} onChange={(event) => updateForm('objective', event.target.value)} className={`${inputClass} min-h-[112px]`} />
              </Field>
              <Field label="Escopo">
                <textarea value={form.scope || ''} onChange={(event) => updateForm('scope', event.target.value)} className={`${inputClass} min-h-[112px]`} />
              </Field>
              <Field label="Critérios de sucesso" required>
                <textarea value={form.successCriteria} onChange={(event) => updateForm('successCriteria', event.target.value)} className={`${inputClass} min-h-[112px]`} placeholder="Defina critérios objetivos e mensuráveis." />
              </Field>

              <div className="grid gap-7 lg:grid-cols-2">
                <Field label="Responsável comercial" required>
                  <input value={form.commercialOwner} onChange={(event) => updateForm('commercialOwner', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Responsável técnico" required>
                  <input value={form.technicalOwner} onChange={(event) => updateForm('technicalOwner', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Data de início">
                  <input type="date" value={form.startDate || ''} onChange={(event) => updateForm('startDate', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Prazo de conclusão">
                  <input type="date" value={form.dueDate || ''} onChange={(event) => updateForm('dueDate', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Prioridade">
                  <SelectShell>
                    <select value={form.priority} onChange={(event) => updateForm('priority', event.target.value)} className={selectClass}>
                      {PRIORITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </SelectShell>
                </Field>
                <Field label="Status">
                  <SelectShell>
                    <select value={form.status} onChange={(event) => updateForm('status', event.target.value)} className={selectClass}>
                      {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </SelectShell>
                </Field>
              </div>

              <Field label={`Progresso (${Number(form.progress || 0)}%)`}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Number(form.progress || 0)}
                  onChange={(event) => updateForm('progress', Number(event.target.value))}
                  className="w-full accent-sky-500"
                />
              </Field>

              <div className="grid gap-7 lg:grid-cols-2">
                <Field label="Próximo passo">
                  <textarea value={form.nextStep || ''} onChange={(event) => updateForm('nextStep', event.target.value)} className={`${inputClass} min-h-[112px]`} />
                </Field>
                <Field label="Riscos e bloqueios">
                  <textarea value={form.risks || ''} onChange={(event) => updateForm('risks', event.target.value)} className={`${inputClass} min-h-[112px]`} />
                </Field>
                <Field label="Resumo do resultado">
                  <textarea value={form.resultSummary || ''} onChange={(event) => updateForm('resultSummary', event.target.value)} className={`${inputClass} min-h-[112px]`} />
                </Field>
                <Field label="Motivo da decisão">
                  <textarea value={form.decisionReason || ''} onChange={(event) => updateForm('decisionReason', event.target.value)} className={`${inputClass} min-h-[112px]`} />
                </Field>
              </div>

              <Field label="Observações">
                <textarea value={form.notes || ''} onChange={(event) => updateForm('notes', event.target.value)} className={`${inputClass} min-h-[120px]`} />
              </Field>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="rounded-[8px] border border-[#294764] px-7 py-3 text-[16px] text-slate-100 hover:bg-white/5">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="rounded-[8px] bg-sky-400 px-7 py-3 text-[16px] font-medium text-[#082036] hover:bg-sky-300 disabled:cursor-wait disabled:opacity-70">
                {saving ? 'Salvando...' : 'Salvar POC'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
