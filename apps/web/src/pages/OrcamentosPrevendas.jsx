import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Receipt, RefreshCcw, Search, DollarSign, ClipboardList, Building2,
  Eye, ArrowRight, Plus, Trash2, X, Upload, AlertCircle, CheckCircle,
  Calculator, FileText, Loader2, Pencil, BarChart3, ArrowLeft
} from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '../config/api';
import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import Modal from '../components/Modal';

// ─── helpers ────────────────────────────────────────────────────────────────

const toCurrency = (v) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

const STATUS_LABEL = {
  NOVA: 'Solicitada',
  EM_PRECIFICACAO: 'Em Precificação',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  ENVIADA: 'Enviada',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  FINALIZADA: 'Finalizada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada'
};

const STATUS_BADGE = {
  NOVA: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  EM_PRECIFICACAO: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  AGUARDANDO_APROVACAO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  ENVIADA: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  APROVADO: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  REPROVADO: 'bg-red-500/20 text-red-300 border-red-500/40',
  FINALIZADA: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  REJEITADA: 'bg-red-500/20 text-red-300 border-red-500/40',
  CANCELADA: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
};

const PRIORITY_LABEL = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' };

const nextItemRow = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  descricao: '',
  quantidade: 1,
  custoUnitario: '',
  icmsCompra: ''
});

const fallbackBudgetNumber = () => `ORC-0001-${new Date().getFullYear()}`;

const parseItemIcmsCompra = (item) => {
  if (!item?.observacoes) return '';
  try {
    const parsed = JSON.parse(item.observacoes);
    return parsed?.icmsCompra ?? '';
  } catch {
    return '';
  }
};

const normalizeModalidadeKey = (modalidade) => {
  const normalized = String(modalidade || '').trim().toUpperCase();
  if (normalized === 'LOCAÇÃO') return 'LOCACAO';
  if (normalized === 'SERVIÇOS' || normalized === 'SERVICOS') return 'SERVICO';
  return normalized || 'VENDA';
};

const normalizeTipoPrecificacaoKey = (modalidade) => (
  normalizeModalidadeKey(modalidade) === 'SERVICO' ? 'SERVICOS' : normalizeModalidadeKey(modalidade)
);

const formFromRequest = (request, currentUser = {}) => ({
  titulo: request?.titulo || '',
  descricao: request?.descricao || '',
  nomeCliente: request?.nomeCliente || request?.lead?.name || '',
  modalidade: request?.modalidade || 'VENDA',
  solicitanteId: request?.solicitanteId || request?.solicitante?.id || currentUser.id || '',
  encaminhadoParaId: request?.assignedToId || '',
  opportunityId: request?.opportunityId || request?.opportunity?.id || '',
  clientId: request?.leadId || request?.lead?.id || '',
  prioridade: request?.prioridade || 'MEDIUM',
  prazo: request?.prazo || '',
  itens: Array.isArray(request?.items) && request.items.length > 0
    ? request.items.map((item) => ({
        id: item.id || nextItemRow().id,
        descricao: item.descricao || item.product?.name || '',
        quantidade: item.quantidade || 1,
        custoUnitario: item.custoUnitario ?? '',
        icmsCompra: parseItemIcmsCompra(item)
      }))
    : [nextItemRow()]
});

const buildEmptyForm = (currentUser = {}) => ({
  titulo: '',
  descricao: '',
  nomeCliente: '',
  modalidade: 'VENDA',
  solicitanteId: currentUser.id || '',
  encaminhadoParaId: '',
  opportunityId: '',
  clientId: '',
  prioridade: 'MEDIUM',
  prazo: '',
  itens: [nextItemRow()]
});

const normalizeCotacoesFromRequest = (solicitacao) => {
  const details = solicitacao?.calculoDetalhes && typeof solicitacao.calculoDetalhes === 'object'
    ? solicitacao.calculoDetalhes
    : {};
  return Array.isArray(details.cotacoes) ? details.cotacoes : [];
};

const normalizeItemsFromRequest = (solicitacao) => (
  Array.isArray(solicitacao?.items)
    ? solicitacao.items.map((item) => ({
        descricao: item.descricao || item.product?.name || '',
        quantidade: Number(item.quantidade) || 1,
        custoUnitario: Number(item.custoUnitario ?? item.product?.price) || 0
      })).filter((item) => item.descricao)
    : []
);

