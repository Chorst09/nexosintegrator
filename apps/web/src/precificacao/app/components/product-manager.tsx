
'use client';

import React from 'react';
import { Plus, Trash2, Package, Layers, Info, AlignLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductItem } from '@/app/lib/pricing-engine';
import { formatCurrency } from '@/app/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

interface ProductManagerProps {
  upfrontItems: ProductItem[];
  recurringItems: ProductItem[];
  onItemChange: (type: 'upfront' | 'recurring', id: string, field: keyof ProductItem, value: string | number) => void;
  onAddItem: (type: 'upfront' | 'recurring') => void;
  onRemoveItem: (type: 'upfront' | 'recurring', id: string) => void;
}

export function ProductManager({ 
  upfrontItems, 
  recurringItems, 
  onItemChange, 
  onAddItem, 
  onRemoveItem 
}: ProductManagerProps) {
  
  const renderItemSection = (title: string, description: string, type: 'upfront' | 'recurring', items: ProductItem[], icon: React.ReactNode) => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Subtotal</p>
              <p className="text-sm font-bold text-slate-700">{formatCurrency(total)}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAddItem(type)}
              className="rounded-full border-primary/20 text-primary hover:bg-primary/5 px-4"
            >
              <Plus className="w-3 h-3 mr-2" /> Adicionar Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all relative group">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onRemoveItem(type, item.id)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white shadow-sm text-red-500 hover:bg-red-50 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] text-slate-400 mb-1 block uppercase">Nome do Item</Label>
                  <Input 
                    placeholder="Ex: Licença Base, Instalação..."
                    value={item.name}
                    onChange={(e) => onItemChange(type, item.id, 'name', e.target.value)}
                    className="h-9 text-sm font-semibold border-none bg-white shadow-sm focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] text-slate-400 mb-1 block uppercase">Descrição</Label>
                  <Textarea 
                    placeholder="Detalhes do item, especificações ou observações..."
                    value={item.description || ''}
                    onChange={(e) => onItemChange(type, item.id, 'description', e.target.value)}
                    className="min-h-[60px] text-xs border-none bg-white shadow-sm focus:ring-1 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Label className="text-[9px] text-slate-400 mb-1 block uppercase">Qtd</Label>
                    <Input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onItemChange(type, item.id, 'quantity', e.target.value)}
                      className="h-9 text-center text-sm rounded-xl bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[9px] text-slate-400 mb-1 block uppercase">Custo Unitário (R$)</Label>
                    <Input 
                      type="number"
                      value={item.unitCost}
                      onChange={(e) => onItemChange(type, item.id, 'unitCost', e.target.value)}
                      className="h-9 text-right text-sm rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="col-span-full text-center py-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/20">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Nenhum item adicionado nesta categoria</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold font-headline flex items-center">
              <Layers className="w-5 h-5 mr-3 text-primary" />
              Composição de Produtos & Serviços
            </CardTitle>
            <CardDescription className="text-sm mt-1">Gerencie detalhadamente os itens de setup e os custos recorrentes do contrato.</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 bg-slate-100 rounded-full cursor-help">
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                O Setup é amortizado ao longo do contrato. O Custo Recorrente é somado mensalmente ao valor final.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-12">
        {renderItemSection(
          "Setup & Implantação (CAPEX)", 
          "Investimentos iniciais do projeto (Equipamentos, Treinamento, Onboarding)",
          "upfront", 
          upfrontItems,
          <Package size={18} />
        )}

        <div className="border-t border-slate-100 pt-10">
          {renderItemSection(
            "Custos Operacionais Mensais (OPEX)", 
            "Insumos, licenciamentos e custos que ocorrem todos os meses",
            "recurring", 
            recurringItems,
            <Layers size={18} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
