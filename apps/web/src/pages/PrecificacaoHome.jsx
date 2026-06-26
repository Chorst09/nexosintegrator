import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calculator,
  FilePlus2,
  FileText,
  FolderOpen,
  History,
  PieChart,
  Search,
  Share2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FinEdgeArchitect from '../precificacao/app/page';

const PRICING_PROPOSALS_STORAGE_KEY = 'precificacao_propostas_v1';

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const normalizeSavedPricingProposals = (source) => {
  if (Array.isArray(source)) return source;
  if (source && typeof source === 'object') return Object.values(source);
  return [];
};

const loadSavedPricingProposals = () => {
  try {
    const stored = localStorage.getItem(PRICING_PROPOSALS_STORAGE_KEY);
    return normalizeSavedPricingProposals(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
};

export default function PrecificacaoHome() {
  const navigate = useNavigate();
  const [showArchitect, setShowArchitect] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('cotacaoKey');
  });
  const [savedPricingProposals, setSavedPricingProposals] = useState(() => loadSavedPricingProposals());

  useEffect(() => {
    const refresh = () => setSavedPricingProposals(loadSavedPricingProposals());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const summary = useMemo(() => {
    const totalContractValue = savedPricingProposals.reduce((sum, proposal) => (
      sum + Number(proposal?.results?.totalContractValue || proposal?.result?.finalPrice || 0)
    ), 0);
    const lastUpdated = savedPricingProposals[0]?.updatedAt
      ? new Date(savedPricingProposals[0].updatedAt).toLocaleDateString('pt-BR')
      : '-';

    return {
      total: savedPricingProposals.length,
      totalContractValue,
      lastUpdated
    };
  }, [savedPricingProposals]);

  if (showArchitect) {
    return <FinEdgeArchitect />;
  }

  const modules = [
    {
      title: 'FinEdge Architect',
      description: 'Abrir o simulador de DRE, custos, margem, impostos e preço final.',
      icon: Calculator,
      iconBg: 'bg-blue-500',
      onClick: () => setShowArchitect(true)
    },
    {
      title: 'Rateio de Produtos',
      description: 'Distribuir custos mensais por produto e salvar rateios por cenário.',
      icon: Share2,
      iconBg: 'bg-cyan-500',
      onClick: () => setShowArchitect(true)
    },
    {
      title: 'DRE Gerencial',
      description: 'Conferir receita, impostos, CPV, comissão, despesas e EBITDA.',
      icon: PieChart,
      iconBg: 'bg-emerald-500',
      onClick: () => setShowArchitect(true)
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Precificação"
        subtitle="Entrada central para simulações financeiras, DRE gerencial, rateio de produtos e histórico de precificações."
        icon={Calculator}
        gradient="blue"
        breadcrumbs={['Home', 'Pré-Vendas', 'Precificação']}
        actions={[
          {
            label: 'Abrir FinEdge',
            icon: Calculator,
            variant: 'primary',
            onClick: () => setShowArchitect(true)
          },
          {
            label: 'Orçamentos',
            icon: FileText,
            onClick: () => navigate('/orcamentos')
          }
        ]}
      />

      <div className="p-6 space-y-6">
        <section className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-4 md:p-5 shadow-xl shadow-black/10">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Controle de precificação</h2>
              <p className="text-sm text-slate-400">Crie, abra e acompanhe precificações salvas no módulo.</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-sm font-semibold text-cyan-100">
              Precificações salvas: <span className="ml-1 text-cyan-300">{summary.total}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valor total salvo</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(summary.totalContractValue)}</p>
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Última atualização</p>
              <p className="mt-2 text-2xl font-bold text-white">{summary.lastUpdated}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowArchitect(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-blue-400/60 bg-blue-500/85 px-4 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
              >
                <FilePlus2 className="h-4 w-4" />
                Nova
              </button>
              <button
                type="button"
                onClick={() => setShowArchitect(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-4 font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {modules.map((module) => (
            <button
              key={module.title}
              type="button"
              onClick={module.onClick}
              className="group min-h-[150px] rounded-xl border border-slate-700/70 bg-slate-900/70 p-5 text-left shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-slate-900"
            >
              <div className="flex h-full items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${module.iconBg} shadow-lg shadow-black/20`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">{module.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{module.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4 md:p-5 shadow-xl shadow-black/10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Precificações Salvas</h3>
              <p className="text-sm text-slate-400">
                {savedPricingProposals.length > 0
                  ? `${savedPricingProposals.length} registro(s) disponíveis no FinEdge Architect`
                  : 'Nenhuma precificação salva ainda'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowArchitect(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-600/70 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              <History className="h-4 w-4" />
              Ver histórico
            </button>
          </div>

          {savedPricingProposals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center">
              <FolderOpen className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-3 text-sm text-slate-400">As próximas precificações salvas aparecerão aqui.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/70">
              <div className="hidden grid-cols-5 gap-3 bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
                <span>Número</span>
                <span className="col-span-2">Cliente</span>
                <span>Contrato Total</span>
                <span>Atualização</span>
              </div>
              <div className="divide-y divide-slate-800">
                {savedPricingProposals.slice(0, 6).map((proposal) => (
                  <button
                    key={proposal.id || proposal.number}
                    type="button"
                    onClick={() => setShowArchitect(true)}
                    className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-900 md:grid-cols-5 md:gap-3 md:items-center"
                  >
                    <span className="font-semibold text-white">{proposal.number || '-'}</span>
                    <span className="col-span-2">{proposal.proposalForm?.clientCompany || 'Cliente não informado'}</span>
                    <span className="font-semibold text-cyan-200">{formatCurrency(proposal.results?.totalContractValue)}</span>
                    <span className="text-slate-400">
                      {proposal.updatedAt ? new Date(proposal.updatedAt).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/orcamentos')}
            className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-5 text-left transition hover:border-cyan-400/50 hover:bg-slate-900"
          >
            <FileText className="h-6 w-6 text-cyan-300" />
            <h3 className="mt-3 text-base font-semibold text-white">Fila de Orçamentos</h3>
            <p className="mt-2 text-sm text-slate-300">Buscar orçamentos aprovados para enviar à precificação.</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/calculadoras')}
            className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-5 text-left transition hover:border-cyan-400/50 hover:bg-slate-900"
          >
            <BarChart3 className="h-6 w-6 text-emerald-300" />
            <h3 className="mt-3 text-base font-semibold text-white">Calculadoras</h3>
            <p className="mt-2 text-sm text-slate-300">Acessar as calculadoras de venda, locação e serviços.</p>
          </button>
        </section>
      </div>
    </div>
  );
}
