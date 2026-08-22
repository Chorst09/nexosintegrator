
import React, { useState, useEffect, useMemo } from 'react';
// PostgreSQL via Prisma - APIs REST
import { useAuth } from '@/hooks/use-auth';
import { Proposal, Partner } from '@/lib/types';
import ProposalsView from '@/components/proposals/ProposalsView';
import StatCard from './StatCard';
import { Phone, Server, Wifi, Radio, TrendingUp, PieChart as PieChartIcon, Target, Maximize2, Minimize2, Loader2, RefreshCcw } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  PABX: 'PABX/SIP',
  VM: 'Máquinas Virtuais',
  FIBER: 'Internet Fibra',
  RADIO: 'Internet Rádio',
  DOUBLE: 'Double Fibra/Rádio',
  SD_WAN: 'SD-WAN',
  EVENTOS_TI: 'Eventos TI',
  INTERNET_MAN_FIBRA: 'Rede Man/MPLS Fibra',
  MANRADIO: 'Rede Man/MPLS Radio',
  REDE_MAN_MPLS_FIBRA: 'Rede Man/MPLS Fibra',
  REDE_MAN_MPLS_RADIO: 'Rede Man/MPLS Radio',
  STANDARD: 'Padrão',
};

const FUNNEL_LAYER_STYLE = [
  {
    key: 'lead_generation',
    label: 'Geração de Leads',
    gradient: 'from-[#ff6f0f] to-[#ff9d17]',
    shadow: 'shadow-[0_0_24px_rgba(255,111,15,0.42)]',
  },
  {
    key: 'qualify',
    label: 'Qualificar Leads',
    gradient: 'from-[#2384ff] to-[#20d4f5]',
    shadow: 'shadow-[0_0_24px_rgba(32,212,245,0.32)]',
  },
  {
    key: 'evaluate',
    label: 'Avaliar Desafios / Problemas',
    gradient: 'from-[#20d4f5] to-[#14a9e8]',
    shadow: 'shadow-[0_0_24px_rgba(32,212,245,0.3)]',
  },
  {
    key: 'solve',
    label: 'Solucionar Problemas',
    gradient: 'from-[#ffb21a] to-[#ff6f0f]',
    shadow: 'shadow-[0_0_24px_rgba(255,178,26,0.28)]',
  },
  {
    key: 'convert',
    label: 'Converter',
    gradient: 'from-[#18d97c] to-[#10b968]',
    shadow: 'shadow-[0_0_24px_rgba(24,217,124,0.3)]',
  },
  {
    key: 'close',
    label: 'Fechar',
    gradient: 'from-[#835cff] to-[#2384ff]',
    shadow: 'shadow-[0_0_24px_rgba(131,92,255,0.3)]',
  },
] as const;

const FORECAST_GAUGE_COLORS = ['#ff436d', '#ff6f0f', '#ffb21a', '#20d4f5', '#18d97c'] as const;
const FORECAST_GAUGE_RADIUS = 64;
const FORECAST_GAUGE_ARC_PATH = `M 26 82 A ${FORECAST_GAUGE_RADIUS} ${FORECAST_GAUGE_RADIUS} 0 0 1 154 82`;
const FORECAST_GAUGE_ARC_LENGTH = Math.PI * FORECAST_GAUGE_RADIUS;
const FORECAST_GAUGE_SEGMENT_LENGTH = FORECAST_GAUGE_ARC_LENGTH / FORECAST_GAUGE_COLORS.length;
const FORECAST_STEP_LEVELS = [0, 25, 50, 75, 100] as const;

