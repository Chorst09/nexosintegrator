import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  DollarSign,
  Plus,
  Receipt,
  User,
  X
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import ModernTable from '../components/ModernTable';
import Modal from '../components/Modal';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const STATUS_META = {
  PENDING: { label: 'Pendente', cls: 'bg-amber-500/10 text-amber-900 dark:text-amber-200' },
  APPROVED: { label: 'Aprovada', cls: 'bg-sky-500/10 text-sky-900 dark:text-sky-200' },
  PAID: { label: 'Paga', cls: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-red-500/10 text-red-900 dark:text-red-200' }
};

export default function Comissoes() {
  const [comissoes, setComissoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [filtros, setFiltros] = useState({
    sellerId: '',
    status: '',
    period: 'current_month'
  });

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    opportunityId: '',
    sellerId: '',
    percentage: 5,
    amount: 0
  });

  const loadUsuarios = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.users}?role=SELLER`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar usuarios:', error);
      setUsuarios([]);
    }
  };

  const loadComissoes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.sellerId) params.append('sellerId', filtros.sellerId);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.period) params.append('period', filtros.period);

      const res = await fetch(`${API_ENDPOINTS.commissions}?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setComissoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar comissoes:', error);
      setComissoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    loadComissoes();
  }, [filtros]);

  const totals = useMemo(() => {
    const items = Array.isArray(comissoes) ? comissoes : [];
    return items.reduce(
      (acc, c) => {
        const amount = Number(c.amount) || 0;
        acc.total += amount;
        if (c.status === 'PAID') acc.paid += amount;
        if (c.status === 'APPROVED') acc.approved += amount;
        if (c.status === 'PENDING') acc.pending += amount;
        return acc;
      },
      { total: 0, paid: 0, approved: 0, pending: 0 }
    );
  }, [comissoes]);

  const filteredComissoes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = Array.isArray(comissoes) ? comissoes : [];
    if (!term) return items;
    return items.filter((c) => {
      const hay = [
        c.opportunity?.title,
        c.opportunity?.company?.name,
        c.seller?.name,
        STATUS_META[c.status]?.label
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [comissoes, searchTerm]);

  const updateStatus = async (id, status) => {
    try {
      await fetch(API_ENDPOINTS.commissions, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id,
          status,
          paidAt: status === 'PAID' ? new Date().toISOString() : null
        })
      });
      loadComissoes();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    setSaving(false);
    setFormData({ opportunityId: '', sellerId: '', percentage: 5, amount: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await fetch(API_ENDPOINTS.commissions, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      closeModal();
      loadComissoes();
    } catch (error) {
      console.error('Erro ao criar comissao:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => ([
    {
      key: 'opportunity',
      label: 'Oportunidade',
      render: (item) => (
        <div className="min-w-[260px]">
          <div className="text-sm font-extrabold text-[var(--crm-ink)]">
            {item.opportunity?.title || 'Oportunidade'}
          </div>
          <div className="mt-0.5 text-xs text-[var(--crm-muted)] truncate">
            {item.opportunity?.company?.name || 'Empresa nao informada'}
          </div>
        </div>
      )
    },
    {
      key: 'seller',
      label: 'Vendedor',
      render: (item) => (
        <span className="text-sm font-semibold text-[var(--crm-ink)]">{item.seller?.name || '-'}</span>
      )
    },
    {
      key: 'percentage',
      label: 'Percentual',
      render: (item) => (
        <span className="text-sm font-extrabold text-[var(--crm-ink)]">{Number(item.percentage || 0).toFixed(1)}%</span>
      )
    },
    {
      key: 'amount',
      label: 'Comissao',
      render: (item) => (
        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-200">
          {formatCurrency(item.amount)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        const meta = STATUS_META[item.status] || { label: item.status || '-', cls: 'bg-slate-500/10 text-slate-700 dark:text-slate-200' };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.cls}`}>
            {meta.label}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Criada em',
      render: (item) => (
        <span className="text-sm text-[var(--crm-ink)]">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}
        </span>
      )
    },
    {
      key: 'paidAt',
      label: 'Pagamento',
      render: (item) => (
        <span className="text-sm text-[var(--crm-ink)]">
          {item.paidAt ? new Date(item.paidAt).toLocaleDateString('pt-BR') : '-'}
        </span>
      )
    }
  ]), []);

  return (
    <div>
      <PageHeader
        title="Comissoes"
        subtitle="Gerencie o comissionamento dos vendedores"
        icon={DollarSign}
        gradient="blue"
        breadcrumbs={['Home', 'Comissoes']}
        actions={[
          {
            label: 'Nova Comissao',
            onClick: () => setShowForm(true),
            icon: Plus,
            variant: 'primary'
          }
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <AnimatedStats title="Total" value={Math.round(totals.total)} prefix="R$ " subtitle="No periodo" icon={Receipt} color="blue" />
        <AnimatedStats title="Pagas" value={Math.round(totals.paid)} prefix="R$ " subtitle="Liquidadas" icon={Check} color="green" />
        <AnimatedStats title="Aprovadas" value={Math.round(totals.approved)} prefix="R$ " subtitle="Aguardando pagamento" icon={DollarSign} color="purple" />
        <AnimatedStats title="Pendentes" value={Math.round(totals.pending)} prefix="R$ " subtitle="Para revisar" icon={X} color="orange" />
      </div>

      <ModernTable
        title="Lista de Comissoes"
        data={filteredComissoes}
        columns={columns}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            label: 'Vendedor',
            value: filtros.sellerId,
            onChange: (value) => setFiltros((p) => ({ ...p, sellerId: value })),
            options: usuarios.map((u) => ({ value: u.id, label: u.name }))
          },
          {
            label: 'Status',
            value: filtros.status,
            onChange: (value) => setFiltros((p) => ({ ...p, status: value })),
            options: [
              { value: 'PENDING', label: 'Pendente' },
              { value: 'APPROVED', label: 'Aprovada' },
              { value: 'PAID', label: 'Paga' },
              { value: 'CANCELLED', label: 'Cancelada' }
            ]
          },
          {
            label: 'Periodo',
            value: filtros.period,
            onChange: (value) => setFiltros((p) => ({ ...p, period: value })),
            options: [
              { value: 'current_month', label: 'Mes atual' },
              { value: 'last_month', label: 'Mes passado' },
              { value: 'current_quarter', label: 'Trimestre atual' },
              { value: 'current_year', label: 'Ano atual' },
              { value: 'all', label: 'Todos' }
            ]
          }
        ]}
        loading={loading}
        renderActions={(item) => (
          <>
            {item.status === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => updateStatus(item.id, 'APPROVED')}
                  className="crm-btn crm-btn-primary px-3 py-1.5 text-xs"
                  title="Aprovar"
                >
                  <Check className="h-4 w-4" />
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(item.id, 'CANCELLED')}
                  className="crm-btn crm-btn-danger px-3 py-1.5 text-xs"
                  title="Cancelar"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              </>
            )}
            {item.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => updateStatus(item.id, 'PAID')}
                className="crm-btn crm-btn-primary px-3 py-1.5 text-xs"
                title="Marcar como paga"
              >
                <DollarSign className="h-4 w-4" />
                Pagar
              </button>
            )}
          </>
        )}
      />

      <Modal isOpen={showForm} onClose={closeModal} title="Nova Comissao">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Vendedor *</label>
              <select
                required
                value={formData.sellerId}
                onChange={(e) => setFormData((p) => ({ ...p, sellerId: e.target.value }))}
                className="crm-input"
              >
                <option value="">Selecione</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Percentual (%) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={formData.percentage}
                onChange={(e) => setFormData((p) => ({ ...p, percentage: Number(e.target.value) }))}
                className="crm-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: Number(e.target.value) }))}
                className="crm-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[var(--crm-ink)] mb-2">Oportunidade (opcional)</label>
              <input
                type="text"
                value={formData.opportunityId}
                onChange={(e) => setFormData((p) => ({ ...p, opportunityId: e.target.value }))}
                className="crm-input"
                placeholder="ID da oportunidade"
              />
              <div className="mt-2 text-xs text-[var(--crm-muted)] flex items-center gap-2">
                <User className="h-4 w-4" />
                Se o backend exigir, preencha o ID da oportunidade.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button type="button" onClick={closeModal} className="crm-btn crm-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="crm-btn crm-btn-primary">
              {saving ? 'Salvando...' : 'Criar Comissao'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

