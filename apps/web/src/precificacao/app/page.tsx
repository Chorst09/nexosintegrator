
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ArrowRight, Calculator, Box, PieChart, Sparkles, TrendingUp, BarChart3, Loader2, History, Clock, Share2,
  FilePlus2, FileText, Search, Save
} from 'lucide-react';
import { PricingSimulator } from '@/app/components/pricing-simulator';
import { DREGenerator } from '@/app/components/dre-generator';
import { AIAnalysis } from '@/app/components/ai-analysis';
import { AnalyticsDashboard } from '@/app/components/analytics-dashboard';
import { ProductManager } from '@/app/components/product-manager';
import { ProductAllocation } from '@/app/components/product-allocation';
import { PricingEngine, PricingInput, PricingOutput, ProductItem } from '@/app/lib/pricing-engine';
import { formatCurrency, formatPercent } from '@/app/lib/formatters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { scenarioService, SavedScenario } from '@/services/scenario-service';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { loadCalculatorPricingSettings } from '@/app/lib/calculator-settings';
import { buildApiUrl, getAuthHeaders } from '../../config/api';

const PRICING_PROPOSALS_STORAGE_KEY = 'precificacao_propostas_v1';
const CALCULATOR_PROPOSALS_STORAGE_KEY = 'crm-calculadoras-propostas-v1';
const CALCULATOR_PROPOSALS_SESSION_KEY = 'crm-calculadoras-propostas-session-v1';

type SimulatorStep = 'start' | 'proposal' | 'calculation';

interface PricingProposalForm {
  number: string;
  opportunityId: string;
  opportunityNumber: string;
  opportunityTitle: string;
  clientCompany: string;
  clientContact: string;
  clientPhone: string;
  clientEmail: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
}

interface OpportunitySummary {
  id: string;
  number?: string;
  title?: string;
  projectName?: string;
  company?: {
    name?: string;
    contacts?: Array<{
      name?: string;
      phone?: string;
      email?: string;
    }>;
  };
}

interface SavedPricingProposal {
  id: string;
  number: string;
  proposalForm: PricingProposalForm;
  params: PricingInput;
  results: PricingOutput;
  createdAt: string;
  updatedAt: string;
}

const normalizeSavedPricingProposals = (source: unknown): SavedPricingProposal[] => {
  if (Array.isArray(source)) return source as SavedPricingProposal[];
  if (source && typeof source === 'object') return Object.values(source) as SavedPricingProposal[];
  return [];
};

const normalizeBudgetProposals = (source: unknown): Record<string, any>[] => {
  if (Array.isArray(source)) return source as Record<string, any>[];
  if (source && typeof source === 'object') return Object.values(source) as Record<string, any>[];
  return [];
};

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getManagerDefaults = () => {
  try {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : {};
    return {
      managerName: user?.name || '',
      managerEmail: user?.email || '',
      managerPhone: user?.phone || ''
    };
  } catch {
    return {
      managerName: '',
      managerEmail: '',
      managerPhone: ''
    };
  }
};

const generateProposalNumber = (proposals: SavedPricingProposal[] = []) => {
  const year = new Date().getFullYear();
  const nextSequence = proposals.reduce((max, proposal) => {
    const [sequence, sequenceYear] = String(proposal?.number || '').split('/');
    if (Number(sequenceYear) !== year) return max;
    const parsed = parseInt(sequence, 10);
    if (!Number.isFinite(parsed)) return max;
    return Math.max(max, parsed);
  }, 0) + 1;

  return `${String(nextSequence).padStart(4, '0')}/${year}`;
};

const buildProposalForm = (proposalNumber: string, managerDefaults = getManagerDefaults()): PricingProposalForm => ({
  number: proposalNumber || '',
  opportunityId: '',
  opportunityNumber: '',
  opportunityTitle: '',
  clientCompany: '',
  clientContact: '',
  clientPhone: '',
  clientEmail: '',
  managerName: managerDefaults.managerName || '',
  managerEmail: managerDefaults.managerEmail || '',
  managerPhone: managerDefaults.managerPhone || ''
});

