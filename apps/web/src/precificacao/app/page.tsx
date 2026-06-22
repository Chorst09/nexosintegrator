
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Calculator, Box, PieChart, Sparkles, TrendingUp, BarChart3, Loader2, History, Clock, Share2
} from 'lucide-react';
import { PricingSidebar } from '@/app/components/pricing-sidebar';
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

export default function FinEdgeApp() {
  const { toast } = useToast();
  const [params, setParams] = useState<PricingInput>({
    upfrontItems: [
      { id: 'u1', name: 'Implantação & Onboarding', description: 'Processo completo de configuração inicial.', quantity: 1, unitCost: 15000 },
      { id: 'u2', name: 'Treinamento de Equipe', description: 'Capacitação técnica para administradores.', quantity: 1, unitCost: 5000 }
    ],
    recurringItems: [
      { id: 'r1', name: 'Licença Base SaaS', description: 'Acesso à plataforma core em nuvem.', quantity: 1, unitCost: 4500 },
      { id: 'r2', name: 'Suporte Premium', description: 'Atendimento 24/7 com SLA de 4h.', quantity: 1, unitCost: 1200 }
    ],
    durationMonths: 36,
    markupPercentage: 40,
    taxRatePercentage: 14.5,
    commissionPercentage: 5,
  });

  const [results, setResults] = useState<PricingOutput>(() => PricingEngine.calculate(params));
  const [isCalculating, setIsCalculating] = useState(false);
  const [history, setHistory] = useState<SavedScenario[]>([]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setParams(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleItemChange = (type: 'upfront' | 'recurring', id: string, field: keyof ProductItem, value: string | number) => {
    const key = type === 'upfront' ? 'upfrontItems' : 'recurringItems';
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
    setParams(prev => ({
      ...prev,
      [key]: [...prev[key], newItem]
    }));
  };

  const handleRemoveItem = (type: 'upfront' | 'recurring', id: string) => {
    const key = type === 'upfront' ? 'upfrontItems' : 'recurringItems';
    setParams(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item.id !== id)
    }));
  };

  const handleCalculate = useCallback(async () => {
    // 1. CÁLCULO LOCAL IMEDIATO - Os números na tela mudam na hora
    const newResults = PricingEngine.calculate(params);
    setResults(newResults);
    
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
                {formatCurrency(results.totalContractValue)}
              </p>
            </div>
            <div className="space-y-1 text-center md:text-left">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Margem EBITDA</p>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <TrendingUp className={cn("w-4 h-4", results.metrics.ebitdaMargin >= 20 ? 'text-emerald-500' : 'text-amber-500')} />
                <p className={cn(
                  "text-2xl font-bold tabular-nums font-headline",
                  results.metrics.ebitdaMargin >= 20 ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {formatPercent(results.metrics.ebitdaMargin)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Side Pane: Global Settings (Left) */}
          <aside className="lg:col-span-3 xl:col-span-3 sticky top-8">
            <PricingSidebar 
              params={params} 
              onChange={handleInputChange} 
              onCalculate={handleCalculate}
              isCalculating={isCalculating}
            />
          </aside>

          {/* Main Content Area (Right) */}
          <main className="lg:col-span-9 xl:col-span-9 space-y-8">
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
                <PricingSimulator results={results} params={params} />
                <ProductManager 
                  upfrontItems={params.upfrontItems}
                  recurringItems={params.recurringItems}
                  onItemChange={handleItemChange}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                />
              </TabsContent>

              <TabsContent value="allocation" className="focus-visible:outline-none">
                <ProductAllocation params={params} />
              </TabsContent>

              <TabsContent value="analytics" className="focus-visible:outline-none">
                <AnalyticsDashboard results={results} params={params} />
              </TabsContent>

              <TabsContent value="dre" className="focus-visible:outline-none">
                <DREGenerator results={results} durationMonths={params.durationMonths} />
              </TabsContent>

              <TabsContent value="ai" className="focus-visible:outline-none">
                <AIAnalysis results={results} params={params} />
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