const formatCurrencyCompact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const adjustHexColor = (hex: string, amount: number) => {
  const normalized = (hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
  const num = parseInt(normalized, 16);
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const r = clamp((num >> 16) + Math.round(255 * amount));
  const g = clamp(((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = clamp((num & 0xff) + Math.round(255 * amount));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

const extractProposalSequence = (baseId: string) => {
  const match = String(baseId || '').match(/_(\d+)_v\d+$/i);
  return match?.[1] || '000';
};

const normalizeBusinessType = (proposal: Proposal): string => {
  const normalizedTypeRaw = (proposal.type || '').trim().toUpperCase();
  const normalizedType =
    normalizedTypeRaw === 'INTERNET_MAN_FIBRA'
      ? 'REDE_MAN_MPLS_FIBRA'
      : normalizedTypeRaw === 'MANRADIO'
      ? 'REDE_MAN_MPLS_RADIO'
      : normalizedTypeRaw === 'SD-WAN' || normalizedTypeRaw === 'SD WAN'
      ? 'SD_WAN'
      : normalizedTypeRaw === 'EVENTOS TI'
      ? 'EVENTOS_TI'
      : normalizedTypeRaw;
  if (normalizedType && normalizedType !== 'STANDARD') {
    return normalizedType;
  }

  const baseId = proposal.baseId || '';
  if (baseId.startsWith('Prop_PabxSip_') || baseId.startsWith('Prop_PABX_')) return 'PABX';
  if (baseId.startsWith('Prop_Pabx_Sip_')) return 'PABX';
  if (baseId.startsWith('Prop_MV_')) return 'VM';
  if (baseId.startsWith('Prop_InternetFibra_') || baseId.startsWith('Prop_Inter_Fibra_')) return 'FIBER';
  if (baseId.startsWith('Prop_InternetRadio_') || baseId.startsWith('Prop_Inter_Radio_')) return 'RADIO';
  if (baseId.startsWith('Prop_Double_') || baseId.startsWith('Prop_Inter_Double_')) return 'DOUBLE';
  if (baseId.startsWith('Prop_Rede_SD-WAN_') || baseId.startsWith('Prop_SD-WAN_')) return 'SD_WAN';
  if (baseId.startsWith('Prop_Eventos_TI_')) return 'EVENTOS_TI';
  if (
    baseId.startsWith('Prop_ManFibra_') ||
    baseId.startsWith('Prop_Inter_Man_') ||
    baseId.startsWith('Prop_IM_') ||
    baseId.startsWith('Prop_Rede_Man/Filbra_') ||
    baseId.startsWith('Prop_Rede_Man/Fibra_')
  ) return 'REDE_MAN_MPLS_FIBRA';
  if (
    baseId.startsWith('Prop_ManRadio_') ||
    baseId.startsWith('Prop_InterMan_Radio_') ||
    baseId.startsWith('Prop_Rede_Man/Radio_')
  ) return 'REDE_MAN_MPLS_RADIO';

  return normalizedType || 'STANDARD';
};

const formatBusinessType = (type: string) => BUSINESS_TYPE_LABELS[type] || type || 'N/A';

const getAccountManagerName = (proposal: Proposal) =>
  (() => {
    if (typeof proposal.accountManager === 'string') {
      return proposal.accountManager;
    }

    const directName =
      proposal.accountManager?.name ||
      (proposal.accountManager as any)?.full_name ||
      (proposal.accountManager as any)?.fullName;
    if (directName) return directName;

    const metadata = (proposal as any)?.metadata || {};
    const metadataName =
      metadata?.accountManagerData?.name ||
      metadata?.fullAccountManagerData?.name ||
      metadata?.accountManager?.name ||
      metadata?.accountManager?.full_name ||
      metadata?.accountManager?.fullName ||
      metadata?.accountManagerName ||
      metadata?.account_manager?.name ||
      metadata?.account_manager_name;

    return metadataName || 'Não atribuído';
  })();

const normalizeStatus = (status: string) =>
  (status || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getForecastWeightPercent = (status: string): number => {
  const normalizedStatus = normalizeStatus(status);

  if (['rejeitada', 'rejeitado', 'perdido', 'cancelada', 'cancelado'].includes(normalizedStatus)) return 0;
  if (['aprovada', 'aprovado', 'fechado ganho', 'assinado', 'assinada', 'fechado'].includes(normalizedStatus)) return 100;
  if (['renovacao', 'renovado', 'renovada'].includes(normalizedStatus)) return 75;
  if (
    ['em analise', 'analise', 'qualificado', 'qualificada', 'em andamento', 'negociacao', 'proposta enviada', 'enviada'].includes(
      normalizedStatus
    )
  ) return 50;
  if (['rascunho', 'novo', 'nova', 'aberto', 'aberta', 'iniciado', 'iniciada'].includes(normalizedStatus)) return 25;
  return 50;
};

const getForecastTemperatureFromProposal = (proposal: Proposal): number | undefined => {
  const metadata = (proposal as any)?.metadata;
  const raw = (proposal as any)?.forecastTemperature ?? metadata?.forecastTemperature;
  if (raw === null || raw === undefined || raw === '') return undefined;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;

  const levels = [0, 25, 50, 75, 100];
  if (levels.includes(parsed)) return parsed;
  return levels.reduce((closest, current) => (Math.abs(current - parsed) < Math.abs(closest - parsed) ? current : closest), 0);
};

const snapToForecastStep = (percent: number) =>
  FORECAST_STEP_LEVELS.reduce(
    (closest, current) => (Math.abs(current - percent) < Math.abs(closest - percent) ? current : closest),
    FORECAST_STEP_LEVELS[0]
  );

const classifyFunnelStage = (status: string): 'previstos' | 'fechados' | 'perdidos' => {
  const normalizedStatus = (status || '').trim().toLowerCase();

  if (['aprovada', 'aprovado', 'fechado ganho', 'renovação', 'renovacao', 'renovado'].includes(normalizedStatus)) return 'fechados';
  if (['rejeitada', 'rejeitado', 'perdido'].includes(normalizedStatus)) return 'perdidos';
  return 'previstos';
};

const DashboardView = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [selectedAccountManager, setSelectedAccountManager] = useState('all');
  const [selectedBusinessType, setSelectedBusinessType] = useState('all');
  const [selectedTemperature, setSelectedTemperature] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const accountManagerOptions = useMemo(() => {
    const uniqueManagers = new Set<string>();
    proposals.forEach((proposal) => {
      const managerNameRaw = getAccountManagerName(proposal);
      const managerName = (managerNameRaw || '').trim();
      if (!managerName) return;
      if (['n/a', 'nao atribuido', 'não atribuído'].includes(managerName.toLowerCase())) return;
      uniqueManagers.add(managerName);
    });
    return Array.from(uniqueManagers).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [proposals]);

  const businessTypeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();
    proposals.forEach((proposal) => {
      uniqueTypes.add(normalizeBusinessType(proposal));
    });
    return Array.from(uniqueTypes).sort((a, b) => formatBusinessType(a).localeCompare(formatBusinessType(b), 'pt-BR'));
  }, [proposals]);

  const filteredMonthProposals = useMemo(() => {
    // Aplicar filtros em TODAS as versões
    return proposals.filter((proposal) => {
      const managerName = (getAccountManagerName(proposal) || '').trim();
      if (selectedAccountManager !== 'all' && managerName !== selectedAccountManager) {
        return false;
      }

      const businessType = normalizeBusinessType(proposal);
      if (selectedBusinessType !== 'all' && businessType !== selectedBusinessType) {
        return false;
      }

      if (selectedTemperature !== 'all') {
        const explicitTemperature = getForecastTemperatureFromProposal(proposal);
        const proposalTemperature = explicitTemperature !== undefined ? explicitTemperature : getForecastWeightPercent(proposal.status);
        if (String(proposalTemperature) !== selectedTemperature) return false;
      }

      return true;
    });
  }, [proposals, selectedAccountManager, selectedBusinessType, selectedTemperature]);
  
  // Contar propostas por tipo (todas as versões)
  const countProposalsByType = useMemo(() => {
    const counts = {
      pabx: 0,
      maquinasVirtuais: 0,
      fibra: 0,
      doubleFibraRadio: 0,
      man: 0,
      manRadio: 0
    };

    filteredMonthProposals.forEach((proposal) => {
      const baseId = proposal.baseId || proposal.id;

      if (baseId.startsWith('Prop_PabxSip_')) {
        counts.pabx++;
      } else if (baseId.startsWith('Prop_MV_')) {
        counts.maquinasVirtuais++;
      } else if (baseId.startsWith('Prop_InternetFibra_') || baseId.startsWith('Prop_Inter_Fibra_')) {
        counts.fibra++;
      } else if (baseId.startsWith('Prop_Double_') || baseId.startsWith('Prop_Inter_Double_')) {
        counts.doubleFibraRadio++;
      } else if (
        baseId.startsWith('Prop_ManFibra_') ||
        baseId.startsWith('Prop_Inter_Man_') ||
        baseId.startsWith('Prop_IM_') ||
        baseId.startsWith('Prop_Rede_Man/Filbra_') ||
        baseId.startsWith('Prop_Rede_Man/Fibra_')
      ) {
        counts.man++;
      } else if (
        baseId.startsWith('Prop_ManRadio_') ||
        baseId.startsWith('Prop_InterMan_Radio_') ||
        baseId.startsWith('Prop_Rede_Man/Radio_')
      ) {
        counts.manRadio++;
      } else if (baseId.startsWith('Prop_InternetRadio_') || baseId.startsWith('Prop_Inter_Radio_')) {
        counts.fibra++;
      } else {
        const fallbackType = normalizeBusinessType(proposal);
        if (fallbackType === 'PABX') counts.pabx++;
        else if (fallbackType === 'VM') counts.maquinasVirtuais++;
        else if (fallbackType === 'DOUBLE') counts.doubleFibraRadio++;
        else if (fallbackType === 'REDE_MAN_MPLS_FIBRA') counts.man++;
        else if (fallbackType === 'REDE_MAN_MPLS_RADIO') counts.manRadio++;
        else if (fallbackType === 'RADIO' || fallbackType === 'FIBER') counts.fibra++;
      }
    });

    return counts;
  }, [filteredMonthProposals]);

  // Calcular valores totais por tipo de calculadora
  const valuesByType = useMemo(() => {
    const values = {
      pabx: 0,
      maquinasVirtuais: 0,
      fibra: 0,
      doubleFibraRadio: 0,
      man: 0,
      manRadio: 0
    };
    
    filteredMonthProposals.forEach((proposal) => {
      const baseId = proposal.baseId || proposal.id;
      const value = proposal.value || 0;

      if (baseId.startsWith('Prop_PabxSip_')) {
        values.pabx += value;
      } else if (baseId.startsWith('Prop_MV_')) {
        values.maquinasVirtuais += value;
      } else if (baseId.startsWith('Prop_InternetFibra_') || baseId.startsWith('Prop_Inter_Fibra_') || baseId.startsWith('Prop_InternetRadio_') || baseId.startsWith('Prop_Inter_Radio_')) {
        values.fibra += value;
      } else if (baseId.startsWith('Prop_Double_') || baseId.startsWith('Prop_Inter_Double_')) {
        values.doubleFibraRadio += value;
      } else if (
        baseId.startsWith('Prop_ManFibra_') ||
        baseId.startsWith('Prop_Inter_Man_') ||
        baseId.startsWith('Prop_IM_') ||
        baseId.startsWith('Prop_Rede_Man/Filbra_') ||
        baseId.startsWith('Prop_Rede_Man/Fibra_')
      ) {
        values.man += value;
      } else if (
        baseId.startsWith('Prop_ManRadio_') ||
        baseId.startsWith('Prop_InterMan_Radio_') ||
        baseId.startsWith('Prop_Rede_Man/Radio_')
      ) {
        values.manRadio += value;
      } else {
        const fallbackType = normalizeBusinessType(proposal);
        if (fallbackType === 'PABX') values.pabx += value;
        else if (fallbackType === 'VM') values.maquinasVirtuais += value;
        else if (fallbackType === 'DOUBLE') values.doubleFibraRadio += value;
        else if (fallbackType === 'REDE_MAN_MPLS_FIBRA') values.man += value;
        else if (fallbackType === 'REDE_MAN_MPLS_RADIO') values.manRadio += value;
        else if (fallbackType === 'RADIO' || fallbackType === 'FIBER') values.fibra += value;
      }
    });

    return values;
  }, [filteredMonthProposals]);

  const chartData = useMemo(() => {
    return [
      { name: 'PABX/SIP', proposals: countProposalsByType.pabx, amount: valuesByType.pabx, color: '#ff6f0f' },
      { name: 'Máq. Virtuais', proposals: countProposalsByType.maquinasVirtuais, amount: valuesByType.maquinasVirtuais, color: '#20d4f5' },
      { name: 'Internet Fibra', proposals: countProposalsByType.fibra, amount: valuesByType.fibra, color: '#18d97c' },
      { name: 'Double Fibra/Radio', proposals: countProposalsByType.doubleFibraRadio, amount: valuesByType.doubleFibraRadio, color: '#ff436d' },
      { name: 'Rede Man/MPLS Fibra', proposals: countProposalsByType.man, amount: valuesByType.man, color: '#2384ff' },
      { name: 'Rede Man/MPLS Radio', proposals: countProposalsByType.manRadio, amount: valuesByType.manRadio, color: '#ffb21a' },
    ];
  }, [countProposalsByType, valuesByType]);

  const proposalDistributionData = useMemo(
    () => chartData.filter((item) => item.proposals > 0).map((item) => ({ name: item.name, value: item.proposals, color: item.color })),
    [chartData]
  );

  const valueDistributionData = useMemo(
    () => chartData.filter((item) => item.amount > 0).map((item) => ({ name: item.name, value: item.amount, color: item.color })),
    [chartData]
  );

  const totalProposalsMonth = useMemo(
    () => chartData.reduce((total, item) => total + item.proposals, 0),
    [chartData]
  );

  const totalValueMonth = useMemo(
    () => chartData.reduce((total, item) => total + item.amount, 0),
    [chartData]
  );

  const salesFunnelData = useMemo(() => {
    const funnel = {
      previstos: { key: 'previstos' as const, name: 'Negócios Previstos', value: 0, amount: 0 },
      fechados: { key: 'fechados' as const, name: 'Negócios Fechados', value: 0, amount: 0 },
      perdidos: { key: 'perdidos' as const, name: 'Negócios Perdidos', value: 0, amount: 0 },
    };

    filteredMonthProposals.forEach((proposal) => {
      const stage = classifyFunnelStage(proposal.status);
      funnel[stage].value += 1;
      funnel[stage].amount += proposal.value || 0;
    });

    return [funnel.previstos, funnel.fechados, funnel.perdidos];
  }, [filteredMonthProposals]);

  const funnelVisualData = useMemo(() => {
    const previstos = salesFunnelData.find((item) => item.key === 'previstos')?.value || 0;
    const fechados = salesFunnelData.find((item) => item.key === 'fechados')?.value || 0;
    const topo = Math.max(previstos, fechados, 1);

    const s6 = fechados;
    const s5 = Math.max(s6, Math.round(topo * 0.14));
    const s4 = Math.max(s5, Math.round(topo * 0.27));
    const s3 = Math.max(s4, Math.round(topo * 0.4));
    const s2 = Math.max(s3, Math.round(topo * 0.62));
    const s1 = Math.max(s2, topo);

    const values = [s1, s2, s3, s4, s5, s6];
    const widths = [100, 92, 84, 76, 68, 60];

    return FUNNEL_LAYER_STYLE.map((stage, index) => ({
      ...stage,
      value: values[index],
      width: widths[index],
    }));
  }, [salesFunnelData]);

  const funnelSummary = useMemo(() => {
    const previstos = salesFunnelData.find((item) => item.key === 'previstos')?.value || 0;
    const fechados = salesFunnelData.find((item) => item.key === 'fechados')?.value || 0;
    const conversion = previstos > 0 ? (fechados / previstos) * 100 : 0;
    return { previstos, fechados, conversion };
  }, [salesFunnelData]);

  const monthlyFunnelBoard = useMemo(() => {
    const isRenewal = (status: string) => ['renovacao', 'renovado', 'renovada'].includes(normalizeStatus(status));
    const isClosedWon = (status: string) => ['aprovada', 'aprovado', 'fechado ganho', 'assinado', 'assinada', 'fechado'].includes(normalizeStatus(status));
    const isLost = (status: string) => ['rejeitada', 'rejeitado', 'perdido', 'cancelada', 'cancelado'].includes(normalizeStatus(status));

    const sum = (list: Proposal[]) => list.reduce((acc, p) => acc + (p.value || 0), 0);

    const all = filteredMonthProposals;
    const renewals = all.filter((p) => isRenewal(p.status));
    const lost = all.filter((p) => isLost(p.status));
    const closedWon = all.filter((p) => isClosedWon(p.status));
    const newSigned = closedWon.filter((p) => !isRenewal(p.status));
    const uniqueSigned = newSigned.filter((p) => normalizeBusinessType(p) !== 'DOUBLE');
    const renewalSigned = renewals.filter((p) => isClosedWon(p.status) || isRenewal(p.status));

    const weightedForecast = all.reduce(
      (acc, proposal) => {
        const explicitTemperature = getForecastTemperatureFromProposal(proposal);
        const weight = (explicitTemperature !== undefined ? explicitTemperature : getForecastWeightPercent(proposal.status)) / 100;

        acc.value += (proposal.value || 0) * weight;
        acc.qty += weight;
        return acc;
      },
      { value: 0, qty: 0 }
    );

    const forecastValue = Math.max(weightedForecast.value, 0);
    const forecastQtyRaw = Math.max(weightedForecast.qty, 0);
    const forecastQty = Math.round(forecastQtyRaw);
    const forecastPercentRaw = all.length > 0 ? Math.min((forecastQtyRaw / all.length) * 100, 100) : 0;
    const forecastPercent = snapToForecastStep(forecastPercentRaw);

    return {
      top: [
        { title: 'funil de vendas', amount: sum(all), qty: all.length, color: 'from-[#ff6f0f] via-[#ff9d17] to-[#ffb21a]' },
        { title: 'funil de renovação', amount: sum(renewals), qty: renewals.length, color: 'from-[#2384ff] via-[#1a9cff] to-[#20d4f5]' },
        { title: 'forecast de vendas', amount: forecastValue, qty: forecastQty, color: 'from-[#18d97c] via-[#20d4f5] to-[#2384ff]' },
      ],
      bottom: [
        { title: 'vendas novas assinadas', amount: sum(newSigned), qty: newSigned.length, color: 'from-[#18d97c] via-[#14c779] to-[#0fa666]' },
        { title: 'vendas únicas assinadas', amount: sum(uniqueSigned), qty: uniqueSigned.length, color: 'from-[#20d4f5] via-[#2384ff] to-[#1d5ee8]' },
        { title: 'renovações de contratos assinados', amount: sum(renewalSigned), qty: renewalSigned.length, color: 'from-[#ffb21a] via-[#ff8f13] to-[#ff6f0f]' },
        { title: 'projetos perdidos', amount: sum(lost), qty: lost.length, color: 'from-[#ff436d] via-[#ef3358] to-[#c81f43]' },
      ],
      forecastPercent,
    };
  }, [filteredMonthProposals]);

  const salesForecastChartData = useMemo(() => {
    const newSales = monthlyFunnelBoard.bottom[0];
    const renewals = monthlyFunnelBoard.bottom[2];
    const lost = monthlyFunnelBoard.bottom[3];
    const forecast = monthlyFunnelBoard.top[2];

    return [
      { key: 'new-sales', label: 'Novas', fullLabel: 'Vendas novas assinadas', value: newSales?.amount || 0, qty: newSales?.qty || 0, color: '#18d97c' },
      { key: 'renewals', label: 'Renovações', fullLabel: 'Renovações assinadas', value: renewals?.amount || 0, qty: renewals?.qty || 0, color: '#ffb21a' },
      { key: 'lost', label: 'Perdidos', fullLabel: 'Projetos perdidos', value: -(lost?.amount || 0), qty: lost?.qty || 0, color: '#ff436d' },
      { key: 'forecast', label: 'Forecast', fullLabel: 'Forecast final', value: forecast?.amount || 0, qty: forecast?.qty || 0, color: '#20d4f5' },
    ];
  }, [monthlyFunnelBoard]);

  const forecastGaugePercent = useMemo(
    () => Math.max(0, Math.min(monthlyFunnelBoard.forecastPercent, 100)),
    [monthlyFunnelBoard.forecastPercent]
  );

  const forecastGaugeNeedle = useMemo(() => {
    const theta = Math.PI - (forecastGaugePercent / 100) * Math.PI;
    return {
      x: 90 + 52 * Math.cos(theta),
      y: 82 - 52 * Math.sin(theta),
    };
  }, [forecastGaugePercent]);

  useEffect(() => {
    const animationTimer = setTimeout(() => setDashboardReady(true), 120);

    const fetchProposals = async () => {
      if (!user) return;

      try {
        console.log('Fetching proposals for user:', user.id, user.email);
        
        // Ler token do CRM para autenticar a chamada
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };

        const response = await fetch('/api/simulator/proposals?dashboard=true&all=true', {
          method: 'GET',
          headers: authHeaders,
        });

        if (!response.ok) {
          console.error('Error response:', response.status, response.statusText);
          return;
        }

        const proposalsData = await response.json();
        console.log('Fetched proposals from API:', proposalsData);

        // A API retorna { success: true, data: { proposals: [...] } }
        const proposalsArray = proposalsData?.data?.proposals || proposalsData?.proposals || proposalsData || [];
        console.log('Proposals array:', proposalsArray);

        const proposalsList = proposalsArray.map((data: any) => {
          const baseIdRaw = String(data.baseId || data.base_id || '').trim();
          let title = data.title || "Proposta";
          
          // If title is not set, generate from baseId
          if (!data.title && baseIdRaw) {
            const sequence = extractProposalSequence(baseIdRaw);
            if (baseIdRaw.startsWith("Prop_MV_")) title = `Proposta Máquinas Virtuais - ${sequence}`;
            else if (baseIdRaw.startsWith("Prop_PabxSip_")) title = `Proposta PABX/SIP - ${sequence}`;
            else if (
              baseIdRaw.startsWith("Prop_ManFibra_") ||
              baseIdRaw.startsWith("Prop_Inter_Man_") ||
              baseIdRaw.startsWith("Prop_IM_") ||
              baseIdRaw.startsWith("Prop_Rede_Man/Filbra_") ||
              baseIdRaw.startsWith("Prop_Rede_Man/Fibra_")
            ) title = `Proposta Rede Man/MPLS Fibra - ${sequence}`;
            else if (baseIdRaw.startsWith("Prop_Double_")) title = `Proposta Double-Fibra/Radio - ${sequence}`;
            else if (baseIdRaw.startsWith("Prop_InternetFibra_")) title = `Proposta Internet Fibra - ${sequence}`;
            else if (baseIdRaw.startsWith("Prop_InternetRadio_")) title = `Proposta Internet Rádio - ${sequence}`;
            else if (
              baseIdRaw.startsWith("Prop_ManRadio_") ||
              baseIdRaw.startsWith("Prop_InterMan_Radio_") ||
              baseIdRaw.startsWith("Prop_Rede_Man/Radio_")
            ) title = `Proposta Rede Man/MPLS Radio - ${sequence}`;
          }

          const createdAtDate = data.createdAt ? new Date(data.createdAt) : new Date();
          const expiryDate = data.expiryDate ? new Date(data.expiryDate) : new Date(createdAtDate.getTime() + 30 * 24 * 60 * 60 * 1000);

          const accountManagerRaw =
            data.accountManager ??
            (data as any).account_manager ??
            data.metadata?.accountManagerData ??
            data.metadata?.fullAccountManagerData ??
            data.metadata?.accountManager ??
            data.metadata?.accountManagerName ??
            data.metadata?.account_manager;

          return {
            id: data.id,
            baseId: baseIdRaw,
            base_id: baseIdRaw,
            version: data.version || 1,
            title: title,
            client: data.metadata?.clientData || data.client || 'N/A',
            clientData: data.metadata?.clientData || null,
            type: data.type || 'standard',
            value: parseFloat(data.value) || 0,
            status: data.status || 'Rascunho',
            forecastTemperature: typeof data.forecastTemperature === 'number'
              ? data.forecastTemperature
              : (data.metadata?.forecastTemperature !== undefined ? Number(data.metadata.forecastTemperature) : undefined),
            metadata: data.metadata,
            // Produtos do metadata (onde são realmente salvos)
            products: data.metadata?.products || data.products || [],
            items: data.metadata?.products || data.items || [],
            // Descontos
            applySalespersonDiscount: data.metadata?.applySalespersonDiscount ?? false,
            appliedDirectorDiscountPercentage: data.metadata?.appliedDirectorDiscountPercentage ?? 0,
            baseTotalMonthly: data.metadata?.baseTotalMonthly || data.metadata?.totalMonthly || parseFloat(data.value) || 0,
            totalMonthly: data.metadata?.totalMonthly || parseFloat(data.value) || 0,
            // Cliente existente
            isExistingClient: data.metadata?.isExistingClient ?? false,
            previousMonthlyFee: data.metadata?.previousMonthlyFee ?? 0,
            createdBy: data.createdBy || 'N/A',
            accountManager: (() => {
              // accountManager pode vir como string JSON do banco
              const raw = accountManagerRaw;
              if (!raw) return 'N/A';
              if (typeof raw === 'string') {
                try { return JSON.parse(raw); } catch { return raw; }
              }
              return raw;
            })(),
            createdAt: data.createdAt,
            distributorId: data.distributorId || 'N/A',
            date: createdAtDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
          } as Proposal;
        });
        
        console.log('Processed proposals:', proposalsList);
        setProposals(proposalsList);
      } catch (error) {
        console.error("Error fetching proposals:", error);
      }
    };

    const fetchPartners = async () => {
      try {
        // Partners desabilitado - migrar para API quando necessário
        const partnersData: any[] = [];
        const error = null;

        if (error) {
          console.error('Erro ao buscar parceiros:', error);
          return;
        }

        const partnersList = (partnersData || []).map((data: any) => {
          return {
            id: data.id || 0,
            name: data.name || 'Sem nome',
            type: 'Cliente', // Default type as per Partner interface
            contact: data.contact || '',
            phone: data.phone || '',
            status: data.status === 'Ativo' ? 'Ativo' : 'Inativo',
            site: data.site || '',
            products: data.products || '',
            sitePartner: data.site_partner || '',
            siteRO: data.site_ro || '',
            templateRO: data.template_ro || '',
            procedimentoRO: data.procedimento_ro || '',
            login: data.login || '',
            password: data.password || '',
            mainContact: data.main_contact || ''
          } as Partner;
        });
        setPartners(partnersList);
      } catch (error) {
        console.error("Error fetching partners:", error);
      }
    };

    if (user) {
      fetchProposals();
      fetchPartners();
    }
    setLoading(false);

    return () => clearTimeout(animationTimer);
  }, [user]);

  const handleSave = (proposal: Proposal) => {
    // Lógica para salvar (criar ou atualizar) uma proposta
    console.log('Saving proposal:', proposal);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) {
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/simulator/proposals/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir proposta');
      }

      // Atualizar lista de propostas removendo a excluída
      setProposals(prev => prev.filter(p => p.id !== id));
      
      console.log('✅ Proposta excluída com sucesso');
    } catch (error) {
      console.error('❌ Erro ao excluir proposta:', error);
      alert(error instanceof Error ? error.message : 'Erro ao excluir proposta');
    }
  };

  const handleBackToTop = () => {
    // Scroll para o topo do dashboard (seção de gráficos)
    const dashboardTopSection = document.querySelector('[data-section="dashboard-top"]');
    if (dashboardTopSection) {
      dashboardTopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Fallback to scroll to page top if section not found
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFullscreenToggle = async () => {
    try {
      const mainContainer = document.querySelector('[data-section="dashboard-main"]');
      if (!mainContainer) return;

      if (!isFullscreen) {
        // Enter fullscreen
        if (mainContainer.requestFullscreen) {
          await mainContainer.requestFullscreen();
          setIsFullscreen(true);
        } else if ((mainContainer as any).webkitRequestFullscreen) {
          await (mainContainer as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        // Exit fullscreen
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else if ((document as any).webkitFullscreenElement) {
          await (document as any).webkitExitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('Erro ao alternar fullscreen:', error);
    }
  };

  const handleSyncProposals = async () => {
    setIsSyncing(true);
    try {
      console.log('🔄 Sincronizando propostas...');
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch('/api/simulator/proposals?dashboard=true&all=true', {
        method: 'GET',
        headers: authHeaders,
      });

      if (!response.ok) {
        throw new Error(`Erro ao sincronizar: ${response.statusText}`);
      }

      const proposalsData = await response.json();
      const proposalsArray = proposalsData?.data?.proposals || proposalsData?.proposals || proposalsData || [];
      
      console.log('✅ Propostas sincronizadas:', proposalsArray.length);

      const proposalsList = proposalsArray.map((data: any) => {
        const baseIdRaw = String(data.baseId || data.base_id || '').trim();
        let title = data.title || "Proposta";
        
        if (!data.title && baseIdRaw) {
          const sequence = extractProposalSequence(baseIdRaw);
          if (baseIdRaw.startsWith("Prop_MV_")) title = `Proposta Máquinas Virtuais - ${sequence}`;
          else if (baseIdRaw.startsWith("Prop_PabxSip_")) title = `Proposta PABX/SIP - ${sequence}`;
          else if (
            baseIdRaw.startsWith("Prop_ManFibra_") ||
            baseIdRaw.startsWith("Prop_Inter_Man_") ||
            baseIdRaw.startsWith("Prop_IM_") ||
            baseIdRaw.startsWith("Prop_Rede_Man/Filbra_") ||
            baseIdRaw.startsWith("Prop_Rede_Man/Fibra_")
          ) title = `Proposta Rede Man/MPLS Fibra - ${sequence}`;
          else if (baseIdRaw.startsWith("Prop_Double_")) title = `Proposta Double-Fibra/Radio - ${sequence}`;
          else if (baseIdRaw.startsWith("Prop_InternetFibra_")) title = `Proposta Internet Fibra - ${sequence}`;
          else if (baseIdRaw.startsWith("Prop_InternetRadio_")) title = `Proposta Internet Rádio - ${sequence}`;
          else if (
            baseIdRaw.startsWith("Prop_ManRadio_") ||
            baseIdRaw.startsWith("Prop_InterMan_Radio_") ||
            baseIdRaw.startsWith("Prop_Rede_Man/Radio_")
          ) title = `Proposta Rede Man/MPLS Radio - ${sequence}`;
        }

        const createdAtDate = data.createdAt ? new Date(data.createdAt) : new Date();
        const expiryDate = data.expiryDate ? new Date(data.expiryDate) : new Date(createdAtDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        const accountManagerRaw =
          data.accountManager ??
          (data as any).account_manager ??
          data.metadata?.accountManagerData ??
          data.metadata?.fullAccountManagerData ??
          data.metadata?.accountManager ??
          data.metadata?.accountManagerName ??
          data.metadata?.account_manager;

        return {
          id: data.id,
          baseId: baseIdRaw,
          version: data.version || 1,
          title: title,
          client: data.client || 'N/A',
          type: data.type || 'standard',
          value: parseFloat(data.value) || 0,
          status: data.status || 'Rascunho',
          forecastTemperature: typeof data.forecastTemperature === 'number'
            ? data.forecastTemperature
            : (data.metadata?.forecastTemperature !== undefined ? Number(data.metadata.forecastTemperature) : undefined),
          metadata: data.metadata,
          createdBy: data.createdBy || 'N/A',
          accountManager: accountManagerRaw || 'N/A',
          createdAt: data.createdAt,
          distributorId: data.distributorId || 'N/A',
          date: createdAtDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
        } as Proposal;
      });
      
      setProposals(proposalsList);
      alert(`✅ Sincronização concluída! ${proposalsList.length} propostas carregadas.`);
    } catch (error) {
      console.error('❌ Erro ao sincronizar propostas:', error);
      alert(`❌ Erro ao sincronizar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const safeProposalDistributionData = proposalDistributionData.length
    ? proposalDistributionData
    : [{ name: 'Sem propostas', value: 1, color: '#475569' }];

  const safeValueDistributionData = valueDistributionData.length
    ? valueDistributionData
    : [{ name: 'Sem valores', value: 1, color: '#475569' }];

  const simulatorPanelStyle = {
    background: 'linear-gradient(180deg, rgba(20,29,49,0.97) 0%, rgba(9,14,27,0.99) 100%)',
    borderColor: 'rgba(78,91,118,0.48)'
  };

  const simulatorInnerStyle = {
    background: 'linear-gradient(145deg, rgba(17,26,45,0.94) 0%, rgba(9,15,28,0.96) 100%)',
    borderColor: 'rgba(67,80,106,0.5)'
  };

  const chartTooltipStyle = {
    backgroundColor: 'rgba(7, 11, 22, 0.96)',
    border: '1px solid rgba(255, 111, 15, 0.42)',
    borderRadius: '8px',
    color: '#f8fafc',
    boxShadow: '0 20px 40px rgba(0,0,0,0.45)'
  };

  const simulatorKpis = [
    {
      label: 'Propostas',
      value: totalProposalsMonth,
      caption: 'Volume total no período',
      color: '#20d4f5',
      border: 'rgba(32,212,245,0.36)',
      background: 'rgba(32,212,245,0.12)'
    },
    {
      label: 'Receita Total',
      value: formatCurrencyCompact(totalValueMonth),
      caption: 'Pipeline em simulações',
      color: '#ff6f0f',
      border: 'rgba(255,111,15,0.36)',
      background: 'rgba(255,111,15,0.12)'
    },
    {
      label: 'Forecast',
      value: `${forecastGaugePercent.toFixed(1).replace('.', ',')}%`,
      caption: 'Temperatura comercial',
      color: '#18d97c',
      border: 'rgba(24,217,124,0.36)',
      background: 'rgba(24,217,124,0.12)'
    }
  ];

  if (loading) {
    return (
      <div className="market-dashboard flex min-h-screen items-center justify-center bg-[#070b16] text-[#8f9caf]">
        Carregando...
      </div>
    );
  }

  return (
    <div className="market-dashboard min-h-screen space-y-6 bg-[#070b16] p-6" data-section="dashboard-main">
      <style>{`
        [data-section="dashboard-main"]:fullscreen { overflow-y: auto; padding: 1.5rem; }
        [data-section="dashboard-main"]:-webkit-full-screen { overflow-y: auto; padding: 1.5rem; }
        @keyframes gauge-needle { from { transform-origin: 90px 82px; transform: rotate(-90deg); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .anim-card { animation: fadeSlideUp 0.6s ease-out both; }
      `}</style>

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-6 py-4 shadow-[0_28px_70px_-48px_rgba(0,0,0,0.95)]" style={simulatorPanelStyle}>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-gradient-to-br from-[#ff6f0f] to-[#ffb21a] p-3 shadow-[0_18px_40px_-22px_rgba(255,111,15,0.9)]">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffb21a]">Simulator Intelligence</p>
            <h2 className="text-2xl font-black uppercase text-[#f4f7fb]">Painel Analítico</h2>
            <p className="text-sm font-semibold text-[#8f9caf]">Visão moderna de volume, forecast e receita total</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={handleFullscreenToggle}
            className="flex items-center gap-2 rounded-md border border-[#344159] bg-[#101827]/95 px-4 py-2 text-sm font-bold text-[#cbd5e4] transition-all hover:border-[#ff6f0f] hover:text-[#ffb21a]">
            {isFullscreen ? <><Minimize2 className="h-4 w-4" /><span>Sair</span></> : <><Maximize2 className="h-4 w-4" /><span>Apresentação</span></>}
          </button>
          {simulatorKpis.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border px-4 py-2 text-center"
              style={{ borderColor: item.border, background: item.background }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8f9caf]">{item.label}</p>
              <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="rounded-lg border p-5" style={simulatorPanelStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black uppercase tracking-[0.12em] text-[#f4f7fb]">Filtros</h3>
          <div className="flex gap-2">
            <button onClick={handleSyncProposals} disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-md border border-[#18d97c66] bg-[#18d97c14] px-3 py-1.5 text-xs font-bold text-[#18d97c] transition-colors hover:bg-[#18d97c22] disabled:opacity-50">
              {isSyncing ? <><Loader2 className="h-3 w-3 animate-spin" />Sincronizando...</> : <>
                <RefreshCcw className="h-3 w-3" />
                Sincronizar
              </>}
            </button>
            <button onClick={() => { setSelectedAccountManager("all"); setSelectedBusinessType("all"); setSelectedTemperature("all"); }}
              className="rounded-md border border-[#344159] px-3 py-1.5 text-xs font-bold text-[#cbd5e4] transition-colors hover:border-[#ff6f0f] hover:text-[#ffb21a]">
              Limpar
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { label: "Gerente de Contas", value: selectedAccountManager, onChange: setSelectedAccountManager,
              options: [{ v: "all", l: "Todos os gerentes" }, ...accountManagerOptions.map(m => ({ v: m, l: m }))] },
            { label: "Tipo de Negócio", value: selectedBusinessType, onChange: setSelectedBusinessType,
              options: [{ v: "all", l: "Todos os tipos" }, ...businessTypeOptions.map(t => ({ v: t, l: formatBusinessType(t) }))] },
            { label: "Temperatura", value: selectedTemperature, onChange: setSelectedTemperature,
              options: [{ v: "all", l: "Todas" }, { v: "0", l: "0%" }, { v: "25", l: "25%" }, { v: "50", l: "50%" }, { v: "75", l: "75%" }, { v: "100", l: "100%" }] },
          ].map(f => (
            <div key={f.label}>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#8f9caf]">{f.label}</label>
              <select value={f.value} onChange={e => f.onChange(e.target.value)}
                className="w-full rounded-md border border-[#344159] bg-[#101827]/90 px-3 py-2 text-sm font-bold text-[#e7edf8] focus:border-[#ff6f0f] focus:outline-none">
                {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS TOP ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {monthlyFunnelBoard.top.map((item, i) => (
          <div key={item.title} className="anim-card relative overflow-hidden rounded-lg p-5 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.9)]" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-90`} />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2)_0%,transparent_48%,rgba(0,0,0,0.22)_100%)]" />
            <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-24px_44px_rgba(0,0,0,0.34)]" />
            <div className="relative z-10 flex flex-col h-full gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/82">{item.title}</p>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-black leading-none text-white">{formatCurrencyCompact(item.amount)}</p>
                <div className="text-right">
                  <p className="text-2xl font-black text-white/90">{item.qty}</p>
                  <p className="text-xs font-bold text-white/70">projetos</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FORECAST GAUGE + FUNIL ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">

        {/* GAUGE VELOCÍMETRO */}
        <div className="anim-card flex flex-col items-center gap-4 rounded-lg border p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)]" style={{ ...simulatorPanelStyle, animationDelay: "120ms" }}>
          <div className="w-full">
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#20d4f5]">Indicador Forecast</p>
            <p className="text-xl font-black uppercase text-[#f4f7fb]">Temperatura do Funil</p>
          </div>

          {/* Gauge SVG - estilo velocímetro */}
          <div className="relative flex items-center justify-center w-full">
            <svg viewBox="0 0 220 130" className="w-full max-w-[280px] drop-shadow-2xl">
              <defs>
                <filter id="gaugeShadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5"/>
                </filter>
                <filter id="needleGlow">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fff" floodOpacity="0.6"/>
                </filter>
                <radialGradient id="gaugeBase" cx="50%" cy="100%" r="80%">
                  <stop offset="0%" stopColor="#17233b"/>
                  <stop offset="100%" stopColor="#080d19"/>
                </radialGradient>
                <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff436d"/>
                  <stop offset="25%" stopColor="#ff6f0f"/>
                  <stop offset="50%" stopColor="#ffb21a"/>
                  <stop offset="75%" stopColor="#20d4f5"/>
                  <stop offset="100%" stopColor="#18d97c"/>
                </linearGradient>
              </defs>

              {/* Fundo arredondado */}
              <rect x="5" y="5" width="210" height="120" rx="16" fill="url(#gaugeBase)" filter="url(#gaugeShadow)"/>
              <rect x="5" y="5" width="210" height="120" rx="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

              {/* Reflexo superior */}
              <ellipse cx="110" cy="20" rx="70" ry="10" fill="rgba(255,255,255,0.06)"/>

              {/* Track de fundo (cinza) */}
              <path d="M 30 105 A 80 80 0 0 1 190 105" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="18" strokeLinecap="round"/>

              {/* Track colorido com gradiente */}
              <path d="M 30 105 A 80 80 0 0 1 190 105" fill="none" stroke="url(#gaugeTrack)" strokeWidth="14" strokeLinecap="round" opacity="0.9"/>

              {/* Segmentos com cores sólidas por faixa */}
              {[
                { color: "#ff436d", dash: 50.3, offset: 0 },
                { color: "#ff6f0f", dash: 50.3, offset: -50.3 },
                { color: "#ffb21a", dash: 50.3, offset: -100.5 },
                { color: "#20d4f5", dash: 50.3, offset: -150.8 },
                { color: "#18d97c", dash: 50.3, offset: -201.1 },
              ].map((seg, i) => (
                <path key={i}
                  d="M 30 105 A 80 80 0 0 1 190 105"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="13"
                  strokeLinecap="butt"
                  strokeDasharray={`${seg.dash} 251.3`}
                  strokeDashoffset={seg.offset}
                />
              ))}

              {/* Marcações */}
              {[0, 25, 50, 75, 100].map((pct, i) => {
                const angle = -180 + (pct / 100) * 180;
                const rad = (angle * Math.PI) / 180;
                const cx = 110 + 80 * Math.cos(rad);
                const cy = 105 + 80 * Math.sin(rad);
                const ix = 110 + 68 * Math.cos(rad);
                const iy = 105 + 68 * Math.sin(rad);
                const tx = 110 + 56 * Math.cos(rad);
                const ty = 105 + 56 * Math.sin(rad);
                return (
                  <g key={pct}>
                    <line x1={ix} y1={iy} x2={cx} y2={cy} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.7)" fontSize="8" fontWeight="600">{pct}%</text>
                  </g>
                );
              })}

              {/* Agulha */}
              {(() => {
                const angle = -180 + (forecastGaugePercent / 100) * 180;
                const rad = (angle * Math.PI) / 180;
                const tx = 110 + 72 * Math.cos(rad);
                const ty = 105 + 72 * Math.sin(rad);
                return (
                  <g filter="url(#needleGlow)">
                    <line x1="110" y1="105" x2={tx} y2={ty} stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="110" cy="105" r="6" fill="white"/>
                    <circle cx="110" cy="105" r="3" fill="#0a1525"/>
                  </g>
                );
              })()}

              {/* Valor central */}
              <rect x="75" y="108" width="70" height="20" rx="6" fill="rgba(0,0,0,0.5)"/>
              <text x="110" y="121" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
                {forecastGaugePercent.toFixed(1).replace(".", ",")}%
              </text>
            </svg>
          </div>

          {/* Resumo forecast */}
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#ff6f0f40] bg-[#ff6f0f12] px-3 py-2.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8f9caf]">Forecast Final</p>
              <p className="text-lg font-black text-[#ffb21a]">{formatCurrencyCompact(monthlyFunnelBoard.top[2]?.amount || 0)}</p>
            </div>
            <div className="rounded-lg border border-[#20d4f540] bg-[#20d4f512] px-3 py-2.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8f9caf]">Taxa Prevista</p>
              <p className="text-lg font-black text-[#20d4f5]">{monthlyFunnelBoard.forecastPercent.toFixed(1)}%</p>
            </div>
          </div>

          {/* Gráfico de barras forecast */}
          <div className="w-full h-48">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#8f9caf]">Projeção Comercial</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesForecastChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {salesForecastChartData.map(item => (
                    <linearGradient key={item.key} id={`fcBar-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={adjustHexColor(item.color, 0.2)} stopOpacity={0.95}/>
                      <stop offset="100%" stopColor={adjustHexColor(item.color, -0.2)} stopOpacity={0.9}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(82,96,124,0.22)" vertical={false}/>
                <XAxis dataKey="label" stroke="#8f9caf" tickLine={false} axisLine={false} fontSize={10}/>
                <YAxis stroke="#8f9caf" tickLine={false} axisLine={false} tickFormatter={v => formatCurrencyCompact(Math.abs(Number(v)))} fontSize={9}/>
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={chartTooltipStyle}
                  formatter={(v: number | string) => [formatCurrencyCompact(Math.abs(Number(v))), "Projetado"]}/>
                <Bar dataKey="value" radius={[8, 8, 2, 2]} animationDuration={1000}>
                  {salesForecastChartData.map(item => <Cell key={item.key} fill={`url(#fcBar-${item.key})`}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FUNIL DE VENDAS ESTRATÉGICO */}
        <div className="anim-card rounded-lg border p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)]" style={{ ...simulatorPanelStyle, animationDelay: "160ms" }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff6f0f]">Sales Funnel</p>
              <h3 className="text-2xl font-black uppercase text-[#f4f7fb]">Funil de Vendas Estratégico</h3>
              <p className="mt-1 text-sm font-semibold text-[#8f9caf]">Jornada completa do lead até o fechamento</p>
            </div>
            <div className="rounded-lg border border-[#ff6f0f40] bg-[#ff6f0f12] p-2.5">
              <Target className="h-5 w-5 text-[#ff6f0f]"/>
            </div>
          </div>

          {/* Barras do funil - estilo print 2 */}
          <div className="space-y-2.5 max-w-2xl mx-auto">
            {funnelVisualData.map((item, idx) => (
              <div key={item.key} className="transition-all duration-500 mx-auto" style={{ width: `${item.width}%` }}>
                <div className={`rounded-xl bg-gradient-to-r ${item.gradient} px-5 py-3 ${item.shadow} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,transparent_60%)]"/>
                  <div className="relative flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{item.label}</span>
                    <span className="text-2xl font-extrabold text-white leading-none">{item.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ícone central */}
          <div className="flex justify-center my-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#3d4960] bg-[#101827]">
              <div className="absolute h-9 w-9 rounded-full border border-[#3d4960]"/>
              <div className="absolute h-5 w-5 rounded-full border border-[#526078]"/>
              <div className="h-3 w-3 rounded-full bg-[#ff6f0f] shadow-[0_0_14px_rgba(255,111,15,0.9)]"/>
            </div>
          </div>

          {/* Stats do funil */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="rounded-lg border border-[#2384ff40] bg-[#2384ff12] px-4 py-3 text-center">
              <p className="text-3xl font-black text-[#2384ff]">{funnelSummary.previstos}</p>
              <p className="mt-1 text-xs font-bold text-[#8f9caf]">Leads no Funil</p>
            </div>
            <div className="rounded-lg border border-[#20d4f540] bg-[#20d4f512] px-4 py-3 text-center">
              <p className="text-3xl font-black text-[#20d4f5]">{funnelSummary.fechados}</p>
              <p className="mt-1 text-xs font-bold text-[#8f9caf]">Vendas Concluídas</p>
            </div>
            <div className="rounded-lg border border-[#18d97c40] bg-[#18d97c12] px-4 py-3 text-center">
              <p className="text-3xl font-black text-[#18d97c]">{funnelSummary.conversion.toFixed(1)}%</p>
              <p className="mt-1 text-xs font-bold text-[#8f9caf]">Taxa de Conversão</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS BOTTOM ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {monthlyFunnelBoard.bottom.map((item, i) => (
          <div key={item.title} className="anim-card relative overflow-hidden rounded-lg p-4 shadow-[0_20px_44px_-28px_rgba(0,0,0,0.88)]" style={{ animationDelay: `${200 + i * 60}ms` }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-85`}/>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,transparent_50%)]"/>
            <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"/>
            <div className="relative z-10">
              <p className="mb-2 text-[11px] font-black uppercase leading-tight tracking-[0.12em] text-white/75">{item.title}</p>
              <p className="text-2xl font-black leading-none text-white">{formatCurrencyCompact(item.amount)}</p>
              <p className="mt-1 text-sm font-bold text-white/80">{item.qty} projetos</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── GRÁFICOS ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">

        {/* Propostas por Serviço */}
        <div className={`anim-card relative overflow-hidden rounded-lg border p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] transition-all duration-700 ${dashboardReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ ...simulatorPanelStyle, animationDelay: "300ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-2 w-2 rounded-full bg-[#20d4f5] shadow-[0_0_8px_rgba(32,212,245,0.8)]"/>
            <h3 className="text-lg font-black uppercase text-[#f4f7fb]">Propostas por Serviço</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -15, bottom: 6 }} barSize={28}>
              <defs>
                {chartData.map((entry, i) => (
                  <linearGradient key={i} id={`svcGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={adjustHexColor(entry.color, 0.25)} stopOpacity={1}/>
                    <stop offset="100%" stopColor={adjustHexColor(entry.color, -0.2)} stopOpacity={0.9}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(82,96,124,0.22)" vertical={false}/>
              <XAxis dataKey="name" stroke="#8f9caf" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={40}/>
              <YAxis stroke="#8f9caf" tickLine={false} axisLine={false} allowDecimals={false} fontSize={11}/>
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={chartTooltipStyle}
                formatter={(v: number | string) => [`${v} propostas`, "Volume"]}/>
              <Bar dataKey="proposals" radius={[8, 8, 2, 2]} animationDuration={1200} stroke="rgba(255,255,255,0.2)" strokeWidth={1}>
                {chartData.map((_, i) => <Cell key={i} fill={`url(#svcGrad-${i})`}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Propostas - Pizza */}
        <div className={`anim-card relative overflow-hidden rounded-lg border p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] transition-all duration-700 delay-100 ${dashboardReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ ...simulatorPanelStyle, animationDelay: "360ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-2 w-2 rounded-full bg-[#ff6f0f] shadow-[0_0_8px_rgba(255,111,15,0.8)]"/>
            <h3 className="text-lg font-black uppercase text-[#f4f7fb]">Distribuição de Propostas</h3>
          </div>
          <div className="relative h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {safeProposalDistributionData.map((entry, i) => (
                    <radialGradient key={i} id={`ppGrad-${i}`} cx="30%" cy="30%" r="75%">
                      <stop offset="0%" stopColor={adjustHexColor(entry.color, 0.3)} stopOpacity={1}/>
                      <stop offset="100%" stopColor={adjustHexColor(entry.color, -0.3)} stopOpacity={0.95}/>
                    </radialGradient>
                  ))}
                </defs>
                <Pie data={safeProposalDistributionData} cx="50%" cy="50%" innerRadius={68} outerRadius={100}
                  paddingAngle={4} dataKey="value" animationDuration={1200}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1}>
                  {safeProposalDistributionData.map((_, i) => <Cell key={i} fill={`url(#ppGrad-${i})`}/>)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number | string) => [`${v} propostas`, "Volume"]}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8f9caf]">Total</span>
              <span className="text-3xl font-black text-[#f4f7fb]">{totalProposalsMonth}</span>
            </div>
          </div>
          {/* Legenda */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {safeProposalDistributionData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}/>
                <span className="text-xs font-semibold text-[#8f9caf]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Volume x Receita - Line + Bar */}
        <div className={`anim-card relative overflow-hidden rounded-lg border p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] transition-all duration-700 delay-200 ${dashboardReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ ...simulatorPanelStyle, animationDelay: "420ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-2 w-2 rounded-full bg-[#18d97c] shadow-[0_0_8px_rgba(24,217,124,0.8)]"/>
            <h3 className="text-lg font-black uppercase text-[#f4f7fb]">Volume × Receita</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 20, left: -15, bottom: 6 }}>
              <defs>
                <linearGradient id="lineGradColor" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#18d97c"/>
                  <stop offset="100%" stopColor="#20d4f5"/>
                </linearGradient>
                <filter id="lineGlow"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#18d97c" floodOpacity="0.7"/></filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(82,96,124,0.22)" vertical={false}/>
              <XAxis dataKey="name" stroke="#8f9caf" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={40}/>
              <YAxis yAxisId="left" stroke="#8f9caf" tickLine={false} axisLine={false} allowDecimals={false} fontSize={11}/>
              <YAxis yAxisId="right" orientation="right" stroke="#8f9caf" tickLine={false} axisLine={false}
                tickFormatter={v => formatCurrencyCompact(Number(v))} fontSize={11}/>
              <Tooltip contentStyle={chartTooltipStyle}
                formatter={(v: number | string, name: string | number) => name === "Valor" ? [formatCurrency(Number(v)), "Valor"] : [`${v} propostas`, "Volume"]}/>
              <Bar yAxisId="left" dataKey="proposals" name="Propostas" fill="rgba(32,212,245,0.22)" radius={[6, 6, 2, 2]}
                stroke="rgba(32,212,245,0.5)" strokeWidth={1} animationDuration={1000}/>
              <Line yAxisId="right" type="monotone" dataKey="amount" name="Valor" stroke="url(#lineGradColor)"
                strokeWidth={3} dot={{ r: 4, fill: "#18d97c", stroke: "#052e16", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#20d4f5" }} animationDuration={1300} filter="url(#lineGlow)"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Valores */}
        <div className={`anim-card relative overflow-hidden rounded-lg border p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] transition-all duration-700 delay-300 ${dashboardReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ ...simulatorPanelStyle, animationDelay: "480ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-2 w-2 rounded-full bg-[#ffb21a] shadow-[0_0_8px_rgba(255,178,26,0.8)]"/>
            <h3 className="text-lg font-black uppercase text-[#f4f7fb]">Distribuição de Valores</h3>
          </div>
          <div className="relative h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {safeValueDistributionData.map((entry, i) => (
                    <radialGradient key={i} id={`vpGrad-${i}`} cx="30%" cy="30%" r="75%">
                      <stop offset="0%" stopColor={adjustHexColor(entry.color, 0.3)} stopOpacity={1}/>
                      <stop offset="100%" stopColor={adjustHexColor(entry.color, -0.3)} stopOpacity={0.95}/>
                    </radialGradient>
                  ))}
                </defs>
                <Pie data={safeValueDistributionData} cx="50%" cy="50%" innerRadius={68} outerRadius={100}
                  paddingAngle={4} dataKey="value" animationDuration={1200}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1}>
                  {safeValueDistributionData.map((_, i) => <Cell key={i} fill={`url(#vpGrad-${i})`}/>)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number | string) => [formatCurrency(Number(v)), "Valor"]}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8f9caf]">Receita</span>
              <span className="text-2xl font-black text-[#ffb21a]">{formatCurrencyCompact(totalValueMonth)}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {safeValueDistributionData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}/>
                <span className="text-xs font-semibold text-[#8f9caf]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-lg bg-gradient-to-br from-[#ff6f0f] to-[#ffb21a] p-2.5 shadow-[0_18px_40px_-22px_rgba(255,111,15,0.9)]">
            <Server className="h-5 w-5 text-white"/>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#20d4f5]">Product Mix</p>
            <h2 className="text-xl font-black uppercase text-[#f4f7fb]">Resumo por Calculadora</h2>
            <p className="text-sm font-semibold text-[#8f9caf]">Propostas geradas por produto</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            { icon: <Phone className="w-5 h-5"/>, color: "from-[#ff6f0f] to-[#ffb21a]", label: "PABX/SIP", count: countProposalsByType.pabx, value: valuesByType.pabx },
            { icon: <Server className="w-5 h-5"/>, color: "from-[#20d4f5] to-[#2384ff]", label: "Máq. Virtuais", count: countProposalsByType.maquinasVirtuais, value: valuesByType.maquinasVirtuais },
            { icon: <Wifi className="w-5 h-5"/>, color: "from-[#18d97c] to-[#10b968]", label: "Internet Fibra", count: countProposalsByType.fibra, value: valuesByType.fibra },
            { icon: <Radio className="w-5 h-5"/>, color: "from-[#ff436d] to-[#c81f43]", label: "Double Fibra/Radio", count: countProposalsByType.doubleFibraRadio, value: valuesByType.doubleFibraRadio },
            { icon: <Wifi className="w-5 h-5"/>, color: "from-[#2384ff] to-[#1d5ee8]", label: "Man/MPLS Fibra", count: countProposalsByType.man, value: valuesByType.man },
            { icon: <Radio className="w-5 h-5"/>, color: "from-[#ffb21a] to-[#ff6f0f]", label: "Man/MPLS Radio", count: countProposalsByType.manRadio, value: valuesByType.manRadio },
          ].map((stat, i) => (
            <div key={i} className="anim-card relative overflow-hidden rounded-lg border p-4 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.88)]" style={{ ...simulatorInnerStyle, animationDelay: `${500 + i * 50}ms` }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-20`}/>
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_60%)]"/>
              <div className="relative z-10">
                <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${stat.color} mb-3 shadow-lg text-white`}>{stat.icon}</div>
                <p className="mb-1 text-xs font-black uppercase tracking-[0.08em] text-[#8f9caf]">{stat.label}</p>
                <p className="text-2xl font-black leading-none text-[#f4f7fb]">{stat.count}</p>
                <p className="mt-1 text-xs font-bold text-[#ffb21a]">{formatCurrencyCompact(stat.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROPOSTAS VIEW ── */}
      <ProposalsView
        proposals={proposals}
        partners={partners}
        onSave={handleSave}
        onDelete={handleDelete}
        onBackToTop={handleBackToTop}
      />
    </div>
  );
};

export default DashboardView;
