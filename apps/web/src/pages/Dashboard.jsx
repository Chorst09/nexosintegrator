import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  DollarSign,
  Filter,
  Maximize2,
  PieChart,
  Search,
  Target,
  TrendingUp,
  Users,
  X,
  Zap
} from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

import { Line, Doughnut, Bar } from 'react-chartjs-2';

import PresentationControls from '../components/PresentationControls';
import SalesFunnel from '../components/SalesFunnel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value || 0);

const formatCurrencyNoCents = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0
}).format(value || 0);

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationProgress, setPresentationProgress] = useState({ current: 1, total: 1 });
  const presentationRef = useRef(null);
  const [realData, setRealData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);

  const temperatureOptions = [
    { value: '', label: 'Todas as Temperaturas' },
    { value: '0', label: '0%', stage: 'LEAD/QUALIFICATION' },
    { value: '25', label: '25%', stage: 'DIAGNOSIS/PROPOSAL' },
    { value: '50', label: '50%', stage: 'NEGOTIATION' },
    { value: '75', label: '75%', stage: 'WON' },
    { value: '100', label: '100%', stage: 'LOST' }
  ];

  const getTemperatureFromStage = (stage) => {
    if (['LEAD', 'QUALIFICATION'].includes(stage)) return '0';
    if (['DIAGNOSIS', 'PROPOSAL'].includes(stage)) return '25';
    if (['NEGOTIATION'].includes(stage)) return '50';
    if (stage === 'WON') return '75';
    if (stage === 'LOST') return '100';
    return '0';
  };

  const getTemperatureLabel = (temp) => {
    const found = temperatureOptions.find(o => o.value === temp);
    return found ? found.label : temp;
  };

  const resetFilters = () => {
    setSelectedOwnerId('');
    setSelectedTemperature('');
  };

  const fetchDashboardData = async (ownerId, temperature) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      params.set('type', 'b2b');
      if (ownerId) params.set('ownerId', ownerId);
      if (temperature) params.set('temperature', temperature);

      const res = await fetch(`/api/dashboard?${params.toString()}`, { headers });
      const data = await res.json();

      if (data) {
        setDashboardData(data);
        setFilteredOpportunities(data.opportunities || []);
        setRealData({
          kpis: {
            pipelineValue: data.kpis?.pipelineValue || 0,
            wonValue: data.kpis?.wonValue || 0,
            conversionRate: data.kpis?.conversionRate || 0,
            avgTicket: data.kpis?.avgTicket || 0,
            totalOpportunities: data.kpis?.totalOpportunities || 0,
            wonOpportunities: data.kpis?.wonOpportunities || 0,
            lostOpportunities: data.kpis?.lostOpportunities || 0,
            totalCompanies: data.kpis?.totalCompanies || 0,
            monthlyGrowth: 0,
            activeLeads: data.kpis?.totalOpportunities || 0,
            avgCycleDays: 0,
            slaCompliance: 0,
            forecastAccuracy: 0,
            pipelineVelocity: 0
          }
        });
      }
    } catch (e) {
      console.error('Erro ao carregar dashboard B2B:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const res = await fetch('/api/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao carregar usuarios:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDashboardData('', '');
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedOwnerId, selectedTemperature);
  }, [selectedOwnerId, selectedTemperature]);

  const kpis = realData?.kpis || {
    pipelineValue: 0, wonValue: 0, conversionRate: 0, avgTicket: 0,
    totalOpportunities: 0, wonOpportunities: 0, lostOpportunities: 0,
    totalCompanies: 0, monthlyGrowth: 0, activeLeads: 0,
    avgCycleDays: 0, slaCompliance: 0, forecastAccuracy: 0, pipelineVelocity: 0
  };

  const charts = {
    funnel: dashboardData?.charts?.funnel || [
      { stage: 'LEAD_GENERATION', _count: { stage: 450 }, _sum: { value: 3200000 } },
      { stage: 'LEAD_QUALIFICATION', _count: { stage: 280 }, _sum: { value: 2800000 } },
      { stage: 'PROBLEM_ASSESSMENT', _count: { stage: 180 }, _sum: { value: 2450000 } },
      { stage: 'SOLUTION', _count: { stage: 120 }, _sum: { value: 1890000 } },
      { stage: 'CONVERSION', _count: { stage: 65 }, _sum: { value: 1340000 } },
      { stage: 'CLOSING', _count: { stage: 38 }, _sum: { value: 890000 } }
    ],
    monthlyRevenue: dashboardData?.charts?.monthlyRevenue || [
      { month: '2024-07-01', revenue: 650000 },
      { month: '2024-08-01', revenue: 720000 },
      { month: '2024-09-01', revenue: 580000 },
      { month: '2024-10-01', revenue: 890000 },
      { month: '2024-11-01', revenue: 760000 },
      { month: '2024-12-01', revenue: 920000 }
    ],
    opportunitiesBySource: (dashboardData?.charts?.leadSources || []).length > 0
      ? dashboardData.charts.leadSources.map(s => ({ source: s.source, count: s._count?.source || 0 }))
      : [
        { source: 'Website', count: 45 },
        { source: 'Indicacao', count: 32 },
        { source: 'LinkedIn', count: 28 },
        { source: 'Google Ads', count: 25 },
        { source: 'Outros', count: 26 }
      ],
    performanceByUser: (dashboardData?.charts?.sellerPerformance || []).length > 0
      ? dashboardData.charts.sellerPerformance.map(s => ({ user: s.sellerName, won: s.deals, value: s.revenue }))
      : [
        { user: 'Joao Silva', won: 12, value: 340000 },
        { user: 'Maria Santos', won: 8, value: 280000 },
        { user: 'Pedro Costa', won: 10, value: 320000 },
        { user: 'Ana Oliveira', won: 6, value: 180000 },
        { user: 'Carlos Lima', won: 9, value: 250000 }
      ],
    velocityByStage: [
      { stage: 'Geracao', days: 7 },
      { stage: 'Qualificacao', days: 9 },
      { stage: 'Diagnostico', days: 8 },
      { stage: 'Solucao', days: 10 },
      { stage: 'Proposta', days: 5 },
      { stage: 'Fechamento', days: 3 }
    ],
    forecast: [
      { month: '2025-01-01', forecast: 820000, target: 900000 },
      { month: '2025-02-01', forecast: 910000, target: 950000 },
      { month: '2025-03-01', forecast: 980000, target: 1000000 },
      { month: '2025-04-01', forecast: 1050000, target: 1100000 },
      { month: '2025-05-01', forecast: 1120000, target: 1150000 },
      { month: '2025-06-01', forecast: 1200000, target: 1200000 }
    ],
    activityPulse: [
      { week: 'Sem 1', activities: 180, meetings: 42 },
      { week: 'Sem 2', activities: 210, meetings: 55 },
      { week: 'Sem 3', activities: 195, meetings: 48 },
      { week: 'Sem 4', activities: 230, meetings: 62 }
    ],
    riskAccounts: [
      { name: 'Grupo Solaris', stage: 'Proposta', risk: 'Baixa interacao ha 10 dias', value: 185000 },
      { name: 'Atlas Energia', stage: 'Solucao', risk: 'Concorrente ativo', value: 260000 },
      { name: 'NorteLog', stage: 'Diagnostico', risk: 'Stakeholder ausente', value: 148000 }
    ]
  };

  const temperatureCounts = dashboardData?.temperatureCounts || {
    0: 0, 25: 0, 50: 0, 75: 0, 100: 0
  };

  const handlePresentation = async () => {
    if (typeof document === 'undefined') return;

    try {
      if (document.fullscreenElement === presentationRef.current) {
        await document.exitFullscreen();
      } else {
        presentationRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        await presentationRef.current?.requestFullscreen();
      }
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const syncPresentationMode = () => {
      setPresentationMode(document.fullscreenElement === presentationRef.current);
    };

    document.addEventListener('fullscreenchange', syncPresentationMode);
    syncPresentationMode();

    return () => document.removeEventListener('fullscreenchange', syncPresentationMode);
  }, []);

  const getPresentationSteps = () => {
    const container = presentationRef.current;
    if (!container) return [];

    return Array.from(container.children).filter(
      (child) =>
        child instanceof HTMLElement &&
        child.dataset.presentationControls !== 'true' &&
        child.offsetHeight > 40
    );
  };

  const resolveCurrentStepIndex = (steps, container) => {
    const anchor = container.scrollTop + container.clientHeight * 0.24;
    const matchIndex = steps.findIndex((step) => {
      const top = step.offsetTop;
      const bottom = top + step.offsetHeight;
      return top <= anchor && bottom > anchor;
    });

    if (matchIndex !== -1) return matchIndex;

    return steps.reduce(
      (best, step, index) => {
        const distance = Math.abs(step.offsetTop - anchor);
        return distance < best.distance ? { index, distance } : best;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY }
    ).index;
  };

  const updatePresentationProgress = () => {
    const container = presentationRef.current;
    if (!container) return;

    const steps = getPresentationSteps();
    if (steps.length === 0) {
      setPresentationProgress({ current: 1, total: 1 });
      return;
    }

    const currentIndex = resolveCurrentStepIndex(steps, container);

    const next = { current: currentIndex + 1, total: steps.length };
    setPresentationProgress((prev) => (
      prev.current === next.current && prev.total === next.total ? prev : next
    ));
  };

  const scrollPresentationStep = (direction) => {
    const container = presentationRef.current;
    if (!container) return;

    const steps = getPresentationSteps();

    if (steps.length === 0) {
      container.scrollBy({ top: direction * container.clientHeight * 0.85, behavior: 'smooth' });
      return;
    }

    const currentIndex = resolveCurrentStepIndex(steps, container);
    const baseIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = Math.min(Math.max(baseIndex + direction, 0), steps.length - 1);

    const target = steps[nextIndex];
    if (!target) return;

    const top = Math.max(target.offsetTop - 12, 0);
    container.scrollTo({ top, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!presentationMode) return undefined;

    const container = presentationRef.current;
    if (!container) return undefined;

    const sync = () => updatePresentationProgress();
    const raf = requestAnimationFrame(sync);

    container.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [presentationMode]);

  useEffect(() => {
    if (!presentationMode) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        scrollPresentationStep(1);
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        scrollPresentationStep(-1);
      } else if (event.key === 'Escape') {
        handlePresentation();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [presentationMode]);

  const axisColor = 'rgba(195, 216, 240, 0.92)';
  const gridColor = 'rgba(125, 162, 206, 0.25)';

  const baseCartesianOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: axisColor,
          usePointStyle: true,
          boxWidth: 10,
          padding: 12,
          font: { size: 11, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(5, 16, 34, 0.94)',
        titleColor: '#e8f4ff',
        bodyColor: '#d3e6fb',
        borderColor: 'rgba(125, 176, 234, 0.35)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: axisColor, font: { size: 11, weight: '600' } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: axisColor, font: { size: 11, weight: '600' } }
      }
    }
  };

  const revenueData = {
    labels: charts.monthlyRevenue.map((month) =>
      new Date(month.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    ),
    datasets: [
      {
        label: 'Receita Mensal',
        data: charts.monthlyRevenue.map((month) => month.revenue),
        borderColor: '#49c5ff',
        backgroundColor: 'rgba(73, 197, 255, 0.16)',
        borderWidth: 3,
        fill: true,
        tension: 0.35
      }
    ]
  };

  const forecastData = {
    labels: charts.forecast.map((month) =>
      new Date(month.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    ),
    datasets: [
      {
        label: 'Forecast',
        data: charts.forecast.map((month) => month.forecast),
        borderColor: '#6de0a0',
        backgroundColor: 'rgba(109, 224, 160, 0.14)',
        borderWidth: 3,
        fill: true,
        tension: 0.35
      },
      {
        label: 'Meta',
        data: charts.forecast.map((month) => month.target),
        borderColor: '#72b8ff',
        borderWidth: 2,
        borderDash: [6, 5],
        tension: 0.35
      }
    ]
  };

  const sourceData = {
    labels: charts.opportunitiesBySource.map((source) => source.source),
    datasets: [
      {
        data: charts.opportunitiesBySource.map((source) => source.count),
        backgroundColor: ['#3dbef3', '#57d88b', '#f8b525', '#9164ff', '#f56b88'],
        borderColor: '#0e2648',
        borderWidth: 2
      }
    ]
  };

  const velocityData = {
    labels: charts.velocityByStage.map((stage) => stage.stage),
    datasets: [
      {
        label: 'Dias medios',
        data: charts.velocityByStage.map((stage) => stage.days),
        backgroundColor: '#5ab2ff',
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const activityData = {
    labels: charts.activityPulse.map((item) => item.week),
    datasets: [
      {
        label: 'Atividades',
        data: charts.activityPulse.map((item) => item.activities),
        backgroundColor: '#5f7cff',
        borderRadius: 6
      },
      {
        label: 'Reunioes',
        data: charts.activityPulse.map((item) => item.meetings),
        backgroundColor: '#f5b32c',
        borderRadius: 6
      }
    ]
  };

  const openPipelineValue = Math.max(kpis.pipelineValue - kpis.wonValue, 0);
  const projectedValue = charts.forecast[charts.forecast.length - 1]?.forecast || 0;

  return (
    <div className="space-y-6">
      <div
        ref={presentationRef}
        className={[
          'space-y-6',
          presentationMode
            ? 'h-screen overflow-y-auto overflow-x-hidden scroll-smooth bg-[#041a38] p-4 pb-28 sm:p-6'
            : ''
        ].join(' ')}
      >
        <section
          className="relative overflow-hidden rounded-[20px] border border-[#79c2ff52] p-3 text-[#dbeeff] shadow-[0_36px_70px_-50px_rgba(6,20,45,0.96)] lg:p-4"
          style={{
            background:
              'linear-gradient(130deg, rgba(12,46,85,0.96) 0%, rgba(8,30,58,0.97) 48%, rgba(19,58,101,0.95) 100%)'
          }}
        >
          <div className="pointer-events-none absolute -left-20 top-12 h-56 w-56 rounded-full bg-[#88c3ff24] blur-[80px]" />
          <div className="pointer-events-none absolute right-16 top-0 h-44 w-44 rounded-full bg-[#66e2ff26] blur-[88px]" />

          <button
            type="button"
            onClick={handlePresentation}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-[#84c5ff3d] bg-[#0b1f3d]/90 px-2.5 py-1.5 text-xs font-semibold text-[#edf7ff] transition-colors hover:bg-[#12305a]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Apresentação
          </button>

          <div className="relative grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#79beff5c] bg-[#295f9f47] px-3 py-1.5 text-xs font-semibold text-[#d6edff]">
              <Zap className="h-3.5 w-3.5 text-[#7dd8ff]" />
              Visao Comercial Estrategica
            </div>

            <h2 className="mt-3 text-xl font-black leading-tight text-[#8fd0ff] sm:text-2xl">
              Painel Estrategico B2B
            </h2>
            <p className="mt-1.5 text-xs font-medium text-[#c8dfff] sm:text-sm">
              Acompanhamento de pipeline, receita e previsibilidade de vendas.
            </p>
          </div>

          <div className="grid gap-2.5">
            <div className="rounded-xl border border-[#7ec3ff45] bg-[#173b70b8] p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#9ebfdf]">Pipeline</div>
              <div className="mt-1.5 text-xl font-black leading-none text-[#8fd2ff] sm:text-2xl">
                {formatCurrencyNoCents(kpis.pipelineValue)}
              </div>
              <div className="mt-2 text-[10px] text-[#b9d0e6]">Em aberto: {formatCurrencyNoCents(openPipelineValue)}</div>
            </div>

            <div className="rounded-xl border border-[#7ec3ff45] bg-[#112f5cbf] p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#9ebfdf]">Conversao</div>
              <div className="mt-1.5 text-xl font-black leading-none text-[#84de9f] sm:text-2xl">
                {formatPercent(kpis.conversionRate)}
              </div>
              <div className="mt-2 text-[10px] text-[#b9d0e6]">Receita ganha: {formatCurrencyNoCents(kpis.wonValue)}</div>
            </div>
          </div>
        </div>
        </section>

        {/* Filtros */}
        <section className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#8fd1ff]" />
              <span className="text-xs font-semibold text-[#cde3fb]">Filtros:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-[#aac6e4]">Gerente de Contas</label>
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                className="rounded-lg border border-[#74b9f353] bg-[#0b2243]/90 px-2.5 py-1.5 text-xs text-[#d9edff] focus:outline-none focus:border-[#8fd1ff]"
              >
                <option value="">Todos os gerentes</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-[#aac6e4]">Temperatura</label>
              <select
                value={selectedTemperature}
                onChange={(e) => setSelectedTemperature(e.target.value)}
                className="rounded-lg border border-[#74b9f353] bg-[#0b2243]/90 px-2.5 py-1.5 text-xs text-[#d9edff] focus:outline-none focus:border-[#8fd1ff]"
              >
                {temperatureOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {(selectedOwnerId || selectedTemperature) && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-[#ff8ca766] bg-[#ff8ca71a] px-2.5 py-1.5 text-xs text-[#ff8ca7] transition-colors hover:bg-[#ff8ca733]"
              >
                <X className="h-3 w-3" />
                Limpar Filtros
              </button>
            )}

            {loading && (
              <div className="ml-auto flex items-center gap-2 text-[10px] text-[#aac6e4]">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#8fd1ff] border-t-transparent" />
                Carregando...
              </div>
            )}
          </div>

          {/* Temperatura Counts */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#74b9f353] bg-[#0b2243]/75 px-2 py-0.5 text-[10px] text-[#aac6e4]">
              0%: <span className="font-semibold text-white">{temperatureCounts[0]}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#74b9f353] bg-[#0b2243]/75 px-2 py-0.5 text-[10px] text-[#aac6e4]">
              25%: <span className="font-semibold text-white">{temperatureCounts[25]}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#74b9f353] bg-[#0b2243]/75 px-2 py-0.5 text-[10px] text-[#aac6e4]">
              50%: <span className="font-semibold text-white">{temperatureCounts[50]}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#74b9f353] bg-[#0b2243]/75 px-2 py-0.5 text-[10px] text-[#aac6e4]">
              75%: <span className="font-semibold text-white">{temperatureCounts[75]}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#74b9f353] bg-[#0b2243]/75 px-2 py-0.5 text-[10px] text-[#aac6e4]">
              100%: <span className="font-semibold text-white">{temperatureCounts[100]}</span>
            </span>
          </div>
        </section>

        <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3 text-[#d9edff]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#cde3fb]">Receita Fechada</div>
            <DollarSign className="h-3.5 w-3.5 text-[#8fd0ff]" />
          </div>
          <div className="mt-2 text-xl font-black text-[#5eb0ff] sm:text-2xl">{formatCurrencyNoCents(kpis.wonValue)}</div>
          <div className="mt-1.5 text-[10px] text-[#a9c5df]">{kpis.wonOpportunities} vendas concluidas</div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3 text-[#d9edff]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#cde3fb]">Ticket Medio</div>
            <Target className="h-3.5 w-3.5 text-[#8fd0ff]" />
          </div>
          <div className="mt-2 text-xl font-black text-[#5eb0ff] sm:text-2xl">{formatCurrencyNoCents(kpis.avgTicket)}</div>
          <div className="mt-1.5 text-[10px] text-[#a9c5df]">{kpis.totalCompanies} contas ativas</div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3 text-[#d9edff]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#cde3fb]">SLA Comercial</div>
            <Clock3 className="h-3.5 w-3.5 text-[#8fd0ff]" />
          </div>
          <div className="mt-2 text-xl font-black text-[#5eb0ff] sm:text-2xl">{formatPercent(kpis.slaCompliance)}</div>
          <div className="mt-1.5 text-[10px] text-[#a9c5df]">Respostas em ate 4h</div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3 text-[#d9edff]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#cde3fb]">Forecast</div>
            <TrendingUp className="h-3.5 w-3.5 text-[#8fd0ff]" />
          </div>
          <div className="mt-2 text-xl font-black text-[#5eb0ff] sm:text-2xl">{formatPercent(kpis.forecastAccuracy)}</div>
          <div className="mt-1.5 text-[10px] text-[#a9c5df]">Precisao media</div>
        </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#dcecff]">Funil de Vendas Estrategico</h3>
              <p className="text-xs text-[#aac6e4]">Jornada do lead ao fechamento</p>
            </div>
            <Target className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="h-[280px]">
            <SalesFunnel data={charts.funnel} />
          </div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#dcecff]">Forecast x Meta</h3>
              <p className="text-xs text-[#aac6e4]">Projecao dos proximos meses</p>
            </div>
            <Activity className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="h-[220px]">
            <Line
              data={forecastData}
              options={{
                ...baseCartesianOptions,
                scales: {
                  ...baseCartesianOptions.scales,
                  y: {
                    ...baseCartesianOptions.scales.y,
                    ticks: {
                      ...baseCartesianOptions.scales.y.ticks,
                      callback: (value) => formatCurrencyNoCents(value)
                    }
                  }
                }
              }}
            />
          </div>
          <div className="mt-3 rounded-lg border border-[#74b9f353] bg-[#0b2243]/75 px-2.5 py-1.5 text-[10px] text-[#c8dcf5]">
            Total projetado atual: <span className="font-bold text-white">{formatCurrencyNoCents(projectedValue)}</span>
          </div>
        </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#dcecff]">Receita Mensal</h3>
              <p className="text-xs text-[#aac6e4]">Evolucao dos ultimos 6 meses</p>
            </div>
            <TrendingUp className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="h-[220px]">
            <Line
              data={revenueData}
              options={{
                ...baseCartesianOptions,
                scales: {
                  ...baseCartesianOptions.scales,
                  y: {
                    ...baseCartesianOptions.scales.y,
                    ticks: {
                      ...baseCartesianOptions.scales.y.ticks,
                      callback: (value) => formatCurrencyNoCents(value)
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#dcecff]">Origem das Oportunidades</h3>
              <p className="text-xs text-[#aac6e4]">Participacao por canal</p>
            </div>
            <PieChart className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="h-[220px]">
            <Doughnut
              data={sourceData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: axisColor,
                      usePointStyle: true,
                      boxWidth: 8,
                      padding: 12,
                      font: { size: 11, weight: '600' }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-[#dcecff]">Velocidade do Pipeline</h3>
            <Clock3 className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#74b9f353] bg-[#0b2243]/75 p-2.5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[#9fb9d7]">Ciclo medio</div>
              <div className="mt-1 text-base font-black text-[#e8f4ff]">{kpis.avgCycleDays}d</div>
            </div>
            <div className="rounded-lg border border-[#74b9f353] bg-[#0b2243]/75 p-2.5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[#9fb9d7]">Velocidade</div>
              <div className="mt-1 text-base font-black text-[#e8f4ff]">{kpis.pipelineVelocity}</div>
            </div>
          </div>
          <div className="h-[160px]">
            <Bar
              data={velocityData}
              options={{
                ...baseCartesianOptions,
                plugins: {
                  ...baseCartesianOptions.plugins,
                  legend: { display: false }
                },
                scales: {
                  ...baseCartesianOptions.scales,
                  y: {
                    ...baseCartesianOptions.scales.y,
                    ticks: {
                      ...baseCartesianOptions.scales.y.ticks,
                      callback: (value) => `${value}d`
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-[#dcecff]">Pulso de Atividades</h3>
            <Zap className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="h-[190px]">
            <Bar data={activityData} options={baseCartesianOptions} />
          </div>
          <div className="mt-3 text-[10px] text-[#b8d3ee]">
            Leads ativos: <span className="font-semibold text-white">{kpis.activeLeads}</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-[#dcecff]">Contas em Risco</h3>
            <AlertTriangle className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="space-y-2">
            {charts.riskAccounts.map((account) => (
              <div key={account.name} className="rounded-lg border border-[#74b9f353] bg-[#0b2243]/75 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[#eaf4ff]">{account.name}</div>
                    <div className="text-[10px] text-[#a8c7e4]">{account.stage}</div>
                  </div>
                  <div className="text-[10px] font-bold text-[#ff8ca7]">{formatCurrencyNoCents(account.value)}</div>
                </div>
                <div className="mt-1.5 text-[10px] text-[#bbd5ee]">{account.risk}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-[#74b9f353] bg-[#0b2243]/75 px-2.5 py-1.5 text-[10px] text-[#bbd5ee]">
            <Users className="mr-1 inline h-3 w-3" />
            {kpis.totalCompanies} contas monitoradas
          </div>
        </div>
        </section>

        {/* Oportunidades Filtradas */}
        <section className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#dcecff]">
                Oportunidades
              </h3>
              <p className="text-xs text-[#aac6e4]">
                {filteredOpportunities.length} oportunidade{filteredOpportunities.length !== 1 ? 's' : ''} encontrada{filteredOpportunities.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Target className="h-4 w-4 text-[#8fd1ff]" />
          </div>

          {filteredOpportunities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#74b9f353] text-[10px] uppercase tracking-[0.08em] text-[#9fb9d7]">
                    <th className="px-2 py-2 text-left">Titulo</th>
                    <th className="px-2 py-2 text-left">Empresa</th>
                    <th className="px-2 py-2 text-left">Gerente</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                    <th className="px-2 py-2 text-center">Estagio</th>
                    <th className="px-2 py-2 text-center">Temperatura</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.map((opp) => {
                    const temp = getTemperatureFromStage(opp.stage);
                    return (
                      <tr key={opp.id} className="border-b border-[#74b9f322] transition-colors hover:bg-[#0b2243]/50">
                        <td className="px-2 py-2 font-medium text-[#eaf4ff]">{opp.title}</td>
                        <td className="px-2 py-2 text-[#aac6e4]">{opp.company?.name || '-'}</td>
                        <td className="px-2 py-2 text-[#aac6e4]">{opp.owner?.name || '-'}</td>
                        <td className="px-2 py-2 text-right font-semibold text-[#5eb0ff]">
                          {formatCurrencyNoCents(opp.value)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-block rounded-full border border-[#74b9f353] bg-[#0b2243]/75 px-2 py-0.5 text-[9px]">
                            {opp.stage}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium"
                            style={{
                              backgroundColor: temp === '0' ? 'rgba(59,130,246,0.2)' :
                                temp === '25' ? 'rgba(251,191,36,0.2)' :
                                temp === '50' ? 'rgba(239,68,68,0.2)' :
                                temp === '75' ? 'rgba(34,197,94,0.2)' :
                                'rgba(107,114,128,0.2)',
                              color: temp === '0' ? '#93c5fd' :
                                temp === '25' ? '#fcd34d' :
                                temp === '50' ? '#fca5a5' :
                                temp === '75' ? '#86efac' :
                                '#d1d5db'
                            }}
                          >
                            {getTemperatureLabel(temp)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[#aac6e4]">
              <Search className="mb-2 h-8 w-8 text-[#74b9f353]" />
              <p className="text-sm font-medium">Nenhuma oportunidade encontrada</p>
              <p className="mt-1 text-[10px]">Tente alterar os filtros selecionados</p>
            </div>
          )}
        </section>

        <PresentationControls
          active={presentationMode}
          current={presentationProgress.current}
          total={presentationProgress.total}
          canPrevious={presentationProgress.current > 1}
          canNext={presentationProgress.current < presentationProgress.total}
          onPrevious={() => scrollPresentationStep(-1)}
          onNext={() => scrollPresentationStep(1)}
          onExit={handlePresentation}
        />
      </div>
    </div>
  );
}
