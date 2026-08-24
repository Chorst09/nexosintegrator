import React, { useState } from 'react';
import {
  Home, CheckCircle2, FileText, LayoutTemplate, Clock, Calendar,
  Search, Plus, Filter, MoreVertical, LayoutGrid, List, Sparkles, Folder, ArrowLeft
} from 'lucide-react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import ArchitectureDiagram from './ArchitectureDiagram';

export function HomeView() {
  return (
    <div className="h-full bg-[#070b16] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
          <Home className="w-6 h-6 text-[#ff7a00]" />
          Início
        </h1>
        <div className="bg-[#111827] border border-[#263345] rounded-md p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Bom dia!</h2>
          <p className="text-slate-400">Aqui está um resumo do seu ambiente hoje. Navegue para a aba Projetos para acessar seus projetos.</p>
        </div>
      </div>
    </div>
  );
}

export function PlannedView() {
  return (
    <div className="h-full bg-[#070b16] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-[#22c55e]" />
            Planejado
          </h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 bg-[#111827] border border-[#263345] px-3 py-1.5 rounded-md transition-colors">
              <Calendar className="w-4 h-4" /> Hoje
            </button>
            <button className="flex items-center gap-2 text-sm text-white bg-[#ff7a00] hover:bg-[#f6b40b] px-3 py-1.5 rounded-md transition-colors font-medium">
              <Plus className="w-4 h-4" /> Nova Fase
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Tasks */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Para Hoje</h2>

            <div className="bg-[#111827] border border-[#263345] rounded-md p-8 flex flex-col items-center justify-center min-h-[250px] text-center">
              <div className="w-16 h-16 bg-[#22c55e]/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200 mb-2">Tudo em dia!</h2>
              <p className="text-slate-500 max-w-sm">Você não tem fases planejadas para hoje. Aproveite para planejar sua semana ou descansar.</p>
            </div>
          </div>

          {/* Overdue / Upcoming */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Atrasadas</h2>
            <div className="bg-[#111827] border border-[#263345] rounded-md p-6 text-center text-slate-500 text-sm">
              Nenhuma tarefa em atraso.
            </div>

            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-4">Próximos 7 dias</h2>
            <div className="bg-[#111827] border border-[#263345] rounded-md p-4 flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 p-2 hover:bg-[#111827] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#263345]">
                  <div className="w-8 h-8 rounded bg-[#ff7a00]/10 text-[#ff7a00] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-200 truncate">Revisão de planejamento sprint {i}</p>
                    <p className="text-xs text-slate-500">Quinta-feira, 14:00</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocsView() {
  return (
    <div className="h-full bg-[#070b16] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#ff7a00]" />
            Documentos
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                className="bg-[#111827] border border-[#263345] text-sm text-slate-200 rounded-md pl-9 pr-4 py-1.5 focus:outline-none focus:border-[#ff7a00] w-64"
              />
            </div>
            <button className="flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-200 bg-[#111827] border border-[#263345] rounded-md transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 text-sm text-white bg-[#ff7a00] hover:bg-[#f6b40b] px-3 py-1.5 rounded-md transition-colors font-medium">
              <Plus className="w-4 h-4" /> Novo Doc
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111827] border border-dashed border-[#263345] rounded-md p-6 hover:border-[#ff7a00] cursor-pointer transition-all flex flex-col items-center justify-center text-slate-500 hover:text-[#ff7a00] hover:bg-[#ff7a00]/5 min-h-[160px]">
            <Plus className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Novo Documento</span>
          </div>

          <div className="bg-[#111827] border border-[#263345] rounded-md p-5 hover:border-[#ff7a00] cursor-pointer transition-colors group relative flex flex-col min-h-[160px]">
            <div className="absolute top-4 right-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 hover:text-slate-300" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#ff7a00]/10 text-[#ff7a00] flex items-center justify-center mb-auto group-hover:bg-[#ff7a00] group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-slate-200 group-hover:text-[#ff7a00] transition-colors line-clamp-1">Guia de Integração API</h3>
              <p className="text-xs text-slate-500 mt-1">Modificado há 2 dias</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-[#263345] rounded-md p-5 hover:border-[#22c55e] cursor-pointer transition-colors group relative flex flex-col min-h-[160px]">
            <div className="absolute top-4 right-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 hover:text-slate-300" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center mb-auto group-hover:bg-[#22c55e] group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-slate-200 group-hover:text-[#22c55e] transition-colors line-clamp-1">Ata: Kick-off Paranacidade</h3>
              <p className="text-xs text-slate-500 mt-1">Vinculado à PRJ-002</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-[#263345] rounded-md p-5 hover:border-[#eab308] cursor-pointer transition-colors group relative flex flex-col min-h-[160px]">
            <div className="absolute top-4 right-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 hover:text-slate-300" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#eab308]/10 text-[#eab308] flex items-center justify-center mb-auto group-hover:bg-[#eab308] group-hover:text-slate-900 transition-colors">
              <Folder className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-slate-200 group-hover:text-[#eab308] transition-colors line-clamp-1">Requisitos de Sistema</h3>
              <p className="text-xs text-slate-500 mt-1">5 documentos internos</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export function WhiteboardsView() {
  const [activeBoard, setActiveBoard] = useState<string | null>(null);

  if (activeBoard === 'Diagrama de Arquitetura') {
    return <ArchitectureDiagram onBack={() => setActiveBoard(null)} />;
  }

  if (activeBoard) {
    return (
      <div className="h-full flex flex-col bg-[#070b16] overflow-hidden">
        <div className="h-14 border-b border-[#263345] bg-[#111827] flex items-center px-4 flex-shrink-0 gap-4">
          <button
            onClick={() => setActiveBoard(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="w-px h-6 bg-[#263345]"></div>
          <h2 className="text-slate-200 font-semibold">{activeBoard}</h2>
        </div>
        <div className="flex-1 relative">
          <Tldraw />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#070b16] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <LayoutTemplate className="w-6 h-6 text-[#ff7a00]" />
            Quadros Mágicos
          </h1>
          <button
            onClick={() => setActiveBoard('Novo Quadro em Branco')}
            className="flex items-center gap-2 text-sm text-white bg-[#ff7a00] hover:bg-[#f6b40b] px-4 py-2 rounded-md transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Novo Quadro
          </button>
        </div>

        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#111827] to-[#070b16] border border-[#263345] rounded-lg p-10 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col items-start max-w-lg">
            <div className="bg-[#ff7a00]/20 text-[#ff7a00] text-xs font-bold px-3 py-1 rounded-full mb-4 border border-[#ff7a00]/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> NOVO
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Colabore de forma visual</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              Use Quadros Mágicos para desenhar fluxos de projeto, arquiteturas de sistema, ou fazer brainstorming em tempo real com toda a sua equipe.
            </p>
            <button
              onClick={() => setActiveBoard('Playground Visual')}
              className="bg-white text-slate-900 px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-100 transition-colors"
            >
              Experimentar Agora
            </button>
          </div>

          <div className="absolute -right-20 -bottom-20 opacity-40 pointer-events-none">
            <LayoutTemplate className="w-96 h-96 text-[#ff7a00]" />
          </div>
        </div>

        {/* Templates */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Templates Populares</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Mapeamento de Processo', 'Brainstorming de Produto', 'Diagrama de Arquitetura'].map((template, idx) => (
            <div
              key={idx}
              onClick={() => setActiveBoard(template)}
              className="bg-[#111827] border border-[#263345] rounded-md p-4 hover:border-[#ff7a00] cursor-pointer transition-colors group"
            >
              <div className="h-24 bg-[#070b16] rounded-lg mb-4 flex items-center justify-center border border-[#263345] group-hover:border-[#ff7a00]/30">
                <LayoutTemplate className="w-8 h-8 text-slate-600 group-hover:text-[#ff7a00] transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">{template}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
