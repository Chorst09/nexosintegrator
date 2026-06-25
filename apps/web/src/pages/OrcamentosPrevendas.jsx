import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, RefreshCcw, Search, DollarSign, ClipboardList, Building2,
  Eye, ArrowRight, Plus, Trash2, X, Upload, AlertCircle, CheckCircle,
  Calculator, FileText, Loader2
} from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '../config/api';
import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import Modal from '../components/Modal';

// ─── helpers ────────────────────────────────────────────────────────────────

const toCurrency = (v) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

const STATUS_LABEL = {
  NOVA: 'Solicitada',
  EM_PRECIFICACAO: 'Em Precificação',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  FINALIZADA: 'Finalizada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada'
};

const STATUS_BADGE = {
  NOVA: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  EM_PRECIFICACAO: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  AGUARDANDO_APROVACAO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
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

// ─── sub-component: NovoOrcamentoModal ──────────────────────────────────────

function NovoOrcamentoModal({ isOpen, onClose, onCreated }) {
  const currentUser = getCurrentUser();
  const [form, setForm] = useState(() => buildEmptyForm(currentUser));
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

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
      setForm(buildEmptyForm(currentUser));
      setFeedback('');
      loadUsers();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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
        tiposPrecificacao: ['VENDA'],
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
      const res = await fetch(buildApiUrl('/pre-vendas'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message || d?.error || 'Erro ao criar orçamento');
      }
      const created = await res.json();
      onCreated?.(created);
      onClose();
    } catch (err) {
      setFeedback(err.message || 'Erro ao criar orçamento');
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
            <h2 className="text-xl font-bold text-white">Criar solicitação para Pré-vendas</h2>
            <p className="mt-1 text-sm text-slate-400">
              Registre a demanda de proposta/orçamento e direcione para o fluxo de cotação e precificação.
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
              Criar solicitação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── sub-component: CustosModal (Orçamentos de Distribuidores) ──────────────

function CustosModal({ isOpen, onClose, solicitacao, onSaved }) {
  const [form, setForm] = useState({
    modalidade: 'VENDA',
    distribuidor: '',
    numeroOrcamento: fallbackBudgetNumber(),
    descricaoItem: '',
    quantidade: 1,
    custoUnitario: 0,
    observacoes: ''
  });
  const [custos, setCustos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (isOpen && solicitacao) {
      const details = solicitacao?.calculoDetalhes && typeof solicitacao.calculoDetalhes === 'object'
        ? solicitacao.calculoDetalhes : {};
      setCustos(Array.isArray(details.cotacoes) ? details.cotacoes : []);
      setForm((p) => ({ ...p, numeroOrcamento: solicitacao.numero || fallbackBudgetNumber() }));
      setFeedback('');
    }
  }, [isOpen, solicitacao]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.distribuidor.trim()) { setFeedback('Informe o distribuidor.'); return; }
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
        distribuidor: form.distribuidor.trim(),
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
      setForm((p) => ({ ...p, distribuidor: '', descricaoItem: '', quantidade: 1, custoUnitario: 0, observacoes: '', numeroOrcamento: solicitacao.numero || fallbackBudgetNumber() }));
      onSaved?.();
    } catch (err) {
      setFeedback(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handlePrecificar = () => {
    if (!solicitacao) return;
    
    // Pegar TODOS os custos salvos, não apenas o form atual
    const details = solicitacao?.calculoDetalhes && typeof solicitacao.calculoDetalhes === 'object'
      ? solicitacao.calculoDetalhes : {};
    const todosCustos = Array.isArray(details.cotacoes) ? details.cotacoes : [];
    
    // Compilar todos os itens de todas as cotações
    const todosItens = [];
    todosCustos.forEach((cotacao) => {
      if (Array.isArray(cotacao.itens)) {
        cotacao.itens.forEach((item) => {
          todosItens.push({
            descricao: item.descricao || '',
            quantidade: Number(item.quantidade) || 1,
            custoUnitario: Number(item.custoUnitario) || 0
          });
        });
      }
    });
    
    // Se não há custos salvos, usar a última modalidade do solicitacao ou do form
    const modalidadeParaUsar = solicitacao.modalidade || form.modalidade || 'VENDA';
    const tipoMap = { LOCACAO: 'locacao', LOCAÇÃO: 'locacao', SERVIÇOS: 'servicos', SERVICOS: 'servicos', SERVICO: 'servicos' };
    const tipo = tipoMap[String(modalidadeParaUsar).toUpperCase()] || 'vendas';
    
    const cotacaoKey = `cotacao_precificar_${Date.now()}`;
    localStorage.setItem(cotacaoKey, JSON.stringify({
      itens: todosItens.length > 0 ? todosItens : [{ descricao: '', quantidade: 1, custoUnitario: 0 }],
      subtotal: todosItens.reduce((sum, item) => sum + (item.quantidade * item.custoUnitario), 0),
      modalidade: modalidadeParaUsar,
      numeroOrcamento: solicitacao.numero || '',
      solicitacaoId: solicitacao.id,
      todosCustos: todosCustos // Enviar todos os custos para referência
    }));
    
    window.location.href = `/calculadoras?tipo=${tipo}&cotacaoKey=${cotacaoKey}`;
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Modalidade</label>
              <select value={form.modalidade} onChange={(e) => setField('modalidade', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50">
                <option value="VENDA">Venda</option>
                <option value="LOCACAO">Locação</option>
                <option value="SERVICOS">Serviços</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Distribuidor</label>
              <input type="text" value={form.distribuidor} onChange={(e) => setField('distribuidor', e.target.value)}
                placeholder="Nome do distribui..."
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nº Orçamento</label>
              <input type="text" value={form.numeroOrcamento} onChange={(e) => setField('numeroOrcamento', e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50" />
            </div>
            <div className="lg:col-span-1">
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
            <div className="grid grid-cols-7 gap-2 bg-slate-900/60 px-4 py-2.5 text-xs font-medium text-slate-400">
              <span>Modalidade</span><span>Distribuidor</span><span>Orçamento</span>
              <span className="col-span-2">Item</span><span>Qtde</span><span>Custo Unit.</span>
            </div>
            {custos.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Sem custos adicionados para esta proposta.
              </div>
            ) : (
              custos.map((c) =>
                (c.itens || []).map((it, idx) => (
                  <div key={`${c.id}-${idx}`} className="grid grid-cols-7 gap-2 border-t border-slate-700/40 px-4 py-2.5 text-sm text-slate-200">
                    <span>{c.modalidade}</span>
                    <span className="truncate">{c.distribuidor}</span>
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

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [costosItem, setCostosItem] = useState(null); // solicitacao to open CustosModal for

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Módulo de Orçamentos"
        subtitle="Upload e acompanhamento de orçamentos de distribuidores com geração automática por IA."
        icon={Receipt}
        gradient="blue"
        breadcrumbs={['Home', 'Pré-Vendas', 'Orçamentos']}
        actions={[
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
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCostosItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700/60 whitespace-nowrap"
                    >
                      Abrir atividade
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Pegar os custos salvos da solicitação
                        const details = item?.calculoDetalhes && typeof item.calculoDetalhes === 'object'
                          ? item.calculoDetalhes : {};
                        const todosCustos = Array.isArray(details.cotacoes) ? details.cotacoes : [];
                        
                        // Compilar todos os itens
                        const todosItens = [];
                        todosCustos.forEach((cotacao) => {
                          if (Array.isArray(cotacao.itens)) {
                            cotacao.itens.forEach((subItem) => {
                              todosItens.push({
                                descricao: subItem.descricao || '',
                                quantidade: Number(subItem.quantidade) || 1,
                                custoUnitario: Number(subItem.custoUnitario) || 0
                              });
                            });
                          }
                        });
                        
                        // Usar a modalidade da solicitação ou padrão VENDA
                        const modalidadeItem = item.modalidade || 'VENDA';
                        const tipoMap = { LOCACAO: 'locacao', LOCAÇÃO: 'locacao', SERVIÇOS: 'servicos', SERVICOS: 'servicos', SERVICO: 'servicos' };
                        const tipoCalc = tipoMap[String(modalidadeItem).toUpperCase()] || 'vendas';
                        
                        const cotacaoKey = `cotacao_precificar_${Date.now()}`;
                        localStorage.setItem(cotacaoKey, JSON.stringify({
                          itens: todosItens.length > 0 ? todosItens : [{ descricao: '', quantidade: 1, custoUnitario: 0 }],
                          subtotal: todosItens.reduce((sum, i) => sum + (i.quantidade * i.custoUnitario), 0),
                          modalidade: modalidadeItem,
                          numeroOrcamento: item.numero || '',
                          solicitacaoId: item.id,
                          todosCustos: todosCustos
                        }));
                        window.location.href = `/calculadoras?tipo=${tipoCalc}&cotacaoKey=${cotacaoKey}`;
                      }}
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
        isOpen={showNovoModal}
        onClose={() => setShowNovoModal(false)}
        onCreated={() => { loadRequests(); }}
      />

      <CustosModal
        isOpen={Boolean(costosItem)}
        onClose={() => setCostosItem(null)}
        solicitacao={costosItem}
        onSaved={() => loadRequests()}
      />
    </div>
  );
}
