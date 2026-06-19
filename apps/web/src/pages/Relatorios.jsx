import { useEffect, useState } from "react";
import axios from "axios";
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
import { FileDown, Filter, BarChart3, TrendingUp, Target } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import GradientCard from '../components/GradientCard';
import AnimatedStats from '../components/AnimatedStats';
import { buildApiUrl } from '../config/api';

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

export default function Relatorios() {
  const [dashboardData, setDashboardData] = useState(null);
  const [period, setPeriod] = useState('6');
  const [reportType, setReportType] = useState('executive');
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType, period });
      if (reportType === 'seller') {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          if (user.id) params.set('userId', user.id);
        }
      }
      const response = await axios.get(buildApiUrl(`/dashboard?${params.toString()}`));
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [period, reportType]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const exportReport = () => {
    alert('Funcionalidade de exportação será implementada');
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center px-6">
        <div className="crm-panel px-5 py-4 flex items-center gap-3 motion-safe:animate-scale-in">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(var(--crm-accent-rgb)_/_0.85)] border-t-transparent" />
          <div className="text-sm font-semibold text-[var(--crm-muted)]">Carregando relatorios...</div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-[50vh] grid place-items-center px-6">
        <div className="crm-panel p-8 text-center max-w-xl motion-safe:animate-fade-up">
          <h3 className="text-xl font-bold text-[var(--crm-ink)]">Nao foi possivel carregar os dados</h3>
          <p className="mt-2 text-[var(--crm-muted)]">Verifique se o servidor esta rodando e se a API esta acessivel.</p>
        </div>
      </div>
    );
  }

  const { kpis = {}, charts = {} } = dashboardData || {};
  const {
    funnel = [],
    monthlyRevenue = [],
    sellerPerformance = [],
    leadSources = [],
    lossReasons = []
  } = charts;

  const revenueData = {
    labels: monthlyRevenue.map(item =>
      new Date(item.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    ),
    datasets: [
      {
        label: 'Receita Realizada',
        data: monthlyRevenue.map(item => item.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const sourcesData = {
    labels: leadSources.map(item => item.source),
    datasets: [
      {
        data: leadSources.map(item => item.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(249, 115, 22, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(248, 113, 113, 0.85)'
        ],
        borderWidth: 0
      }
    ]
  };

  const lossData = {
    labels: lossReasons.map(item => item.reason),
    datasets: [
      {
        label: 'Quantidade',
        data: lossReasons.map(item => item.count),
        backgroundColor: 'rgba(244, 63, 94, 0.75)',
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 10
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: 'rgba(15, 23, 42, 0.06)' }, ticks: { font: { size: 11 } } }
    }
  };

  const barOptions = {
    ...chartOptions,
    plugins: { ...chartOptions.plugins, legend: { display: false } }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatórios e Análises"
        subtitle="Consolide performance, eficiência e projeções para decisões estratégicas"
        icon={BarChart3}
        gradient="indigo"
        breadcrumbs={['Relatórios']}
        actions={[
          {
            label: 'Exportar',
            onClick: exportReport,
            icon: FileDown,
            variant: 'primary'
          }
        ]}
      />

      <GradientCard gradient="gray" className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filtros rápidos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Refine o painel para visão executiva, gerencial ou por vendedor.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
              <Filter className="w-4 h-4" />
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="bg-transparent outline-none"
              >
                <option value="executive">Executivo</option>
                <option value="manager">Gerencial</option>
                <option value="seller">Vendedor</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
              <Target className="w-4 h-4" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent outline-none"
              >
                <option value="3">Últimos 3 meses</option>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Último ano</option>
              </select>
            </label>
          </div>
        </div>
      </GradientCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedStats
          title="Receita Total"
          value={formatCurrency(kpis.totalRevenue || 0)}
          subtitle="Receita acumulada"
          icon={TrendingUp}
          color="green"
          trend={{ direction: 'up', value: '+9.2% no período' }}
        />
        <AnimatedStats
          title="Taxa de Conversão"
          value={formatPercent(kpis.conversionRate || 0)}
          subtitle="Leads convertidos"
          icon={Target}
          color="blue"
          trend={{ direction: 'up', value: '+1.1% vs período anterior' }}
        />
        <AnimatedStats
          title="Ticket Médio"
          value={formatCurrency(kpis.avgTicket || 0)}
          subtitle="Valor médio por venda"
          icon={BarChart3}
          color="purple"
          trend={{ direction: 'up', value: '+4.5% vs meta' }}
        />
        <AnimatedStats
          title="Ciclo de Vendas"
          value={kpis.salesCycleDays || 0}
          subtitle="Dias até o fechamento"
          icon={Target}
          color="orange"
          suffix="d"
          trend={{ direction: 'down', value: '-3 dias no período' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GradientCard gradient="blue" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Receita x Tempo</h3>
              <p className="text-gray-600 dark:text-gray-300">Evolução mensal do faturamento</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="h-80">
            <Line data={revenueData} options={chartOptions} />
          </div>
        </GradientCard>

        <GradientCard gradient="purple" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Origem dos Leads</h3>
              <p className="text-gray-600 dark:text-gray-300">Principais canais de aquisição</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="h-80">
            <Doughnut data={sourcesData} options={{ ...chartOptions, scales: undefined }} />
          </div>
        </GradientCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GradientCard gradient="red" className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Motivos de Perda</h3>
              <p className="text-gray-600 dark:text-gray-300">Sinais para ações corretivas</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <Target className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="h-72">
            <Bar data={lossData} options={barOptions} />
          </div>
        </GradientCard>

        <GradientCard gradient="green" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Top Vendedores</h3>
              <p className="text-gray-600 dark:text-gray-300">Performance no período</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-4">
            {sellerPerformance.map((seller, index) => (
              <div key={index} className="flex items-center justify-between rounded-xl border border-green-100 bg-white/70 p-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{seller.user}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{seller.won} vendas fechadas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(seller.value)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Faturamento</p>
                </div>
              </div>
            ))}
          </div>
        </GradientCard>
      </div>
    </div>
  );
}
