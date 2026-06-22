
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
  Share2, ArrowRight, Info, CheckCircle2, Circle, 
  BarChart3, Layers, Target, ArrowDownRight, ArrowUpRight,
  Settings2, Clock, Eye, Pencil, Save, Trash2, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PricingInput, ProductItem } from '@/app/lib/pricing-engine';
import { formatCurrency } from '@/app/lib/formatters';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductAllocationProps {
  params: PricingInput;
}

type AllocationMethod = 'proportional' | 'equal';

interface AllocationResult {
  productId: string;
  name: string;
  originalMonthlyCost: number;
  allocatedMonthlyCost: number;
  totalMonthlyCost: number;
  percentageOfTotal: number;
  breakdown: Array<{
    sourceName: string;
    amount: number;
  }>;
}

interface SavedAllocation {
  id: string;
  name: string;
  method: AllocationMethod;
  durationMonths: number;
  targetIds: string[];
  sourceIds: string[];
  results: AllocationResult[];
  totalMonthlyAllocated: number;
  createdAt: string;
  updatedAt: string;
}

const SAVED_ALLOCATIONS_KEY = 'precificacao_rateios_mensais_v1';

export function ProductAllocation({ params }: ProductAllocationProps) {
  const [method, setMethod] = useState<AllocationMethod>('proportional');
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set());
  const [sourceIds, setSourceIds] = useState<Set<string>>(new Set());
  const [allocationName, setAllocationName] = useState('Rateio mensal');
  const [savedAllocations, setSavedAllocations] = useState<SavedAllocation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAllocation, setViewingAllocation] = useState<SavedAllocation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const duration = params.durationMonths > 0 ? params.durationMonths : 1;

  useEffect(() => {
    try {
      setSavedAllocations(JSON.parse(localStorage.getItem(SAVED_ALLOCATIONS_KEY) || '[]'));
    } catch {
      setSavedAllocations([]);
    }
  }, []);

  const persistAllocations = (items: SavedAllocation[]) => {
    setSavedAllocations(items);
    localStorage.setItem(SAVED_ALLOCATIONS_KEY, JSON.stringify(items));
  };

  // Processa os itens para ter o valor mensalizado (Mensalização)
  const allItems = useMemo(() => {
    const upfront = params.upfrontItems.map(item => ({ 
      ...item, 
      type: 'Setup' as const,
      monthlyValue: (item.unitCost * item.quantity) / duration
    }));
    const recurring = params.recurringItems.map(item => ({ 
      ...item, 
      type: 'Recorrente' as const,
      monthlyValue: item.unitCost * item.quantity
    }));
    return [...upfront, ...recurring];
  }, [params.upfrontItems, params.recurringItems, duration]);

  const toggleTarget = (id: string) => {
    const newTargets = new Set(targetIds);
    if (newTargets.has(id)) {
      newTargets.delete(id);
    } else {
      newTargets.add(id);
      const newSources = new Set(sourceIds);
      newSources.delete(id);
      setSourceIds(newSources);
    }
    setTargetIds(newTargets);
  };

  const toggleSource = (id: string) => {
    const newSources = new Set(sourceIds);
    if (newSources.has(id)) {
      newSources.delete(id);
    } else {
      newSources.add(id);
      const newTargets = new Set(targetIds);
      newTargets.delete(id);
      setTargetIds(newTargets);
    }
    setSourceIds(newSources);
  };

  const allocationResults = useMemo(() => {
    const targets = allItems.filter(item => targetIds.has(item.id));
    const sources = allItems.filter(item => sourceIds.has(item.id));

    if (targets.length === 0 || sources.length === 0) return [];

    const totalSourceMonthly = sources.reduce((sum, item) => sum + item.monthlyValue, 0);
    const totalTargetMonthly = targets.reduce((sum, item) => sum + item.monthlyValue, 0);

    return targets.map(target => {
      const targetOriginalMonthly = target.monthlyValue;
      let allocatedAmount = 0;

      if (method === 'proportional') {
        const share = totalTargetMonthly > 0 ? (targetOriginalMonthly / totalTargetMonthly) : (1 / targets.length);
        allocatedAmount = totalSourceMonthly * share;
      } else {
        allocatedAmount = totalSourceMonthly / targets.length;
      }

      const breakdown = sources.map(source => {
        let sourceShare = 0;
        if (method === 'proportional') {
          sourceShare = totalTargetMonthly > 0 ? (targetOriginalMonthly / totalTargetMonthly) : (1 / targets.length);
        } else {
          sourceShare = 1 / targets.length;
        }
        return {
          sourceName: source.name,
          amount: source.monthlyValue * sourceShare
        };
      });

      const totalMonthly = targetOriginalMonthly + allocatedAmount;
      const projectTotalMonthly = allItems.reduce((sum, i) => sum + i.monthlyValue, 0);

      return {
        productId: target.id,
        name: target.name,
        originalMonthlyCost: targetOriginalMonthly,
        allocatedMonthlyCost: allocatedAmount,
        totalMonthlyCost: totalMonthly,
        percentageOfTotal: projectTotalMonthly > 0 ? (totalMonthly / projectTotalMonthly) * 100 : 0,
        breakdown
      };
    });
  }, [allItems, targetIds, sourceIds, method]);

  const totalMonthlyAllocated = useMemo(() => 
    allItems.filter(item => sourceIds.has(item.id))
      .reduce((sum, item) => sum + item.monthlyValue, 0)
  , [allItems, sourceIds]);

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2600);
  };

  const resetAllocation = () => {
    setAllocationName('Rateio mensal');
    setMethod('proportional');
    setTargetIds(new Set());
    setSourceIds(new Set());
    setEditingId(null);
    setViewingAllocation(null);
  };

  const handleSaveAllocation = () => {
    if (allocationResults.length === 0) {
      showMessage('Selecione ao menos um alvo e uma fonte para salvar o rateio mensal.');
      return;
    }

    const now = new Date().toISOString();
    const normalizedName = allocationName.trim() || 'Rateio mensal';
    const payload: SavedAllocation = {
      id: editingId || crypto.randomUUID?.() || `${Date.now()}`,
      name: normalizedName,
      method,
      durationMonths: duration,
      targetIds: Array.from(targetIds),
      sourceIds: Array.from(sourceIds),
      results: allocationResults,
      totalMonthlyAllocated,
      createdAt: savedAllocations.find(item => item.id === editingId)?.createdAt || now,
      updatedAt: now,
    };

    const next = editingId
      ? savedAllocations.map(item => item.id === editingId ? payload : item)
      : [payload, ...savedAllocations];

    persistAllocations(next);
    setEditingId(payload.id);
    setViewingAllocation(payload);
    showMessage(editingId ? 'Rateio mensal atualizado.' : 'Rateio mensal salvo.');
  };

  const handleEditAllocation = (allocation: SavedAllocation) => {
    setAllocationName(allocation.name);
    setMethod(allocation.method);
    setTargetIds(new Set(allocation.targetIds));
    setSourceIds(new Set(allocation.sourceIds));
    setEditingId(allocation.id);
    setViewingAllocation(allocation);
    showMessage('Rateio carregado para edição.');
  };

  const handleViewAllocation = (allocation: SavedAllocation) => {
    setAllocationName(allocation.name);
    setMethod(allocation.method);
    setTargetIds(new Set(allocation.targetIds));
    setSourceIds(new Set(allocation.sourceIds));
    setEditingId(null);
    setViewingAllocation(allocation);
    showMessage('Rateio carregado para visualização.');
  };

  const handleDeleteAllocation = (id: string) => {
    const next = savedAllocations.filter(item => item.id !== id);
    persistAllocations(next);
    if (editingId === id) setEditingId(null);
    if (viewingAllocation?.id === id) setViewingAllocation(null);
    showMessage('Rateio excluído.');
  };

  const selectedPreview = viewingAllocation || (editingId
    ? savedAllocations.find(item => item.id === editingId) || null
    : null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Alerta de Amortização */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contexto de Rateio</p>
            <p className="text-sm font-medium">Os valores abaixo são <strong>mensalizados</strong> com base no contrato de {duration} meses.</p>
          </div>
        </div>
        <div className="hidden md:block text-right px-4">
          <p className="text-[10px] uppercase font-bold text-slate-500">Amortização de Setup</p>
          <p className="text-xs font-mono">Total / {duration}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="space-y-4">
                <div className="max-w-2xl">
                  <CardTitle className="text-xl font-bold font-headline flex items-center">
                    <Settings2 className="w-5 h-5 mr-3 text-primary" />
                    Configuração de Rateio Mensal
                  </CardTitle>
                  <CardDescription className="mt-1">Distribua custos amortizados e recorrentes entre produtos alvos.</CardDescription>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1">
                    <button 
                      onClick={() => setMethod('proportional')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                        method === 'proportional' ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Proporcional
                    </button>
                    <button 
                      onClick={() => setMethod('equal')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                        method === 'equal' ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Igualitário
                    </button>
                  </div>
                  <button
                    onClick={resetAllocation}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <X className="w-3.5 h-3.5" /> Novo
                  </button>
                  <button
                    onClick={handleSaveAllocation}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-primary/20 bg-primary text-white shadow-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingId ? 'Atualizar Rateio' : 'Salvar Rateio'}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  value={allocationName}
                  onChange={(event) => setAllocationName(event.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  placeholder="Nome do rateio mensal"
                />
                <button
                  onClick={handleSaveAllocation}
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Atualizar Rateio' : 'Salvar Rateio'}
                </button>
              </div>
              {message && (
                <div className="mx-5 mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                  {message}
                </div>
              )}
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left">Item do Contrato</th>
                      <th className="px-4 py-4 text-center">Alvo</th>
                      <th className="px-4 py-4 text-center">Fonte</th>
                      <th className="px-6 py-4 text-right">Custo Mensal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allItems.map((item) => (
                      <tr key={item.id} className={cn(
                        "hover:bg-slate-50/50 transition-colors group",
                        targetIds.has(item.id) && "bg-indigo-50/30",
                        sourceIds.has(item.id) && "bg-amber-50/30"
                      )}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                              item.type === 'Setup' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                              {item.type[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-700">{item.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {item.type === 'Setup' ? `Amortizado em ${duration}m` : 'Custo Recorrente'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Checkbox 
                            checked={targetIds.has(item.id)} 
                            onCheckedChange={() => toggleTarget(item.id)}
                            className="rounded-lg h-5 w-5 border-slate-300 data-[state=checked]:bg-primary"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Checkbox 
                            checked={sourceIds.has(item.id)} 
                            onCheckedChange={() => toggleSource(item.id)}
                            className="rounded-lg h-5 w-5 border-slate-300 data-[state=checked]:bg-amber-500 border-amber-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-right font-medium tabular-nums text-slate-600">
                          {formatCurrency(item.monthlyValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold font-headline flex items-center">
                <Save className="w-5 h-5 mr-3 text-primary" />
                Rateios Salvos
              </CardTitle>
              <CardDescription>Visualize, edite ou exclua rateios mensais por contrato.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {savedAllocations.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nenhum rateio salvo</p>
                  <p className="text-[11px] text-slate-400 mt-2">Monte o rateio mensal e clique em Salvar Rateio.</p>
                </div>
              ) : savedAllocations.map((allocation) => (
                <div key={allocation.id} className={cn(
                  "rounded-3xl border p-4 transition-all",
                  viewingAllocation?.id === allocation.id || editingId === allocation.id
                    ? "border-primary/30 bg-primary/5"
                    : "border-slate-100 bg-white hover:border-slate-200"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{allocation.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {allocation.method === 'proportional' ? 'Proporcional' : 'Igualitário'} · {allocation.durationMonths} meses · {formatCurrency(allocation.totalMonthlyAllocated)}/mês
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Atualizado em {new Date(allocation.updatedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewAllocation(allocation)}
                        title="Visualizar rateio"
                        className="h-9 rounded-xl border border-slate-200 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary hover:border-primary/30 inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </button>
                      <button
                        onClick={() => handleEditAllocation(allocation)}
                        title="Editar rateio"
                        className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 inline-flex items-center justify-center transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAllocation(allocation.id)}
                        title="Excluir rateio"
                        className="h-9 w-9 rounded-xl border border-red-100 text-red-400 hover:text-red-600 hover:border-red-200 inline-flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {selectedPreview && (
            <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                <CardTitle className="text-xl font-bold font-headline flex items-center">
                  <Eye className="w-5 h-5 mr-3 text-primary" />
                  Visualização do Rateio
                </CardTitle>
                <CardDescription>{selectedPreview.name} · cálculo mensal em {selectedPreview.durationMonths} meses.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="rounded-3xl bg-slate-50 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total mensal rateado</p>
                    <p className="text-2xl font-bold text-slate-900 font-headline">{formatCurrency(selectedPreview.totalMonthlyAllocated)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Método</p>
                    <p className="text-sm font-bold text-slate-700">{selectedPreview.method === 'proportional' ? 'Proporcional' : 'Igualitário'}</p>
                  </div>
                </div>
                {selectedPreview.results.map((result) => (
                  <div key={`${selectedPreview.id}-${result.productId}`} className="rounded-3xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{result.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Custo original mensal: {formatCurrency(result.originalMonthlyCost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Final/mês</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(result.totalMonthlyCost)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden bg-white h-full">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold font-headline flex items-center">
                <BarChart3 className="w-5 h-5 mr-3 text-emerald-600" />
                Impacto Mensal Carregado
              </CardTitle>
              <CardDescription>Custo mensal final por item após absorção.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {allocationResults.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                    <Share2 className="text-slate-300 w-10 h-10" />
                  </div>
                  <div className="max-w-[240px] mx-auto">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aguardando Seleção</p>
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                      Selecione itens <strong>Alvos</strong> e <strong>Fontes</strong> para visualizar o impacto mensal no DRE.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total Mensal para Rateio</p>
                      <p className="text-xl font-bold text-emerald-700 font-headline truncate">{formatCurrency(totalMonthlyAllocated)}</p>
                    </div>
                    <div className="shrink-0 p-2 bg-white rounded-xl shadow-sm text-emerald-600">
                      <ArrowDownRight size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {allocationResults.map((result) => (
                      <div key={result.productId} className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_0.8fr_0.8fr_0.9fr_0.45fr] gap-3 md:items-center p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="shrink-0 p-2 bg-indigo-50 rounded-xl text-primary">
                            <Target size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{result.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {result.breakdown.length} fonte(s) · {result.percentageOfTotal.toFixed(1)}% do P&L mensal
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Original/mês</p>
                          <p className="text-sm font-semibold text-slate-600 tabular-nums">{formatCurrency(result.originalMonthlyCost)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rateado/mês</p>
                          <p className="text-sm font-semibold text-emerald-600 tabular-nums">+{formatCurrency(result.allocatedMonthlyCost)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Carregado/mês</p>
                          <p className="text-base font-bold text-slate-900 font-headline tabular-nums">{formatCurrency(result.totalMonthlyCost)}</p>
                        </div>
                        <div className="md:text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                            +{(result.originalMonthlyCost > 0 ? (result.allocatedMonthlyCost / result.originalMonthlyCost) * 100 : 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