const buildEmptyPricingInput = (calculatorPricingSettings: ReturnType<typeof loadCalculatorPricingSettings>): PricingInput => ({
  upfrontItems: [],
  recurringItems: [],
  durationMonths: 36,
  markupPercentage: 40,
  taxRatePercentage: calculatorPricingSettings.taxRatePercentage,
  commissionPercentage: calculatorPricingSettings.commissionPercentage,
  operatingExpensePercentage: calculatorPricingSettings.operatingExpensePercentage,
  taxRegimeName: calculatorPricingSettings.regimeName,
});

export default function FinEdgeApp() {
  const { toast } = useToast();
  const calculatorPricingSettings = loadCalculatorPricingSettings();
  const [params, setParams] = useState<PricingInput>(() => buildEmptyPricingInput(calculatorPricingSettings));
  const [results, setResults] = useState<PricingOutput>(() => PricingEngine.calculate(params));
  const [hasGeneratedResults, setHasGeneratedResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [history, setHistory] = useState<SavedScenario[]>([]);
  const [simulatorStep, setSimulatorStep] = useState<SimulatorStep>('start');
  const [savedPricingProposals, setSavedPricingProposals] = useState<SavedPricingProposal[]>([]);
  const [proposalSearchNumber, setProposalSearchNumber] = useState('');
  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([]);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [proposalFeedback, setProposalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [proposalForm, setProposalForm] = useState<PricingProposalForm>(() => buildProposalForm('', getManagerDefaults()));

  const loadHistory = useCallback(async () => {
    try {
      const data = await scenarioService.getLatestScenarios();
      setHistory(data);
    } catch (err) {
      console.error("Falha ao carregar histórico:", err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRICING_PROPOSALS_STORAGE_KEY);
      const parsed = normalizeSavedPricingProposals(stored ? JSON.parse(stored) : []);
      setSavedPricingProposals(parsed);
      setProposalSearchNumber(parsed[0]?.number || '');
    } catch (error) {
      console.error('Erro ao carregar precificações salvas:', error);
      setSavedPricingProposals([]);
    }
  }, []);

  useEffect(() => {
    const loadOpportunities = async () => {
      try {
        const response = await fetch(buildApiUrl('/opportunities'), { headers: getAuthHeaders() });
        if (!response.ok) return;
        const data = await response.json();
        setOpportunities(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar oportunidades para precificação:', error);
      }
    };
    loadOpportunities();
  }, []);

  useEffect(() => {
    if (!proposalFeedback) return undefined;
    const timer = window.setTimeout(() => setProposalFeedback(null), 4200);
    return () => window.clearTimeout(timer);
  }, [proposalFeedback]);

  useEffect(() => {
    const refreshCalculatorSettings = () => {
      const next = loadCalculatorPricingSettings();
      setHasGeneratedResults(false);
      setParams(prev => ({
        ...prev,
        taxRatePercentage: next.taxRatePercentage,
        commissionPercentage: next.commissionPercentage,
        operatingExpensePercentage: next.operatingExpensePercentage,
        taxRegimeName: next.regimeName,
      }));
    };

    refreshCalculatorSettings();
    window.addEventListener('storage', refreshCalculatorSettings);
    return () => window.removeEventListener('storage', refreshCalculatorSettings);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setHasGeneratedResults(false);
    setParams(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleItemChange = (type: 'upfront' | 'recurring', id: string, field: keyof ProductItem, value: string | number) => {
    const key = type === 'upfront' ? 'upfrontItems' : 'recurringItems';
    setHasGeneratedResults(false);
    setParams(prev => ({
      ...prev,
      [key]: prev[key].map(item => {
        if (item.id === id) {
          let updatedValue = value;
          if (field === 'quantity' || field === 'unitCost') {
            updatedValue = value === '' ? 0 : (typeof value === 'string' ? parseFloat(value) || 0 : value);
          }
          return { ...item, [field]: updatedValue };
        }
        return item;
      })
    }));
  };

  const handleAddItem = (type: 'upfront' | 'recurring') => {
    const key = type === 'upfront' ? 'upfrontItems' : 'recurringItems';
    const newItem: ProductItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'upfront' ? 'Novo Setup' : 'Novo Recorrente',
      description: '',
      quantity: 1,
      unitCost: 0
    };
    setHasGeneratedResults(false);
    setParams(prev => ({
      ...prev,
      [key]: [...prev[key], newItem]
    }));
  };

  const handleRemoveItem = (type: 'upfront' | 'recurring', id: string) => {
    const key = type === 'upfront' ? 'upfrontItems' : 'recurringItems';
    setHasGeneratedResults(false);
    setParams(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item.id !== id)
    }));
  };

  const handleCalculate = useCallback(async () => {
    // 1. CÁLCULO LOCAL IMEDIATO - Os números na tela mudam na hora
    const newResults = PricingEngine.calculate(params);
    setResults(newResults);
    setHasGeneratedResults(true);
    
    // Inicia estado de processamento para o salvamento em nuvem
    setIsCalculating(true);
    
    try {
      // 2. TENTA SALVAR NO FIREBASE
      await scenarioService.saveScenario(params, newResults);
      await loadHistory();
      
      toast({
        title: "Cálculo Concluído",
        description: "Cenário atualizado e salvo com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao persistir dados:", error);
      toast({
        title: "Aviso",
        description: "Cálculo realizado, mas houve um erro ao sincronizar com a nuvem.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  }, [params, toast, loadHistory]);

  const persistPricingProposals = (items: SavedPricingProposal[]) => {
    const ordered = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setSavedPricingProposals(ordered);
    localStorage.setItem(PRICING_PROPOSALS_STORAGE_KEY, JSON.stringify(ordered));
  };

  const startNewPricing = () => {
    const nextNumber = generateProposalNumber(savedPricingProposals);
    const nextForm = buildProposalForm(nextNumber, getManagerDefaults());
    const emptyParams = buildEmptyPricingInput(loadCalculatorPricingSettings());
    setProposalForm(nextForm);
    setProposalSearchNumber(nextNumber);
    setActiveProposalId(null);
    setProposalFeedback(null);
    setParams(emptyParams);
    setResults(PricingEngine.calculate(emptyParams));
    setHasGeneratedResults(false);
    setSimulatorStep('proposal');
  };

  const continueToItems = () => {
    if (!proposalForm.opportunityId) {
      setProposalFeedback({
        type: 'error',
        text: 'Selecione a oportunidade vinculada a esta precificação.'
      });
      return;
    }

    if (!proposalForm.clientCompany.trim() || !proposalForm.clientContact.trim()) {
      setProposalFeedback({
        type: 'error',
        text: 'Informe o nome da empresa cliente e o nome do contato antes de adicionar itens.'
      });
      return;
    }

    setProposalFeedback(null);
    setSimulatorStep('calculation');
  };

  const handleProposalOpportunityChange = (opportunityId: string) => {
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    const primaryContact = Array.isArray(opportunity?.company?.contacts) ? opportunity.company.contacts[0] : null;
    setProposalForm((prev) => ({
      ...prev,
      opportunityId,
      opportunityNumber: opportunity?.number || '',
      opportunityTitle: opportunity?.title || opportunity?.projectName || '',
      clientCompany: prev.clientCompany || opportunity?.company?.name || '',
      clientContact: prev.clientContact || primaryContact?.name || '',
      clientPhone: prev.clientPhone || primaryContact?.phone || '',
      clientEmail: prev.clientEmail || primaryContact?.email || ''
    }));
  };

  const savePricingProposal = () => {
    const proposalNumber = (proposalForm.number || '').trim() || generateProposalNumber(savedPricingProposals);
    const now = new Date().toISOString();
    const calculatedResults = PricingEngine.calculate(params);
    setResults(calculatedResults);

    const existing = activeProposalId
      ? savedPricingProposals.find(item => item.id === activeProposalId)
      : savedPricingProposals.find(item => item.number === proposalNumber);

    const payload: SavedPricingProposal = {
      id: existing?.id || crypto.randomUUID?.() || `prec_${Date.now()}`,
      number: proposalNumber,
      proposalForm: {
        ...proposalForm,
        number: proposalNumber,
        opportunityId: proposalForm.opportunityId,
        opportunityNumber: proposalForm.opportunityNumber,
        opportunityTitle: proposalForm.opportunityTitle,
        clientCompany: proposalForm.clientCompany.trim(),
        clientContact: proposalForm.clientContact.trim(),
        clientPhone: proposalForm.clientPhone.trim(),
        clientEmail: proposalForm.clientEmail.trim(),
        managerName: proposalForm.managerName.trim(),
        managerEmail: proposalForm.managerEmail.trim(),
        managerPhone: proposalForm.managerPhone.trim(),
      },
      params,
      results: calculatedResults,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const next = existing
      ? savedPricingProposals.map(item => item.id === existing.id ? payload : item)
      : [payload, ...savedPricingProposals];

    persistPricingProposals(next);
    setProposalForm(payload.proposalForm);
    setProposalSearchNumber(proposalNumber);
    setActiveProposalId(payload.id);
    setProposalFeedback({ type: 'success', text: `Precificação ${proposalNumber} salva.` });
  };

  const searchPricingProposal = () => {
    const numberTyped = proposalSearchNumber.trim();
    if (!numberTyped) {
      setProposalFeedback({ type: 'error', text: 'Informe o número da proposta para buscar.' });
      return;
    }

    const found = savedPricingProposals.find(item => item.number === numberTyped);
    if (!found) {
      setProposalFeedback({ type: 'error', text: `Nenhuma precificação encontrada para ${numberTyped}.` });
      return;
    }

    setProposalForm(found.proposalForm);
    setParams(found.params);
    setResults(found.results);
    setHasGeneratedResults(true);
    setActiveProposalId(found.id);
    setSimulatorStep('calculation');
    setProposalFeedback({ type: 'success', text: `Precificação ${found.number} carregada.` });
  };

  const addPricingToBudget = useCallback(() => {
    if (!hasGeneratedResults) {
      setProposalFeedback({ type: 'error', text: 'Gere a precificação antes de adicionar ao orçamento.' });
      return;
    }

    const existingRaw = localStorage.getItem(CALCULATOR_PROPOSALS_STORAGE_KEY)
      || sessionStorage.getItem(CALCULATOR_PROPOSALS_SESSION_KEY);
    const budgetProposals = normalizeBudgetProposals(existingRaw ? JSON.parse(existingRaw) : []);
    const nowIso = new Date().toISOString();
    const proposalNumber = (proposalForm.number || '').trim() || generateProposalNumber(budgetProposals as SavedPricingProposal[]);
    const existing = budgetProposals.find((proposal) => proposal.number === proposalNumber);
    const linkedOpportunity = opportunities.find((item) => item.id === proposalForm.opportunityId);
    const safeDuration = Math.max(1, toFiniteNumber(params.durationMonths, 1));

    const upfrontItems = params.upfrontItems.map((item, index) => {
      const quantity = toFiniteNumber(item.quantity, 0);
      const unitCost = toFiniteNumber(item.unitCost, 0);
      return {
        id: item.id || `prec_setup_${Date.now()}_${index}`,
        description: item.name || `Setup ${index + 1}`,
        quantity,
        unitCost,
        calculation: {
          rbUnitario: unitCost,
          marginComissaoValor: 0,
          impostosValor: 0,
          difalVenda: 0
        },
        pricing: {
          source: 'precificacao',
          type: 'setup',
          description: item.description || '',
          durationMonths: safeDuration
        }
      };
    });

    const recurringItems = params.recurringItems.map((item, index) => {
      const quantity = toFiniteNumber(item.quantity, 0);
      const unitCost = toFiniteNumber(item.unitCost, 0);
      const monthlyCost = quantity * unitCost;
      return {
        id: item.id || `prec_recurring_${Date.now()}_${index}`,
        description: item.name || `Recorrente ${index + 1}`,
        estimatedHours: quantity || 1,
        baseSalary: unitCost,
        contractType: 'terceiro',
        calculation: {
          hourlyCost: unitCost,
          sellPricePerHour: unitCost,
          totalCost: monthlyCost,
          totalSellPrice: monthlyCost
        },
        pricing: {
          source: 'precificacao',
          type: 'recurring',
          description: item.description || '',
          durationMonths: safeDuration
        }
      };
    });

    const payload = {
      id: existing?.id || `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      number: proposalNumber,
      calculatorType: 'precificacao',
      calculatorLabel: 'Precificação',
      opportunity: {
        id: proposalForm.opportunityId || '',
        number: linkedOpportunity?.number || proposalForm.opportunityNumber || '',
        title: linkedOpportunity?.title || linkedOpportunity?.projectName || proposalForm.opportunityTitle || ''
      },
      client: {
        companyName: proposalForm.clientCompany.trim() || 'Cliente não informado',
        contactName: proposalForm.clientContact.trim() || 'Contato não informado',
        phone: proposalForm.clientPhone.trim(),
        email: proposalForm.clientEmail.trim()
      },
      accountManager: {
        name: proposalForm.managerName.trim(),
        email: proposalForm.managerEmail.trim(),
        phone: proposalForm.managerPhone.trim()
      },
      pricing: {
        operationType: 'precificacao',
        regimeName: params.taxRegimeName || 'Configurações Gerais',
        desiredMargin: toFiniteNumber(params.markupPercentage, 0),
        rentalPeriod: safeDuration,
        durationMonths: safeDuration,
        monthlyAmortization: results.monthlyAmortization,
        totalMonthlyRecurringCost: results.totalMonthlyRecurringCost
      },
      snapshot: {
        saleItems: upfrontItems,
        rentalItems: [],
        serviceItems: recurringItems
      },
      result: {
        finalPrice: results.totalContractValue,
        monthlyPrice: results.finalMonthlyPrice,
        baseCost: results.baseMonthlyCost,
        impostosValor: Math.max(0, results.dre?.taxes?.monthlyValue || 0),
        margemEComissaoValor: Math.max(0, results.finalMonthlyPrice - results.baseMonthlyCost)
      },
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso
    };

    const nextProposals = existing
      ? budgetProposals.map((proposal) => (proposal.id === payload.id ? payload : proposal))
      : [payload, ...budgetProposals];
    const ordered = [...nextProposals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    try {
      localStorage.setItem(CALCULATOR_PROPOSALS_STORAGE_KEY, JSON.stringify(ordered));
      sessionStorage.removeItem(CALCULATOR_PROPOSALS_SESSION_KEY);
    } catch (error) {
      console.error('Erro ao salvar orçamento da precificação:', error);
      sessionStorage.setItem(CALCULATOR_PROPOSALS_SESSION_KEY, JSON.stringify(ordered));
    }

    setProposalForm((prev) => ({ ...prev, number: proposalNumber }));
    setProposalSearchNumber(proposalNumber);
    setProposalFeedback({
      type: 'success',
      text: `Orçamento ${proposalNumber} adicionado com a precificação gerada.`
    });
  }, [hasGeneratedResults, opportunities, params, proposalForm, results]);

  const emptyResults = useMemo(
    () => PricingEngine.calculate(buildEmptyPricingInput(calculatorPricingSettings)),
    [calculatorPricingSettings]
  );
  const displayedResults = hasGeneratedResults ? results : emptyResults;

  return (
    <div className="precificacao-module min-h-screen bg-transparent font-body text-[var(--crm-ink)] pb-20">
      <Toaster />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* Enterprise Header */}
        <header className="bg-white px-8 py-6 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="p-4 bg-primary text-white rounded-2xl shadow-indigo-200 shadow-xl">
              <Calculator size={32} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline text-slate-900">FinEdge Architect</h1>
              <p className="text-slate-400 text-sm font-medium tracking-wide flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                DRE & Precificação Profissional
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-10 lg:border-l border-slate-100 lg:pl-10">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">TCV (Contrato Total)</p>
              <p className="text-2xl font-bold text-primary tabular-nums font-headline">
                {formatCurrency(displayedResults.totalContractValue)}
              </p>
            </div>
            <div className="space-y-1 text-center md:text-left">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Margem EBITDA</p>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <TrendingUp className={cn("w-4 h-4", displayedResults.metrics.ebitdaMargin >= 20 ? 'text-emerald-500' : 'text-amber-500')} />
                <p className={cn(
                  "text-2xl font-bold tabular-nums font-headline",
                  displayedResults.metrics.ebitdaMargin >= 20 ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {formatPercent(displayedResults.metrics.ebitdaMargin)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 items-start">
          <main className="space-y-8">
            <Tabs defaultValue="simulator" className="w-full">
              <div className="flex justify-between items-center mb-6 overflow-x-auto pb-2">
                <TabsList className="bg-white border border-slate-200 p-1.5 h-auto rounded-2xl shadow-sm">
                  <TabsTrigger value="simulator" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-bold text-sm">
                    <Box size={16} className="mr-2" /> Simulador
                  </TabsTrigger>
                  <TabsTrigger value="allocation" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-bold text-sm">
                    <Share2 size={16} className="mr-2" /> Rateio de Produtos
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-bold text-sm">
                    <BarChart3 size={16} className="mr-2" /> Analytics
                  </TabsTrigger>
                  <TabsTrigger value="dre" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-bold text-sm">
                    <PieChart size={16} className="mr-2" /> DRE Gerencial
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-bold text-sm">
                    <Sparkles size={16} className="mr-2" /> AI Advisor
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-bold text-sm">
                    <History size={16} className="mr-2" /> Histórico
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="simulator" className="focus-visible:outline-none space-y-8">
                {simulatorStep === 'start' && (
                  <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Simulador</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900 font-headline">Inicie uma nova precificação</h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                          Cadastre os dados da proposta antes de adicionar produtos e serviços ao cálculo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={startNewPricing}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-6 py-4 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-colors"
                      >
                        <FilePlus2 className="w-5 h-5" />
                        Nova Precificação
                      </button>
                    </CardContent>
                  </Card>
                )}

                {simulatorStep !== 'start' && (
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50/80 p-5 xl:grid-cols-[minmax(190px,260px)_minmax(190px,260px)_1fr] xl:items-end">
                      <div className="min-w-0">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Nº Proposta</label>
                        <input
                          type="text"
                          value={proposalForm.number}
                          onChange={(event) => {
                            const nextNumber = event.target.value;
                            setProposalForm((prev) => ({ ...prev, number: nextNumber }));
                            setProposalSearchNumber(nextNumber);
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Buscar Nº</label>
                        <input
                          type="text"
                          value={proposalSearchNumber}
                          onChange={(event) => setProposalSearchNumber(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                        <button type="button" onClick={startNewPricing} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-500/20">
                          <FilePlus2 className="w-4 h-4" /> Nova
                        </button>
                        <button type="button" onClick={searchPricingProposal} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-500/20">
                          <Search className="w-4 h-4" /> Buscar
                        </button>
                        <button type="button" onClick={savePricingProposal} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90">
                          <Save className="w-4 h-4" /> Salvar
                        </button>
                        <button type="button" onClick={handleCalculate} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-500/20">
                          <FileText className="w-4 h-4" /> Gerar
                        </button>
                      </div>
                    </div>

                    {proposalFeedback && (
                      <div className={cn(
                        "mx-5 mt-5 rounded-2xl border px-4 py-3 text-xs font-bold",
                        proposalFeedback.type === 'error'
                          ? "border-red-100 bg-red-50 text-red-700"
                          : "border-emerald-100 bg-emerald-50 text-emerald-700"
                      )}>
                        {proposalFeedback.text}
                      </div>
                    )}

                    {simulatorStep === 'proposal' && (
                      <>
                        <div className="border-b border-slate-100 bg-cyan-600 px-6 py-5">
                          <h2 className="text-2xl font-bold text-white font-headline">Informações da Proposta</h2>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-6">
                          <div className="xl:col-span-2">
                            <label className="block text-sm font-semibold text-slate-500 mb-1.5">Oportunidade</label>
                            <select
                              value={proposalForm.opportunityId}
                              onChange={(event) => handleProposalOpportunityChange(event.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                            >
                              <option value="">Selecione a oportunidade vinculada</option>
                              {opportunities.map((opportunity) => (
                                <option key={opportunity.id} value={opportunity.id}>
                                  {[opportunity.number, opportunity.title || opportunity.projectName, opportunity.company?.name]
                                    .filter(Boolean)
                                    .join(' - ')}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-sky-600 font-headline">Dados do Cliente</h3>
                            <div>
                              <label className="block text-sm font-semibold text-slate-500 mb-1.5">Nome da Empresa Cliente</label>
                              <input value={proposalForm.clientCompany} onChange={(event) => setProposalForm(prev => ({ ...prev, clientCompany: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-500 mb-1.5">Nome do Contato</label>
                              <input value={proposalForm.clientContact} onChange={(event) => setProposalForm(prev => ({ ...prev, clientContact: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-500 mb-1.5">Telefone</label>
                              <input value={proposalForm.clientPhone} onChange={(event) => setProposalForm(prev => ({ ...prev, clientPhone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-500 mb-1.5">E-mail</label>
                              <input type="email" value={proposalForm.clientEmail} onChange={(event) => setProposalForm(prev => ({ ...prev, clientEmail: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-sky-600 font-headline">Dados do Gerente de Contas</h3>
                            <div>
                              <label className="block text-sm font-semibold text-slate-500 mb-1.5">Nome do Gerente</label>
                              <input value={proposalForm.managerName} onChange={(event) => setProposalForm(prev => ({ ...prev, managerName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-500 mb-1.5">E-mail do Gerente</label>
                              <input type="email" value={proposalForm.managerEmail} onChange={(event) => setProposalForm(prev => ({ ...prev, managerEmail: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-500 mb-1.5">Telefone do Gerente</label>
                              <input value={proposalForm.managerPhone} onChange={(event) => setProposalForm(prev => ({ ...prev, managerPhone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end px-6 pb-6">
                          <button type="button" onClick={continueToItems} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-colors">
                            <ArrowRight className="w-4 h-4" />
                            Continuar para Adicionar Itens
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {simulatorStep === 'calculation' && (
                  <>
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente</p>
                        <p className="text-lg font-bold text-slate-900">
                          {proposalForm.clientCompany || 'Sem empresa'} · {proposalForm.clientContact || 'Sem contato'}
                        </p>
                        {proposalForm.opportunityNumber || proposalForm.opportunityTitle ? (
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Oportunidade: {[proposalForm.opportunityNumber, proposalForm.opportunityTitle].filter(Boolean).join(' - ')}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSimulatorStep('proposal')}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:text-primary hover:border-primary/30"
                      >
                        Editar Dados da Proposta
                      </button>
                    </div>
                    {hasGeneratedResults && (
                      <PricingSimulator
                        results={results}
                        params={params}
                        onAddToBudget={addPricingToBudget}
                      />
                    )}
                    <ProductManager
                      params={params}
                      upfrontItems={params.upfrontItems}
                      recurringItems={params.recurringItems}
                      onParamChange={handleInputChange}
                      onItemChange={handleItemChange}
                      onAddItem={handleAddItem}
                      onRemoveItem={handleRemoveItem}
                      onCalculate={handleCalculate}
                      isCalculating={isCalculating}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="allocation" className="focus-visible:outline-none">
                <ProductAllocation params={params} />
              </TabsContent>

              <TabsContent value="analytics" className="focus-visible:outline-none">
                <AnalyticsDashboard results={displayedResults} params={params} />
              </TabsContent>

              <TabsContent value="dre" className="focus-visible:outline-none">
                <DREGenerator results={displayedResults} durationMonths={params.durationMonths} />
              </TabsContent>

              <TabsContent value="ai" className="focus-visible:outline-none">
                <AIAnalysis results={displayedResults} params={params} />
              </TabsContent>

              <TabsContent value="history" className="focus-visible:outline-none">
                <div className="grid grid-cols-1 gap-4">
                  {history.length === 0 ? (
                    <Card className="rounded-3xl border-dashed border-2 p-12 text-center">
                      <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400">Nenhum cenário salvo ainda no histórico.</p>
                    </Card>
                  ) : (
                    history.map((item) => (
                      <Card key={item.id} className="rounded-2xl shadow-sm border-slate-200 hover:border-primary/30 transition-all cursor-pointer group" onClick={() => {
                        setParams(item.inputs);
                        setResults(item.results);
                        setHasGeneratedResults(true);
                        toast({ title: "Cenário Restaurado", description: "Parâmetros aplicados com sucesso." });
                      }}>
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-slate-50 rounded-xl text-primary group-hover:bg-primary/5 transition-colors">
                              <Clock size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('pt-BR') : 'Agora'}
                              </p>
                              <p className="text-lg font-bold text-slate-800">
                                {formatCurrency(item.results.finalMonthlyPrice)} /mês
                              </p>
                            </div>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Setup / OPEX</p>
                            <p className="text-sm font-semibold text-slate-600">
                              {item.inputs.upfrontItems?.length || 0} / {item.inputs.recurringItems?.length || 0} itens
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Margem</p>
                            <p className={cn("text-sm font-bold", item.results.metrics.ebitdaMargin >= 20 ? "text-emerald-600" : "text-amber-600")}>
                              {formatPercent(item.results.metrics.ebitdaMargin)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}
