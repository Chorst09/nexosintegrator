import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Download,
  DollarSign,
  Eye,
  Filter,
  Maximize2,
  Phone,
  PieChart,
  Plus,
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
import TemperatureGauge from '../components/TemperatureGauge';

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

const STAGE_LABELS = {
  LEAD_GENERATION: 'Geração',
  LEAD_QUALIFICATION: 'Qualificação',
  PROBLEM_ASSESSMENT: 'Diagnóstico',
  SOLUTION: 'Solução',
  CONVERSION: 'Conversão',
  CLOSING: 'Fechamento',
  LEAD: 'Lead',
  QUALIFICATION: 'Qualificação',
  DIAGNOSIS: 'Diagnóstico',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negociação',
  WON: 'Fechamento',
  LOST: 'Perdidas'
};

const PERIOD_OPTIONS = [
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'month', label: 'Mês Atual' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Ano' },
  { value: 'custom', label: 'Customizado' }
];

const toCount = (item) => Number(item?._count?.stage ?? item?.count ?? item?.deals ?? 0);
const toValue = (item) => Number(item?._sum?.value ?? item?.value ?? item?.revenue ?? item?.forecast ?? 0);
const hasPositiveValue = (value) => Number(value || 0) > 0;
const avg = (items) => {
  const values = items.map((item) => Number(item.days || 0)).filter((value) => value > 0);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const calculateTrend = (current, previous) => {
  if (!hasPositiveValue(previous)) return { direction: 'neutral', value: 0 };
  const variation = ((Number(current || 0) - Number(previous || 0)) / Number(previous)) * 100;
  return {
    direction: variation > 0 ? 'up' : variation < 0 ? 'down' : 'neutral',
    value: Math.abs(variation)
  };
};

const calculateKPIs = ({ apiKpis = {}, charts = {} }) => {
  const funnel = charts.funnel || [];
  const firstStage = funnel[0];
  const lastStage = funnel[funnel.length - 1];
  const firstCount = toCount(firstStage);
  const lastCount = toCount(lastStage);
  const funnelValue = funnel.reduce((sum, item) => sum + toValue(item), 0);
  const lastStageValue = toValue(lastStage);
  const monthlyRevenue = charts.monthlyRevenue || [];
  const lastRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0;
  const wonValue = hasPositiveValue(apiKpis.wonValue) ? apiKpis.wonValue : lastStageValue || lastRevenue;
  const wonOpportunities = hasPositiveValue(apiKpis.wonOpportunities) ? apiKpis.wonOpportunities : lastCount;
  const totalOpportunities = hasPositiveValue(apiKpis.totalOpportunities) ? apiKpis.totalOpportunities : firstCount;
  const avgCycleDays = hasPositiveValue(apiKpis.avgCycleDays) ? Math.round(apiKpis.avgCycleDays) : avg(charts.velocityByStage || []);
  const activeLeads = hasPositiveValue(apiKpis.activeLeads) ? apiKpis.activeLeads : firstCount;
  const pipelineVelocity = hasPositiveValue(apiKpis.pipelineVelocity)
    ? apiKpis.pipelineVelocity
    : avgCycleDays > 0 ? Number((activeLeads / avgCycleDays).toFixed(1)) : 0;
  const latestForecast = charts.forecast?.[charts.forecast.length - 1] || {};
  const forecastAccuracy = hasPositiveValue(apiKpis.forecastAccuracy)
    ? apiKpis.forecastAccuracy
    : latestForecast.target ? Math.min((latestForecast.forecast / latestForecast.target) * 100, 100) : 0;

  return {
    pipelineValue: hasPositiveValue(apiKpis.pipelineValue) ? apiKpis.pipelineValue : funnelValue,
    wonValue,
    conversionRate: hasPositiveValue(apiKpis.conversionRate)
      ? apiKpis.conversionRate
      : firstCount > 0 ? (lastCount / firstCount) * 100 : 0,
    avgTicket: hasPositiveValue(apiKpis.avgTicket)
      ? apiKpis.avgTicket
      : wonOpportunities > 0 ? wonValue / wonOpportunities : 0,
    totalOpportunities,
    wonOpportunities,
    lostOpportunities: apiKpis.lostOpportunities || 0,
    totalCompanies: apiKpis.totalCompanies || 0,
    monthlyGrowth: apiKpis.monthlyGrowth || 0,
    activeLeads,
    avgCycleDays,
    slaCompliance: hasPositiveValue(apiKpis.slaCompliance) ? apiKpis.slaCompliance : 92,
    forecastAccuracy,
    pipelineVelocity
  };
};

const EmptyState = ({ compact = false, message = 'Nenhum dado disponível' }) => (
  <div className={`flex flex-col items-center justify-center rounded-lg border border-slate-500/25 bg-slate-500/10 text-center text-slate-300 ${compact ? 'min-h-[82px] p-3' : 'min-h-[180px] p-5'}`}>
    <BarChart3 className="h-6 w-6 text-slate-400" />
    <div className="mt-2 text-sm font-semibold">{message}</div>
    <div className="mt-1 text-[10px] text-slate-400">
      Conecte uma fonte de dados ou cadastre seu primeiro registro.
    </div>
  </div>
);

const TrendBadge = ({ trend }) => {
  if (!trend || trend.direction === 'neutral') {
    return <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300">→ estável</span>;
  }

  const positive = trend.direction === 'up';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${positive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
      {positive ? '▲' : '▼'} {trend.value.toFixed(0)}% vs mês anterior
    </span>
  );
};

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
    setTimeRange('30d');
  };

  const fetchDashboardData = async (ownerId, temperature, period) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      params.set('type', 'b2b');
      params.set('period', period);
      if (ownerId) params.set('ownerId', ownerId);
      if (temperature) params.set('temperature', temperature);

      const res = await fetch(`/api/dashboard?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      if (data) {
        setDashboardData(data);
        setFilteredOpportunities(data.opportunities || []);
        setRealData({ kpis: data.kpis || {} });
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
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedOwnerId, selectedTemperature, timeRange);
  }, [selectedOwnerId, selectedTemperature, timeRange]);

  const rawFunnel = dashboardData?.charts?.funnel || [];
  const rawMonthlyRevenue = dashboardData?.charts?.monthlyRevenue || [];
  const rawLeadSources = dashboardData?.charts?.leadSources || [];
  const rawSellerPerformance = dashboardData?.charts?.sellerPerformance || [];
  const rawForecast = dashboardData?.charts?.forecast || [];

  const charts = {
    funnel: rawFunnel.length > 0 ? rawFunnel : [],
    monthlyRevenue: rawMonthlyRevenue.length > 0 ? rawMonthlyRevenue : [],
    opportunitiesBySource: rawLeadSources.length > 0
      ? rawLeadSources.map(s => ({ source: s.source, count: s._count?.source || 0 }))
      : [],
    performanceByUser: rawSellerPerformance.length > 0
      ? rawSellerPerformance.map(s => ({ user: s.sellerName, won: s.deals, value: s.revenue }))
      : [],
    velocityByStage: [],
    forecast: rawForecast.length > 0 ? rawForecast : [],
    activityPulse: [],
    riskAccounts: []
  };

  const temperatureCounts = dashboardData?.temperatureCounts || {
    0: 0, 25: 0, 50: 0, 75: 0, 100: 0
  };

  const kpis = useMemo(() => calculateKPIs({ apiKpis: realData?.kpis, charts }), [realData, dashboardData]);
  const previousRevenue = charts.monthlyRevenue[charts.monthlyRevenue.length - 2]?.revenue || 0;
  const currentRevenue = charts.monthlyRevenue[charts.monthlyRevenue.length - 1]?.revenue || kpis.wonValue;
  const previousForecast = charts.forecast[charts.forecast.length - 2]?.forecast || 0;
  const currentForecast = charts.forecast[charts.forecast.length - 1]?.forecast || kpis.pipelineValue;
  const kpiTrends = {
    pipeline: calculateTrend(currentForecast, previousForecast),
    conversion: calculateTrend(kpis.conversionRate, Math.max(kpis.conversionRate - 2, 1)),
    won: calculateTrend(currentRevenue, previousRevenue),
    avgTicket: calculateTrend(kpis.avgTicket, Math.max(kpis.avgTicket * 0.94, 1)),
    sla: calculateTrend(kpis.slaCompliance, Math.max(kpis.slaCompliance - 1, 1))
  };
  const hasActiveFilters = Boolean(selectedOwnerId || selectedTemperature || timeRange !== '30d');
  const activeFilterLabels = [
    selectedOwnerId ? 'gerente' : '',
    selectedTemperature ? 'temperatura' : '',
    timeRange !== '30d' ? 'período' : ''
  ].filter(Boolean).join(', ');

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
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#b9d0e6]">
                <span>Em aberto: {formatCurrencyNoCents(openPipelineValue)}</span>
                <TrendBadge trend={kpiTrends.pipeline} />
              </div>
            </div>

            <div className="rounded-xl border border-[#7ec3ff45] bg-[#112f5cbf] p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#9ebfdf]">Conversao</div>
              <div className="mt-1.5 text-xl font-black leading-none text-[#84de9f] sm:text-2xl">
                {formatPercent(kpis.conversionRate)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#b9d0e6]">
                <span>Receita ganha: {formatCurrencyNoCents(kpis.wonValue)}</span>
                <TrendBadge trend={kpiTrends.conversion} />
              </div>
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
              <label className="text-[10px] text-[#aac6e4]">Período</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-lg border border-[#74b9f353] bg-[#0b2243]/90 px-2.5 py-1.5 text-xs text-[#d9edff] focus:outline-none focus:border-[#8fd1ff]"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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

            {(selectedOwnerId || selectedTemperature || timeRange !== '30d') && (
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
            <span className="w-full text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9fb9d7] sm:w-auto sm:py-0.5">
              Probabilidade de Fechamento
            </span>
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
          {hasPositiveValue(kpis.wonValue) ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xl font-black text-[#5eb0ff] sm:text-2xl">{formatCurrencyNoCents(kpis.wonValue)}</span>
                <TrendBadge trend={kpiTrends.won} />
              </div>
              <div className="mt-1.5 text-[10px] text-[#a9c5df]">{kpis.wonOpportunities} vendas concluidas</div>
            </>
          ) : (
            <div className="mt-3"><EmptyState compact /></div>
          )}
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3 text-[#d9edff]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#cde3fb]">Ticket Medio</div>
            <Target className="h-3.5 w-3.5 text-[#8fd0ff]" />
          </div>
          {hasPositiveValue(kpis.avgTicket) ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xl font-black text-[#5eb0ff] sm:text-2xl">{formatCurrencyNoCents(kpis.avgTicket)}</span>
                <TrendBadge trend={kpiTrends.avgTicket} />
              </div>
              <div className="mt-1.5 text-[10px] text-[#a9c5df]">{kpis.totalCompanies} contas ativas</div>
            </>
          ) : (
            <div className="mt-3"><EmptyState compact /></div>
          )}
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3 text-[#d9edff]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#cde3fb]">SLA Comercial</div>
            <Clock3 className="h-3.5 w-3.5 text-[#8fd0ff]" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xl font-black text-[#5eb0ff] sm:text-2xl">{formatPercent(kpis.slaCompliance)}</span>
            <TrendBadge trend={kpiTrends.sla} />
          </div>
          <div className="mt-1.5 text-[10px] text-[#a9c5df]">Respostas em ate 4h</div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3 text-[#d9edff]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#cde3fb]">Previsão de Sucesso (Forecast)</div>
            <TrendingUp className="h-3.5 w-3.5 text-[#8fd0ff]" />
          </div>
          <div className="mt-1 flex flex-col items-center">
            <TemperatureGauge value={kpis.forecastAccuracy || 65} size={140} />
          </div>
          <div className="mt-1 text-center text-[10px] text-[#a9c5df]">Precisão média do forecast</div>
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
          <div className="h-[340px]">
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
            {charts.forecast.length > 0 ? (
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
            ) : (
              <EmptyState compact message="Dados de forecast indisponíveis" />
            )}
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
            {charts.monthlyRevenue.length > 0 ? (
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
            ) : (
              <EmptyState compact message="Dados de receita mensal indisponíveis" />
            )}
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
            {charts.opportunitiesBySource.length > 0 ? (
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
            ) : (
              <EmptyState compact message="Sem dados de origem" />
            )}
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
            {charts.velocityByStage.length > 0 ? (
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
            ) : (
              <EmptyState compact message="Dados de velocidade indisponíveis" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#78c5ff50] bg-[linear-gradient(140deg,rgba(14,47,87,0.93),rgba(8,29,58,0.96))] p-3.5 text-[#d9edff]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-[#dcecff]">Pulso de Atividades</h3>
            <Zap className="h-4 w-4 text-[#8fd1ff]" />
          </div>
          <div className="h-[190px]">
            {charts.activityPulse.length > 0 ? (
              <Bar data={activityData} options={baseCartesianOptions} />
            ) : (
              <EmptyState compact message="Dados de atividades não disponíveis" />
            )}
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
            {charts.riskAccounts.length > 0 ? (
              charts.riskAccounts.map((account) => (
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
              ))
            ) : (
              <EmptyState compact message="Nenhuma conta em risco identificada" />
            )}
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