const buildPrecificacaoPayload = (solicitacao) => {
  const todosCustos = normalizeCotacoesFromRequest(solicitacao);
  const modalidade = normalizeModalidadeKey(solicitacao?.modalidade || todosCustos[0]?.modalidade || 'VENDA');
  const cotacoesDaModalidade = todosCustos.filter((cotacao) => (
    normalizeModalidadeKey(cotacao?.modalidade || modalidade) === modalidade
  ));
  const custosParaCalculo = cotacoesDaModalidade.length > 0 ? cotacoesDaModalidade : [];
  const itens = [];

  custosParaCalculo.forEach((cotacao) => {
    if (!Array.isArray(cotacao.itens)) return;
    cotacao.itens.forEach((item) => {
      itens.push({
        descricao: item.descricao || '',
        quantidade: Number(item.quantidade) || 1,
        custoUnitario: Number(item.custoUnitario) || 0,
        modalidade: cotacao.modalidade || modalidade,
        distribuidorId: cotacao.distribuidorId || '',
        distribuidor: cotacao.distribuidor || cotacao.fornecedor || '',
        fornecedorId: cotacao.fornecedorId || '',
        fornecedor: cotacao.fornecedor || '',
        numeroOrcamento: cotacao.numeroOrcamento || solicitacao?.numero || '',
        observacoes: cotacao.observacoesCotacao || cotacao.observacoes || ''
      });
    });
  });

  if (itens.length === 0) {
    normalizeItemsFromRequest(solicitacao).forEach((item) => {
      itens.push({
        ...item,
        modalidade,
        distribuidor: 'Solicitação',
        fornecedorId: '',
        fornecedor: '',
        numeroOrcamento: solicitacao?.numero || '',
        observacoes: ''
      });
    });
  }

  const numeroOrcamento = custosParaCalculo[0]?.numeroOrcamento || solicitacao?.numero || '';
  const nomeCliente = solicitacao?.nomeCliente || solicitacao?.lead?.name || solicitacao?.cliente?.nome || '';

  return {
    itens: itens.length > 0 ? itens : [{ descricao: '', quantidade: 1, custoUnitario: 0 }],
    subtotal: itens.reduce((sum, item) => sum + (item.quantidade * item.custoUnitario), 0),
    modalidade,
    numeroOrcamento,
    solicitacaoId: solicitacao?.id || '',
    titulo: solicitacao?.titulo || '',
    nomeCliente,
    cliente: {
      nome: nomeCliente,
      contato: solicitacao?.contatoCliente || nomeCliente,
      telefone: solicitacao?.telefoneCliente || '',
      email: solicitacao?.emailCliente || ''
    },
    todosCustos: custosParaCalculo
  };
};

const openPrecificacaoFromRequest = (solicitacao, destination = '/precificacao') => {
  if (!solicitacao) return;
  const cotacaoKey = `cotacao_precificar_${Date.now()}`;
  localStorage.setItem(cotacaoKey, JSON.stringify(buildPrecificacaoPayload(solicitacao)));
  window.location.href = `${destination}?cotacaoKey=${encodeURIComponent(cotacaoKey)}`;
};

// ─── sub-component: NovoOrcamentoModal ──────────────────────────────────────

