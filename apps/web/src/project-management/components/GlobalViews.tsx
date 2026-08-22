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
    <div className="h-full bg-[#0e1b32] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
          <Home className="w-6 h-6 text-[#38bdf8]" />
          Início
        </h1>
        <div className="bg-[#13233b] border border-[#294a70] rounded-md p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Bom dia!</h2>
          <p className="text-slate-400">Aqui está um resumo do seu Workspace hoje. Navegue para a aba Espaços para acessar seus projetos.</p>
        </div>
      </div>
    </div>
  );
}

export function PlannedView() {
  return (
    <div className="h-full bg-[#0e1b32] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-[#2dd4bf]" />
            Planejado
          </h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 bg-[#13233b] border border-[#294a70] px-3 py-1.5 rounded-md transition-colors">
              <Calendar className="w-4 h-4" /> Hoje
            </button>
            <button className="flex items-center gap-2 text-sm text-white bg-[#38bdf8] hover:bg-[#0ea5e9] px-3 py-1.5 rounded-md transition-colors font-medium">
              <Plus className="w-4 h-4" /> Nova Tarefa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Tasks */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Para Hoje</h2>

            <div className="bg-[#13233b] border border-[#294a70] rounded-md p-8 flex flex-col items-center justify-center min-h-[250px] text-center">
              <div className="w-16 h-16 bg-[#2dd4bf]/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#2dd4bf]" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200 mb-2">Tudo em dia!</h2>
              <p className="text-slate-500 max-w-sm">Você não tem tarefas planejadas para hoje. Aproveite para planejar sua semana ou descansar.</p>
            </div>
          </div>

          {/* Overdue / Upcoming */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Atrasadas</h2>
            <div className="bg-[#13233b] border border-[#294a70] rounded-md p-6 text-center text-slate-500 text-sm">
              Nenhuma tarefa em atraso.
            </div>

            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-4">Próximos 7 dias</h2>
            <div className="bg-[#13233b] border border-[#294a70] rounded-md p-4 flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 p-2 hover:bg-[#13233b] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#294a70]">
                  <div className="w-8 h-8 rounded bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center shrink-0">
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
    <div className="h-full bg-[#0e1b32] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#38bdf8]" />
            Documentos
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                className="bg-[#13233b] border border-[#294a70] text-sm text-slate-200 rounded-md pl-9 pr-4 py-1.5 focus:outline-none focus:border-[#38bdf8] w-64"
              />
            </div>
            <button className="flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-200 bg-[#13233b] border border-[#294a70] rounded-md transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 text-sm text-white bg-[#38bdf8] hover:bg-[#0ea5e9] px-3 py-1.5 rounded-md transition-colors font-medium">
              <Plus className="w-4 h-4" /> Novo Doc
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#13233b] border border-dashed border-[#294a70] rounded-md p-6 hover:border-[#38bdf8] cursor-pointer transition-all flex flex-col items-center justify-center text-slate-500 hover:text-[#38bdf8] hover:bg-[#38bdf8]/5 min-h-[160px]">
            <Plus className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Novo Documento</span>
          </div>

          <div className="bg-[#13233b] border border-[#294a70] rounded-md p-5 hover:border-[#38bdf8] cursor-pointer transition-colors group relative flex flex-col min-h-[160px]">
            <div className="absolute top-4 right-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 hover:text-slate-300" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center mb-auto group-hover:bg-[#38bdf8] group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-slate-200 group-hover:text-[#38bdf8] transition-colors line-clamp-1">Guia de Integração API</h3>
              <p className="text-xs text-slate-500 mt-1">Modificado há 2 dias</p>
            </div>
          </div>

          <div className="bg-[#13233b] border border-[#294a70] rounded-md p-5 hover:border-[#2dd4bf] cursor-pointer transition-colors group relative flex flex-col min-h-[160px]">
            <div className="absolute top-4 right-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 hover:text-slate-300" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#2dd4bf]/10 text-[#2dd4bf] flex items-center justify-center mb-auto group-hover:bg-[#2dd4bf] group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-slate-200 group-hover:text-[#2dd4bf] transition-colors line-clamp-1">Ata: Kick-off Paranacidade</h3>
              <p className="text-xs text-slate-500 mt-1">Vinculado à PRJ-002</p>
            </div>
          </div>

          <div className="bg-[#13233b] border border-[#294a70] rounded-md p-5 hover:border-[#eab308] cursor-pointer transition-colors group relative flex flex-col min-h-[160px]">
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
      <div className="h-full flex flex-col bg-[#0e1b32] overflow-hidden">
        <div className="h-14 border-b border-[#294a70] bg-[#13233b] flex items-center px-4 flex-shrink-0 gap-4">
          <button
            onClick={() => setActiveBoard(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="w-px h-6 bg-[#294a70]"></div>
          <h2 className="text-slate-200 font-semibold">{activeBoard}</h2>
        </div>
        <div className="flex-1 relative">
          <Tldraw />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0e1b32] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <LayoutTemplate className="w-6 h-6 text-[#38bdf8]" />
            Quadros Mágicos
          </h1>
          <button
            onClick={() => setActiveBoard('Novo Quadro em Branco')}
            className="flex items-center gap-2 text-sm text-white bg-[#38bdf8] hover:bg-[#0ea5e9] px-4 py-2 rounded-md transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Novo Quadro
          </button>
        </div>

        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#13233b] to-[#0e1b32] border border-[#294a70] rounded-lg p-10 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col items-start max-w-lg">
            <div className="bg-[#38bdf8]/20 text-[#38bdf8] text-xs font-bold px-3 py-1 rounded-full mb-4 border border-[#38bdf8]/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> NOVO
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Colabore de forma visual</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              Use Quadros Mágicos para desenhar fluxos de trabalho, arquiteturas de sistema, ou fazer brainstorming em tempo real com toda a sua equipe.
            </p>
            <button
              onClick={() => setActiveBoard('Playground Visual')}
              className="bg-white text-slate-900 px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-100 transition-colors"
            >
              Experimentar Agora
            </button>
          </div>

          <div className="absolute -right-20 -bottom-20 opacity-40 pointer-events-none">
            <LayoutTemplate className="w-96 h-96 text-[#38bdf8]" />
          </div>
        </div>

        {/* Templates */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Templates Populares</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Mapeamento de Processo', 'Brainstorming de Produto', 'Diagrama de Arquitetura'].map((template, idx) => (
            <div
              key={idx}
              onClick={() => setActiveBoard(template)}
              className="bg-[#13233b] border border-[#294a70] rounded-md p-4 hover:border-[#38bdf8] cursor-pointer transition-colors group"
            >
              <div className="h-24 bg-[#0e1b32] rounded-lg mb-4 flex items-center justify-center border border-[#294a70] group-hover:border-[#38bdf8]/30">
                <LayoutTemplate className="w-8 h-8 text-slate-600 group-hover:text-[#38bdf8] transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">{template}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
