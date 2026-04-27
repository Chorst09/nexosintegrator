import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  RefreshCcw,
  Search,
  DollarSign,
  ClipboardList,
  Building2,
  Eye,
  ArrowRight
} from 'lucide-react';

import { buildApiUrl, getAuthHeaders } from '../config/api';
import PageHeader from '../components/PageHeader';
import AnimatedStats from '../components/AnimatedStats';
import Modal from '../components/Modal';

const toCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const mapOrcamentos = (requests = []) => {
  const rows = [];

  requests.forEach((request) => {
    const details = request?.calculoDetalhes && typeof request.calculoDetalhes === 'object'
      ? request.calculoDetalhes
      : {};

    const cotacoes = Array.isArray(details.cotacoes) ? details.cotacoes : [];

    cotacoes.forEach((cotacao) => {
      rows.push({
        id: `${request.id}:${cotacao.id || cotacao.numeroOrcamento || Date.now()}`,
        requestId: request.id,
        requestNumber: request.numero,
        requestTitle: request.titulo,
        requestStatus: request.status,
        company: request?.lead?.name || '-',
        quoteNumber: cotacao?.numeroOrcamento || '-',
        distribuidor: cotacao?.distribuidor || '-',
        modalidade: cotacao?.modalidade || '-',
        subtotal: Number(cotacao?.subtotal || 0),
        itens: Array.isArray(cotacao?.itens) ? cotacao.itens : [],
        observacoesCotacao: cotacao?.observacoesCotacao || '',
        observacoesUpload: cotacao?.observacoesUpload || '',
        arquivoNome: cotacao?.arquivoNome || '',
        scenario: cotacao?.cenario || '-',
        validade: cotacao?.validade || null,
        createdAt: cotacao?.createdAt || request?.updatedAt || request?.createdAt,
        createdByName: cotacao?.createdByName || request?.solicitante?.name || '-'
      });
    });
  });

  return rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
};

export default function OrcamentosPrevendas() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orcamentos, setOrcamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);

  const openAndPrecificar = (item) => {
    const modalidade = String(item?.modalidade || 'VENDA').toUpperCase();
    const tipoMap = {
      LOCACAO: 'LOCACAO',
      LOCAÇÃO: 'LOCACAO',
      SERVICOS: 'SERVICOS',
      SERVIÇOS: 'SERVICOS'
    };
    const tipo = tipoMap[modalidade] || 'VENDA';
    const cotacaoKey = `cotacao_precificar_${Date.now()}`;

    localStorage.setItem(cotacaoKey, JSON.stringify({
      itens: Array.isArray(item?.itens) ? item.itens : [],
      subtotal: item?.subtotal || 0,
      modalidade: item?.modalidade || 'VENDA',
      numeroOrcamento: item?.quoteNumber || '',
      distribuidor: item?.distribuidor || '',
      solicitacaoId: item?.requestId || null
    }));

    window.location.href = `/calculadoras?tipo=${tipo}&cotacaoKey=${cotacaoKey}`;
  };

  const loadOrcamentos = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('/pre-vendas?limit=500'), { headers: getAuthHeaders() });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao carregar orçamentos de pré-vendas');
      }

      const payload = await response.json().catch(() => ({}));
      const requests = Array.isArray(payload?.solicitacoes) ? payload.solicitacoes : [];
      setOrcamentos(mapOrcamentos(requests));
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      setOrcamentos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrcamentos();
  }, []);

  const filtered = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return orcamentos;

    return orcamentos.filter((item) => [
      item.requestNumber,
      item.requestTitle,
      item.company,
      item.quoteNumber,
      item.distribuidor,
      item.modalidade,
      item.createdByName
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term));
  }, [orcamentos, searchTerm]);

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    const requestsWithBudget = new Set(filtered.map((item) => item.requestId)).size;

    return [
      {
        title: 'Orçamentos Gerados',
        value: filtered.length,
        subtitle: 'Cotações registradas em Solicitações',
        icon: Receipt,
        color: 'blue'
      },
      {
        title: 'Valor Total',
        value: toCurrency(totalValue),
        subtitle: 'Somatório dos subtotais',
        icon: DollarSign,
        color: 'green'
      },
      {
        title: 'Solicitações com Orçamento',
        value: requestsWithBudget,
        subtitle: 'Demandas com pelo menos 1 cotação',
        icon: ClipboardList,
        color: 'purple'
      },
      {
        title: 'Clientes',
        value: new Set(filtered.map((item) => item.company)).size,
        subtitle: 'Contas com orçamento no período',
        icon: Building2,
        color: 'yellow'
      }
    ];
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle="Consolidado de cotações registradas em Pré-Vendas > Solicitações"
        icon={Receipt}
        gradient="blue"
        breadcrumbs={['Home', 'Pré-Vendas', 'Orçamentos']}
        actions={[
          {
            label: 'Atualizar',
            onClick: loadOrcamentos,
            icon: RefreshCcw,
            variant: 'secondary'
          },
          {
            label: 'Abrir Solicitações',
            onClick: () => navigate('/solicitacoes'),
            icon: ClipboardList,
            variant: 'primary'
          }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <AnimatedStats key={stat.title} {...stat} />
        ))}
      </div>

      <div className="crm-card rounded-xl p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, solicitação, distribuidor ou orçamento"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-600/50 bg-slate-900/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </div>

      <div className="crm-card rounded-xl p-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <p className="mt-3 text-sm text-slate-400">Carregando orçamentos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Nenhum orçamento encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-600/40 bg-[#102540] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-sky-400">{item.quoteNumber}</span>
                      <span className="rounded-full border border-slate-500/40 px-2 py-1 text-[11px] text-slate-200">
                        {item.modalidade}
                      </span>
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-200">
                        {toCurrency(item.subtotal)}
                      </span>
                    </div>
                    <p className="text-white font-semibold">{item.requestNumber} • {item.requestTitle}</p>
                    <p className="text-sm text-slate-300">Cliente: {item.company} • Distribuidor: {item.distribuidor}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Registrado por {item.createdByName} em {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600/50 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800/50"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver orçamento
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/solicitacoes')}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/30"
                    >
                      <ClipboardList className="h-3.5 w-3.5" /> Abrir solicitação
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openAndPrecificar(item)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  <ArrowRight className="h-4 w-4" /> Abrir e Precificar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.quoteNumber} • ${selected.requestNumber}` : 'Detalhes do orçamento'}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400">Solicitação</p>
                <p className="text-white">{selected.requestTitle}</p>
              </div>
              <div>
                <p className="text-slate-400">Cliente</p>
                <p className="text-white">{selected.company}</p>
              </div>
              <div>
                <p className="text-slate-400">Distribuidor</p>
                <p className="text-white">{selected.distribuidor}</p>
              </div>
              <div>
                <p className="text-slate-400">Subtotal</p>
                <p className="text-white">{toCurrency(selected.subtotal)}</p>
              </div>
            </div>

            <div>
              <p className="text-slate-400 mb-1">Itens</p>
              {selected.itens.length === 0 ? (
                <p className="text-slate-300">Sem itens registrados.</p>
              ) : (
                <div className="space-y-2">
                  {selected.itens.map((entry, idx) => (
                    <div key={`${selected.id}-item-${idx}`} className="rounded-lg border border-slate-600/40 bg-slate-900/30 p-3">
                      <p className="text-white">{entry.descricao}</p>
                      <p className="text-slate-300 text-xs">
                        Qtde: {entry.quantidade} • Custo unit.: {toCurrency(entry.custoUnitario)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => openAndPrecificar(selected)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                <ArrowRight className="h-4 w-4" /> Abrir e Precificar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