function NovoOrcamentoModal({ isOpen, onClose, onCreated, editingRequest = null }) {
  const currentUser = getCurrentUser();
  const [form, setForm] = useState(() => buildEmptyForm(currentUser));
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const isEditing = Boolean(editingRequest?.id);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/users'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setForm(isEditing ? formFromRequest(editingRequest, currentUser) : buildEmptyForm(currentUser));
      setFeedback('');
      loadUsers();
    }
  }, [isOpen, isEditing, editingRequest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const addItem = () => setForm((p) => ({ ...p, itens: [...p.itens, nextItemRow()] }));

  const removeItem = (id) =>
    setForm((p) => ({
      ...p,
      itens: p.itens.length > 1 ? p.itens.filter((i) => i.id !== id) : p.itens
    }));

  const updateItem = (id, key, value) =>
    setForm((p) => ({
      ...p,
      itens: p.itens.map((i) => (i.id === id ? { ...i, [key]: value } : i))
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) { setFeedback('Título é obrigatório.'); return; }
    try {
      setSaving(true);
      setFeedback('');
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        nomeCliente: form.nomeCliente.trim() || null,
        modalidade: form.modalidade || null,
        prioridade: form.prioridade,
        tiposPrecificacao: [normalizeTipoPrecificacaoKey(form.modalidade)],
        leadId: form.clientId.trim() || null,
        opportunityId: form.opportunityId.trim() || null,
        assignedToId: form.encaminhadoParaId || null,
        prazo: form.prazo || null,
        items: form.itens
          .filter((i) => i.descricao.trim())
          .map((i) => ({
            descricao: i.descricao.trim(),
            quantidade: Number(i.quantidade) || 1,
            custoUnitario: Number(i.custoUnitario) || 0,
            icmsCompra: i.icmsCompra === '' ? null : Number(i.icmsCompra) || 0,
            precoSugerido: 0,
            margemLucro: 0
          }))
      };
      const res = await fetch(buildApiUrl(isEditing ? `/pre-vendas/${encodeURIComponent(editingRequest.id)}` : '/pre-vendas'), {
        method: isEditing ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message || d?.error || `Erro ao ${isEditing ? 'atualizar' : 'criar'} orçamento`);
      }
      const created = await res.json();
      onCreated?.(created);
      onClose();
    } catch (err) {
      setFeedback(err.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} orçamento`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-600/50 bg-[#0a1628] shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'Editar orçamento de Pré-vendas' : 'Criar solicitação para Pré-vendas'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {isEditing
                ? 'Atualize os dados e itens solicitados do orçamento.'
                : 'Registre a demanda de proposta/orçamento e direcione para o fluxo de cotação e precificação.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Título</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setField('titulo', e.target.value)}
              placeholder="Ex: Simulação de preços para lote de switches"
              className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição</label>
            <textarea
              rows={3}
              value={form.descricao}
              onChange={(e) => setField('descricao', e.target.value)}
              placeholder="Contexto técnico e comercial da solicitação"
              className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
            />
          </div>

          {/* Nome do Cliente e Modalidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome do Cliente</label>
              <input
                type="text"
                value={form.nomeCliente}
                onChange={(e) => setField('nomeCliente', e.target.value)}
                placeholder="Nome da empresa ou cliente"
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Modalidade</label>
              <select
                value={form.modalidade}
                onChange={(e) => setField('modalidade', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <option value="VENDA">Venda</option>
                <option value="LOCACAO">Locação</option>
                <option value="SERVICO">Serviço</option>
              </select>
            </div>
          </div>

          {/* Quem está solicitando / Para quem está encaminhando */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Quem está solicitando</label>
              <select
                value={form.solicitanteId}
                onChange={(e) => setField('solicitanteId', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <option value="">Selecionar usuário</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'ADMIN' ? 'Admin' : u.role === 'MASTER' ? 'Master' : u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Para quem está encaminhando</label>
              <select
                value={form.encaminhadoParaId}
                onChange={(e) => setField('encaminhadoParaId', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <option value="">Selecionar usuário</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'ADMIN' ? 'Admin' : u.role === 'MASTER' ? 'Master' : u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Oportunidade ID / Cliente ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Oportunidade ID</label>
              <input
                type="text"
                value={form.opportunityId}
                onChange={(e) => setField('opportunityId', e.target.value)}
                placeholder="ID da oportunidade"
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cliente ID</label>
              <input
                type="text"
                value={form.clientId}
                onChange={(e) => setField('clientId', e.target.value)}
                placeholder="ID do cliente"
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          {/* Prioridade / Prazo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Prioridade</label>
              <select
                value={form.prioridade}
                onChange={(e) => setField('prioridade', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Prazo</label>
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => setField('prazo', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          {/* Itens solicitados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Itens solicitados</label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800/60"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar item
              </button>
            </div>

            <div className="space-y-2">
              {form.itens.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2">
                  <div className="col-span-12 md:col-span-5">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                      placeholder="Descrição do item"
                      className="w-full rounded-md border border-slate-600/40 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => updateItem(item.id, 'quantidade', e.target.value)}
                      className="w-full rounded-md border border-slate-600/40 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.custoUnitario}
                      onChange={(e) => updateItem(item.id, 'custoUnitario', e.target.value)}
                      placeholder="Custo Unit."
                      className="w-full rounded-md border border-slate-600/40 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.icmsCompra}
                      onChange={(e) => updateItem(item.id, 'icmsCompra', e.target.value)}
                      placeholder="ICMS Compra %"
                      className="w-full rounded-md border border-slate-600/40 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={form.itens.length === 1}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* column labels */}
            <div className="grid grid-cols-12 gap-2 mt-1 px-3">
              <span className="col-span-12 md:col-span-5 text-[11px] text-slate-500">Descrição</span>
              <span className="col-span-3 md:col-span-2 text-[11px] text-slate-500">Qtde</span>
              <span className="col-span-4 md:col-span-2 text-[11px] text-slate-500">Custo Unit.</span>
              <span className="col-span-4 md:col-span-2 text-[11px] text-slate-500">ICMS Compra</span>
            </div>
          </div>

          {feedback && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {feedback}
            </p>
          )}

          {/* footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600/50 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-800/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isEditing ? 'Salvar alterações' : 'Criar solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── sub-component: CustosModal (Orçamentos de Distribuidores) ──────────────

function CustosModal({ isOpen, onClose, solicitacao, onSaved, onPrecificar }) {
  const [form, setForm] = useState({
    modalidade: 'VENDA',
    distribuidorId: '',
    distribuidor: '',
    fornecedorId: '',
    fornecedor: '',
    numeroOrcamento: fallbackBudgetNumber(),
    descricaoItem: '',
    quantidade: 1,
    custoUnitario: 0,
    observacoes: ''
  });
  const [custos, setCustos] = useState([]);
  const [registry, setRegistry] = useState({ distribuidores: [], fornecedores: [] });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadRegistry = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/prevendas-cadastros'), { headers: getAuthHeaders() });
      if (!res.ok) return;
      const payload = await res.json();
      setRegistry({
        distribuidores: Array.isArray(payload?.distribuidores) ? payload.distribuidores : [],
        fornecedores: Array.isArray(payload?.fornecedores) ? payload.fornecedores : []
      });
    } catch {
      setRegistry({ distribuidores: [], fornecedores: [] });
    }
  }, []);

  useEffect(() => {
    if (isOpen && solicitacao) {
      const details = solicitacao?.calculoDetalhes && typeof solicitacao.calculoDetalhes === 'object'
        ? solicitacao.calculoDetalhes : {};
      setCustos(Array.isArray(details.cotacoes) ? details.cotacoes : []);
      setForm((p) => ({ ...p, numeroOrcamento: solicitacao.numero || fallbackBudgetNumber() }));
      setFeedback('');
      loadRegistry();
    }
  }, [isOpen, solicitacao, loadRegistry]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleDistributorChange = (distribuidorId) => {
    const selected = registry.distribuidores.find((item) => item.id === distribuidorId);
    setForm((p) => ({
      ...p,
      distribuidorId,
      distribuidor: selected?.nome || ''
    }));
  };

  const handleSupplierChange = (fornecedorId) => {
    const selected = registry.fornecedores.find((item) => item.id === fornecedorId);
    setForm((p) => ({
      ...p,
      fornecedorId,
      fornecedor: selected?.nome || ''
    }));
  };

  const handleAdd = async () => {
    if (!form.distribuidor.trim() && !form.fornecedor.trim()) { setFeedback('Selecione o distribuidor ou fornecedor.'); return; }
    if (!form.descricaoItem.trim()) { setFeedback('Informe a descrição do item.'); return; }
    try {
      setSaving(true);
      setFeedback('');
      const details = solicitacao?.calculoDetalhes && typeof solicitacao.calculoDetalhes === 'object'
        ? solicitacao.calculoDetalhes : {};
      const prevCotacoes = Array.isArray(details.cotacoes) ? details.cotacoes : [];
      const newEntry = {
        id: `COT-${Date.now()}`,
        modalidade: form.modalidade,
        distribuidorId: form.distribuidorId || '',
        distribuidor: form.distribuidor.trim(),
        fornecedorId: form.fornecedorId || '',
        fornecedor: form.fornecedor.trim(),
        numeroOrcamento: form.numeroOrcamento.trim() || solicitacao.numero || fallbackBudgetNumber(),
        itens: [{ descricao: form.descricaoItem.trim(), quantidade: Number(form.quantidade) || 1, custoUnitario: Number(form.custoUnitario) || 0 }],
        subtotal: (Number(form.quantidade) || 1) * (Number(form.custoUnitario) || 0),
        observacoesCotacao: form.observacoes.trim(),
        createdAt: new Date().toISOString()
      };
      const nextDetails = { ...details, cotacoes: [newEntry, ...prevCotacoes] };
      const res = await fetch(buildApiUrl(`/pre-vendas/${encodeURIComponent(solicitacao.id)}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ calculoDetalhes: nextDetails })
      });
      if (!res.ok) throw new Error('Erro ao salvar custo');
      setCustos([newEntry, ...prevCotacoes]);
      setForm((p) => ({
        ...p,
        distribuidorId: '',
        distribuidor: '',
        fornecedorId: '',
        fornecedor: '',
        descricaoItem: '',
        quantidade: 1,
        custoUnitario: 0,
        observacoes: '',
        numeroOrcamento: solicitacao.numero || fallbackBudgetNumber()
      }));
      onSaved?.();
    } catch (err) {
      setFeedback(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handlePrecificar = () => {
    const details = solicitacao?.calculoDetalhes && typeof solicitacao.calculoDetalhes === 'object'
      ? solicitacao.calculoDetalhes
      : {};
    const payload = {
      ...solicitacao,
      calculoDetalhes: { ...details, cotacoes: custos },
      modalidade: solicitacao?.modalidade || form.modalidade || 'VENDA'
    };
    if (onPrecificar) {
      onPrecificar(payload);
    } else {
      openPrecificacaoFromRequest(payload);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-600/50 bg-[#0a1628] shadow-2xl">
        <div className="flex items-start justify-between p-6 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-bold text-white">Custos (Orçamentos de Distribuidores)</h2>
            {solicitacao && (
              <p className="mt-1 text-sm text-slate-400">{solicitacao.numero} — {solicitacao.titulo}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="ml-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* form row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Modalidade</label>
              <select value={form.modalidade} onChange={(e) => setField('modalidade', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50">
                <option value="VENDA">Venda</option>
                <option value="LOCACAO">Locação</option>
                <option value="SERVICOS">Serviços</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Distribuidor</label>
              <select value={form.distribuidorId} onChange={(e) => handleDistributorChange(e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50">
                <option value="">Selecione um distribuidor</option>
                {registry.distribuidores.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Fornecedor</label>
              <select value={form.fornecedorId} onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50">
                <option value="">Selecione um fornecedor</option>
                {registry.fornecedores.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nº Orçamento</label>
              <input type="text" value={form.numeroOrcamento} onChange={(e) => setField('numeroOrcamento', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Item / Descrição</label>
              <input type="text" value={form.descricaoItem} onChange={(e) => setField('descricaoItem', e.target.value)}
                placeholder="Switch 48 portas, servidor..."
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Qtde</label>
              <input type="number" min="1" value={form.quantidade} onChange={(e) => setField('quantidade', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Custo Unit. R$</label>
              <input type="number" min="0" step="0.01" value={form.custoUnitario} onChange={(e) => setField('custoUnitario', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
          </div>

          {/* observações + add button */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Observações</label>
              <input type="text" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)}
                placeholder="Condições comerciais, prazo, impostos inclusos..."
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
            <button type="button" onClick={handleAdd} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60 shrink-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar e Aplicar
            </button>
          </div>

          {feedback && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{feedback}</p>
          )}

          {/* custos table */}
          <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="grid grid-cols-8 gap-2 bg-slate-900/60 px-4 py-2.5 text-xs font-medium text-slate-400">
              <span>Modalidade</span><span>Distribuidor</span><span>Fornecedor</span><span>Orçamento</span>
              <span className="col-span-2">Item</span><span>Qtde</span><span>Custo Unit.</span>
            </div>
            {custos.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Sem custos adicionados para esta proposta.
              </div>
            ) : (
              custos.map((c) =>
                (c.itens || []).map((it, idx) => (
                  <div key={`${c.id}-${idx}`} className="grid grid-cols-8 gap-2 border-t border-slate-700/40 px-4 py-2.5 text-sm text-slate-200">
                    <span>{c.modalidade}</span>
                    <span className="truncate">{c.distribuidor || '-'}</span>
                    <span className="truncate">{c.fornecedor || '-'}</span>
                    <span className="truncate text-sky-400 font-mono">{c.numeroOrcamento}</span>
                    <span className="col-span-2 truncate">{it.descricao}</span>
                    <span>{it.quantidade}</span>
                    <span>{toCurrency(it.custoUnitario)}</span>
                  </div>
                ))
              )
            )}
          </div>

          {/* Ir para Precificação */}
          <div className="flex justify-end pt-2 border-t border-slate-700/50">
            <button type="button" onClick={handlePrecificar}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
              <Calculator className="h-4 w-4" /> Ir para Precificação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function OrcamentosPrevendas() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPreVendasDashboard = Boolean(location.state?.fromPreVendasDashboard);
  const returnToPreVendasDashboard = () => navigate(location.state?.returnTo || '/pre-vendas');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [costosItem, setCostosItem] = useState(null); // solicitacao to open CustosModal for
  const [pendingPrecificacaoChoice, setPendingPrecificacaoChoice] = useState(null);

  const requestPrecificacaoChoice = (solicitacao) => {
    setPendingPrecificacaoChoice(solicitacao);
  };

  const currentUser = getCurrentUser();

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(buildApiUrl('/pre-vendas?limit=500'), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Falha ao carregar orçamentos');
      const payload = await res.json();
      const rows = Array.isArray(payload?.solicitacoes)
        ? payload.solicitacoes
        : Array.isArray(payload?.data) ? payload.data
        : Array.isArray(payload) ? payload : [];
      setRequests(rows);
    } catch (err) {
      console.error(err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = requests.length;
    let uploads = 0;
    requests.forEach((r) => {
      const d = r?.calculoDetalhes && typeof r.calculoDetalhes === 'object' ? r.calculoDetalhes : {};
      uploads += Array.isArray(d.uploadsCotacao) ? d.uploadsCotacao.length : 0;
    });
    return [
      { title: 'Solicitações', value: total, subtitle: 'Total de orçamentos', icon: ClipboardList, color: 'blue' },
      { title: 'Uploads', value: uploads, subtitle: 'Arquivos anexados', icon: Upload, color: 'purple' },
      { title: 'Pendentes IA', value: 0, subtitle: 'Aguardando análise', icon: AlertCircle, color: 'amber' },
      { title: 'Falhas IA', value: 0, subtitle: 'Erros de processamento', icon: AlertCircle, color: 'red' }
    ];
  }, [requests]);

  // ── filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = requests;
    if (onlyMine) rows = rows.filter((r) => r?.solicitanteId === currentUser?.id || r?.solicitante?.id === currentUser?.id);
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.titulo, r.numero, r?.lead?.name, r?.opportunity?.title, r?.solicitante?.name]
        .filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [requests, onlyMine, searchTerm, currentUser]);

  // ── upload count helper ────────────────────────────────────────────────────
  const uploadCount = (r) => {
    const d = r?.calculoDetalhes && typeof r.calculoDetalhes === 'object' ? r.calculoDetalhes : {};
    return Array.isArray(d.uploadsCotacao) ? d.uploadsCotacao.length : 0;
  };

  const cotacaoCount = (r) => {
    const d = r?.calculoDetalhes && typeof r.calculoDetalhes === 'object' ? r.calculoDetalhes : {};
    return Array.isArray(d.cotacoes) ? d.cotacoes.length : 0;
  };

  const handleViewPdf = (item) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Não foi possível abrir a janela do PDF. Libere pop-ups e tente novamente.');
      return;
    }

    const details = item?.calculoDetalhes && typeof item.calculoDetalhes === 'object' ? item.calculoDetalhes : {};
    const cotacoes = Array.isArray(details.cotacoes) ? details.cotacoes : [];
    const itensSolicitados = Array.isArray(item?.items) ? item.items : [];
    const createdAt = item?.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-';
    const updatedAt = item?.updatedAt ? new Date(item.updatedAt).toLocaleString('pt-BR') : '-';
    const statusKey = String(item?.status || 'NOVA').toUpperCase();
    const statusText = STATUS_LABEL[statusKey] || statusKey;
    const modalidadeLabel = {
      VENDA: 'Venda',
      LOCACAO: 'Locação',
      SERVICO: 'Serviço',
      SERVICOS: 'Serviços'
    }[item?.modalidade] || item?.modalidade || '-';

    const requestedRows = itensSolicitados.length > 0
      ? itensSolicitados.map((requestedItem) => {
          const icmsCompra = parseItemIcmsCompra(requestedItem);
          const quantidade = Number(requestedItem?.quantidade) || 0;
          const custoUnitario = Number(requestedItem?.custoUnitario) || 0;
          return `<tr>
            <td>${escapeHtml(requestedItem?.descricao || requestedItem?.product?.name || '-')}</td>
            <td style="text-align:center">${escapeHtml(quantidade)}</td>
            <td style="text-align:right">${escapeHtml(toCurrency(custoUnitario))}</td>
            <td style="text-align:right">${escapeHtml(icmsCompra === '' ? '-' : `${icmsCompra}%`)}</td>
            <td style="text-align:right">${escapeHtml(toCurrency(quantidade * custoUnitario))}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" class="empty">Sem itens solicitados.</td></tr>';

    const quotationRows = cotacoes.length > 0
      ? cotacoes.flatMap((cotacao) => {
          const itens = Array.isArray(cotacao?.itens) && cotacao.itens.length > 0
            ? cotacao.itens
            : [{ descricao: '-', quantidade: 0, custoUnitario: 0 }];
          return itens.map((quotedItem) => {
            const quantidade = Number(quotedItem?.quantidade) || 0;
            const custoUnitario = Number(quotedItem?.custoUnitario) || 0;
            return `<tr>
              <td>${escapeHtml(cotacao?.modalidade || '-')}</td>
              <td>${escapeHtml(cotacao?.distribuidor || '-')}</td>
              <td>${escapeHtml(cotacao?.fornecedor || '-')}</td>
              <td>${escapeHtml(cotacao?.numeroOrcamento || item?.numero || '-')}</td>
              <td>${escapeHtml(quotedItem?.descricao || '-')}</td>
              <td style="text-align:center">${escapeHtml(quantidade)}</td>
              <td style="text-align:right">${escapeHtml(toCurrency(custoUnitario))}</td>
              <td style="text-align:right">${escapeHtml(toCurrency(quantidade * custoUnitario))}</td>
            </tr>`;
          });
        }).join('')
      : '<tr><td colspan="8" class="empty">Sem cotações de distribuidores registradas.</td></tr>';

    const html = `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Orçamento ${escapeHtml(item?.numero || '')}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 24px;
            color: #0f172a;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          h1 { margin: 0; color: #0369a1; font-size: 28px; }
          h2 { margin: 22px 0 10px; color: #075985; font-size: 17px; }
          .muted { color: #64748b; font-size: 13px; margin-top: 6px; }
          .badge {
            display: inline-block;
            border: 1px solid #bae6fd;
            border-radius: 999px;
            background: #e0f2fe;
            color: #075985;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 14px;
          }
          .card {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 4px 0;
            font-size: 13px;
          }
          .label { color: #475569; }
          .value { color: #0f172a; font-weight: 700; text-align: right; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
          }
          th {
            background: #0f172a;
            color: #fff;
            padding: 8px;
            text-align: left;
          }
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px;
            vertical-align: top;
          }
          tr:nth-child(even) td { background: #f8fafc; }
          .empty { color: #64748b; text-align: center; padding: 18px; }
          .description {
            white-space: pre-wrap;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            color: #334155;
            background: #f8fafc;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 11px;
          }
          @media print { body { margin: 12mm; } }
        </style>
        <script>
          window.addEventListener('load', function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 400);
          }, { once: true });
        </script>
      </head>
      <body>
        <section class="header">
          <div>
            <h1>Orçamento de Pré-vendas</h1>
            <div class="muted">Nº ${escapeHtml(item?.numero || '-')} · Gerado em ${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>
          </div>
          <span class="badge">${escapeHtml(statusText)}</span>
        </section>

        <section class="grid">
          <article class="card">
            <div class="row"><span class="label">Título</span><span class="value">${escapeHtml(item?.titulo || '-')}</span></div>
            <div class="row"><span class="label">Cliente</span><span class="value">${escapeHtml(item?.nomeCliente || item?.lead?.name || '-')}</span></div>
            <div class="row"><span class="label">Modalidade</span><span class="value">${escapeHtml(modalidadeLabel)}</span></div>
            <div class="row"><span class="label">Prioridade</span><span class="value">${escapeHtml(PRIORITY_LABEL[item?.prioridade] || item?.prioridade || '-')}</span></div>
          </article>
          <article class="card">
            <div class="row"><span class="label">Solicitante</span><span class="value">${escapeHtml(item?.solicitante?.name || '-')}</span></div>
            <div class="row"><span class="label">Oportunidade</span><span class="value">${escapeHtml(item?.opportunity?.title || '-')}</span></div>
            <div class="row"><span class="label">Criado em</span><span class="value">${escapeHtml(createdAt)}</span></div>
            <div class="row"><span class="label">Atualizado em</span><span class="value">${escapeHtml(updatedAt)}</span></div>
          </article>
        </section>

        <h2>Descrição</h2>
        <section class="description">${escapeHtml(item?.descricao || 'Sem descrição.')}</section>

        <h2>Itens Solicitados</h2>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th style="text-align:center">Qtde</th>
              <th style="text-align:right">Custo Unit.</th>
              <th style="text-align:right">ICMS Compra</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${requestedRows}</tbody>
        </table>

        <h2>Cotações de Distribuidores</h2>
        <table>
          <thead>
            <tr>
              <th>Modalidade</th>
              <th>Distribuidor</th>
              <th>Fornecedor</th>
              <th>Orçamento</th>
              <th>Item</th>
              <th style="text-align:center">Qtde</th>
              <th style="text-align:right">Custo Unit.</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${quotationRows}</tbody>
        </table>

        <section class="footer">Documento gerado pelo módulo de Orçamentos de Pré-vendas.</section>
      </body>
      </html>
    `;

    const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(htmlBlob);
    printWindow.location.href = blobUrl;
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Módulo de Orçamentos"
        subtitle="Upload e acompanhamento de orçamentos de distribuidores com geração automática por IA."
        icon={Receipt}
        gradient="blue"
        breadcrumbs={['Home', 'Pré-Vendas', 'Orçamentos']}
        actions={[
          ...(fromPreVendasDashboard ? [{
            label: 'Voltar ao Dashboard',
            onClick: returnToPreVendasDashboard,
            icon: ArrowLeft,
            variant: 'secondary'
          }] : []),
          {
            label: 'Atualizar',
            onClick: loadRequests,
            icon: RefreshCcw,
            variant: 'secondary'
          },
          {
            label: 'Novo orçamento',
            onClick: () => setShowNovoModal(true),
            icon: Plus,
            variant: 'primary'
          }
        ]}
      />

      {/* stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <AnimatedStats key={s.title} {...s} />
        ))}
      </div>

      {/* filters row */}
      <div className="crm-card rounded-xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-sky-500"
            />
            Somente minhas atividades
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, cliente ou oportunidade"
              className="w-full sm:w-80 rounded-lg border border-slate-600/50 bg-slate-900/40 py-2 pl-10 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
        </div>
      </div>

      {/* queue table */}
      <div className="crm-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">Fila de Orçamentos</h3>
          <p className="mt-0.5 text-sm text-slate-400">
            Use o botão "Abrir atividade" para fazer upload e gerar orçamento com IA na solicitação.
          </p>
        </div>

        {/* table header */}
        <div className="grid grid-cols-12 gap-2 bg-slate-900/40 px-5 py-2.5 text-xs font-medium text-slate-400 border-b border-slate-700/40">
          <span className="col-span-3">Atividade</span>
          <span className="col-span-2">Cliente / Modalidade</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-1 text-center">Uploads</span>
          <span className="col-span-1 text-center">Pendentes</span>
          <span className="col-span-3 text-right">Ações</span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-500" />
            <p className="mt-3 text-sm text-slate-400">Carregando orçamentos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-3 text-sm text-slate-400">Nenhum orçamento encontrado.</p>
            <button
              type="button"
              onClick={() => setShowNovoModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" /> Novo orçamento
            </button>
          </div>
        ) : (
          <div>
            {filtered.map((item) => {
              const statusKey = String(item.status || 'NOVA').toUpperCase();
              const badgeClass = STATUS_BADGE[statusKey] || STATUS_BADGE.NOVA;
              const statusText = STATUS_LABEL[statusKey] || statusKey;
              const uploads = uploadCount(item);
              const cotacoes = cotacaoCount(item);
              const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-';

              const modalidadeLabel = {
                VENDA: 'Venda',
                LOCACAO: 'Locação',
                SERVICO: 'Serviço'
              }[item.modalidade] || '-';

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-center border-b border-slate-700/30 px-5 py-3.5 hover:bg-slate-800/20 transition-colors"
                >
                  {/* Atividade */}
                  <div className="col-span-3 min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {item.numero && <span className="font-mono text-sky-400 mr-2">{item.numero}</span>}
                      • {createdAt}
                    </p>
                  </div>

                  {/* Cliente / Modalidade */}
                  <div className="col-span-2 min-w-0">
                    <p className="truncate text-sm text-slate-200">{item.nomeCliente || '-'}</p>
                    <p className="text-xs text-slate-400">{modalidadeLabel}</p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Uploads */}
                  <div className="col-span-1 text-center text-sm text-slate-300">{uploads}</div>

                  {/* Pendentes */}
                  <div className="col-span-1 text-center text-sm text-slate-300">0</div>

                  {/* Ações */}
                  <div className="col-span-3 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewPdf(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/25 whitespace-nowrap"
                      title="Visualizar orçamento em PDF"
                    >
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/25 whitespace-nowrap"
                      title="Editar orçamento"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostosItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700/60 whitespace-nowrap"
                    >
                      Abrir atividade
                    </button>
                    <button
                      type="button"
                      onClick={() => requestPrecificacaoChoice(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/25 whitespace-nowrap"
                    >
                      <Calculator className="h-3.5 w-3.5" /> Ir para Precificação
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Excluir esta solicitação?')) return;
                        try {
                          await fetch(buildApiUrl(`/pre-vendas/${encodeURIComponent(item.id)}`), {
                            method: 'DELETE', headers: getAuthHeaders()
                          });
                          loadRequests();
                        } catch { /* ignore */ }
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/20"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* modals */}
      <NovoOrcamentoModal
        isOpen={showNovoModal || Boolean(editingItem)}
        onClose={() => {
          setShowNovoModal(false);
          setEditingItem(null);
        }}
        onCreated={() => { loadRequests(); }}
        editingRequest={editingItem}
      />

      <CustosModal
        isOpen={Boolean(costosItem)}
        onClose={() => setCostosItem(null)}
        solicitacao={costosItem}
        onSaved={() => loadRequests()}
        onPrecificar={requestPrecificacaoChoice}
      />

      {/* escolha de destino da precificação */}
      {pendingPrecificacaoChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-600/50 bg-[#0a1628] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Ir para Precificação</h3>
            <p className="text-sm text-slate-400 mb-5">Escolha o módulo para continuar:</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  const sol = pendingPrecificacaoChoice;
                  setPendingPrecificacaoChoice(null);
                  openPrecificacaoFromRequest(sol, '/calculadoras');
                }}
                className="flex w-full items-center gap-4 rounded-xl border border-slate-600/50 bg-slate-800/40 p-4 text-left text-white transition-colors hover:border-sky-500/50 hover:bg-sky-500/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Calculadoras</p>
                  <p className="text-xs text-slate-400">Venda, locação e serviços</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const sol = pendingPrecificacaoChoice;
                  setPendingPrecificacaoChoice(null);
                  openPrecificacaoFromRequest(sol, '/precificacao');
                }}
                className="flex w-full items-center gap-4 rounded-xl border border-slate-600/50 bg-slate-800/40 p-4 text-left text-white transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Precificação/Rateio</p>
                  <p className="text-xs text-slate-400">DRE, simulador, analytics e rateio</p>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPendingPrecificacaoChoice(null)}
              className="mt-4 w-full rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
