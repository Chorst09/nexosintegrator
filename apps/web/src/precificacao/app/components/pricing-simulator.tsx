
'use client';

import React from 'react';
import { DollarSign, Calendar, Activity, Zap } from 'lucide-react';
import { formatCurrency } from '@/app/lib/formatters';
import { PricingOutput, PricingInput } from '@/app/lib/pricing-engine';

interface SimulatorProps {
  results: PricingOutput;
  params: PricingInput;
}

export function PricingSimulator({ results, params }: SimulatorProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-primary to-indigo-800 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-6 translate-y-6 transition-transform group-hover:scale-110 duration-700">
            <DollarSign size={180} />
          </div>
          <p className="text-primary-foreground/80 font-medium mb-1 relative z-10 text-xs uppercase tracking-widest">Faturamento Mensal Final</p>
          <p className="text-5xl font-bold relative z-10 mt-2 font-headline">{formatCurrency(results.finalMonthlyPrice)}</p>
          <div className="mt-8 flex items-center text-sm relative z-10 text-primary-foreground/90 font-medium">
            <Calendar className="w-4 h-4 mr-2" />
            Contrato de {params.durationMonths} meses
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-slate-400 font-medium mb-1 text-xs uppercase tracking-widest">Investimento Inicial (Setup)</p>
               <p className="text-3xl font-bold text-slate-800 mt-2 font-headline">{formatCurrency(results.totalUpfrontCost)}</p>
             </div>
             <div className="bg-indigo-50 p-2 rounded-xl text-primary">
               <Zap size={20} />
             </div>
           </div>
           <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Custo Base Mensal (CPV + Amort.):</span>
                <span className="font-semibold text-slate-700">{formatCurrency(results.baseMonthlyCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Amortização do Setup:</span>
                <span className="font-semibold text-slate-700">{formatCurrency(results.monthlyAmortization)}/mês</span>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white border border-indigo-100 p-6 rounded-3xl flex items-start space-x-5 shadow-sm">
        <div className="bg-indigo-50 p-3 rounded-2xl text-primary shrink-0 shadow-inner">
          <Activity size={24} />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 mb-1.5 font-headline">Racional de Precificação</h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            O investimento de <strong>{formatCurrency(results.totalUpfrontCost)}</strong> está sendo amortizado em <strong>{params.durationMonths} meses</strong> (<strong>{formatCurrency(results.monthlyAmortization)}/mês</strong>). 
            Somado ao custo recorrente mensal de <strong>{formatCurrency(results.totalMonthlyRecurringCost)}</strong>, chegamos ao custo base de <strong>{formatCurrency(results.baseMonthlyCost)}</strong>.
            Aplicando o markup de <strong>{params.markupPercentage}%</strong>, o preço alvo foi definido em <strong>{formatCurrency(results.finalMonthlyPrice)}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
