
'use client';

import React from 'react';
import { Settings, Calculator, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PricingInput } from '@/app/lib/pricing-engine';

interface SidebarProps {
  params: PricingInput;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCalculate: () => void;
  isCalculating: boolean;
}

export function PricingSidebar({ 
  params, 
  onChange, 
  onCalculate, 
  isCalculating 
}: SidebarProps) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center text-slate-800 font-headline">
          <Settings className="w-5 h-5 mr-3 text-primary" />
          Configurações
        </h2>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Comerciais Section */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrato & Prazo</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Duração (Meses)</Label>
              <Input 
                type="number" 
                name="durationMonths" 
                value={params.durationMonths} 
                onChange={onChange} 
                className="bg-white rounded-xl border-slate-200"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Markup Desejado (%)</Label>
              <Input 
                type="number" 
                name="markupPercentage" 
                value={params.markupPercentage} 
                onChange={onChange} 
                className="text-right bg-white rounded-xl border-slate-200 font-bold text-primary"
              />
            </div>
          </div>
        </div>

        {/* Fiscais Section */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tributário & Comercial</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Alíquota Impostos (%)</Label>
              <Input 
                type="number" 
                name="taxRatePercentage" 
                value={params.taxRatePercentage} 
                onChange={onChange} 
                className="text-right bg-white rounded-xl border-slate-200"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Comissão de Vendas (%)</Label>
              <Input 
                type="number" 
                name="commissionPercentage" 
                value={params.commissionPercentage} 
                onChange={onChange} 
                className="text-right bg-white rounded-xl border-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <Button 
          onClick={onCalculate} 
          disabled={isCalculating}
          className="w-full rounded-2xl h-14 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-indigo-100 flex items-center justify-center transition-all active:scale-[0.98]"
        >
          {isCalculating ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Calculator className="w-5 h-5 mr-2" />
          )}
          {isCalculating ? 'Processando...' : 'Recalcular Cenário'}
        </Button>
      </div>
    </div>
  );
}
