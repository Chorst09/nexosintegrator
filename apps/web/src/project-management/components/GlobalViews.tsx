import React, { useState } from 'react';
import {
  Home, CheckCircle2, FileText, LayoutTemplate, Clock, Calendar,
  Search, Plus, Filter, MoreVertical, LayoutGrid, List, Sparkles, Folder, ArrowLeft,
  BarChart2, Briefcase, Users, ArrowUpRight, Target, GitBranch, AlertTriangle,
  ClipboardCheck, Lightbulb, Gauge, Layers3, TimerReset, Route, Wand2
} from 'lucide-react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import ArchitectureDiagram from './ArchitectureDiagram';

export function HomeView({
  onCreateProject,
  onOpenDashboard
}: {
  onCreateProject?: () => void;
  onOpenDashboard?: () => void;
}) {
  const projectPhotos = [
    {
      title: 'Implantação e campo',
      label: 'Execução',
      image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Planejamento executivo',
      label: 'Governança',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Equipe integrada',
      label: 'Colaboração',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80'
    }
  ];

  return (
    <div className="h-full bg-[#070b16] overflow-y-auto p-8 text-slate-300 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Home className="w-6 h-6 text-[#ff7a00]" />
            Início
          </h1>
          <div className="hidden items-center gap-2 rounded-full border border-[#263345] bg-[#111827] px-4 py-2 text-xs font-semibold text-slate-400 md:flex">
            <Sparkles className="h-4 w-4 text-[#18c8df]" />
            Central executiva de projetos
          </div>
        </div>

        <section className="relative min-h-[360px] overflow-hidden rounded-lg border border-[#263345] bg-[#111827]">
          <img
            src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80"
            alt="Equipe em sala de planejamento de projetos"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#070b16_0%,rgba(7,11,22,0.92)_34%,rgba(7,11,22,0.58)_100%)]" />
          <div className="relative z-10 grid min-h-[360px] gap-6 p-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex max-w-3xl flex-col justify-center">
              <span className="mb-4 flex w-fit items-center gap-2 rounded-full border border-[#ff7a00]/35 bg-[#ff7a00]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#ffb15c]">
                <Briefcase className="h-3.5 w-3.5" />
                Gestão de Projetos
              </span>
              <h2 className="text-4xl font-black leading-tight text-white">
                Controle projetos, fases, equipe e decisões em uma visão única.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                Organize escopo, cronograma, responsáveis, entregáveis e acompanhamentos com leitura executiva para cada iniciativa em andamento.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="flex items-center gap-2 rounded-md bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-[#f6b40b] hover:text-[#050914]"
                >
                  <Plus className="h-4 w-4" />
                  Novo projeto
                </button>
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="flex items-center gap-2 rounded-md border border-[#374151] bg-[#111827]/80 px-5 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:border-[#ff7a00] hover:text-white"
                >
                  <BarChart2 className="h-4 w-4 text-[#22c55e]" />
                  Ver painel
                </button>
              </div>
            </div>

            <div className="grid content-center gap-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['22', 'Módulos OK', '#22c55e'],
                  ['3', 'Fases críticas', '#f6b40b'],
                  ['97%', 'Aderência', '#18c8df']
                ].map(([value, label, color]) => (
                  <div key={label} className="rounded-lg border border-[#263345] bg-[#070b16]/80 p-4 backdrop-blur">
                    <p className="text-2xl font-black text-white" style={{ color }}>{value}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-[#263345] bg-[#070b16]/85 p-5 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-100">Projeto em destaque</p>
                    <p className="text-xs text-slate-500">Paranacidade · implantação</p>
                  </div>
                  <span className="rounded-full bg-[#22c55e]/10 px-3 py-1 text-xs font-bold text-[#22c55e]">Em controle</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1f2937]">
                  <div className="h-full w-[68%] rounded-full bg-[linear-gradient(90deg,#ff7a00,#f6b40b,#22c55e)]" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="font-black text-slate-100">68%</p>
                    <p className="text-slate-500">Progresso</p>
                  </div>
                  <div>
                    <p className="font-black text-slate-100">11</p>
                    <p className="text-slate-500">Fases</p>
                  </div>
                  <div>
                    <p className="font-black text-slate-100">4</p>
                    <p className="text-slate-500">Equipe</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {projectPhotos.map(item => (
            <article key={item.title} className="group overflow-hidden rounded-lg border border-[#263345] bg-[#111827]">
              <div className="relative h-44 overflow-hidden">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,11,22,0.88))]" />
                <span className="absolute left-4 top-4 rounded-full bg-[#070b16]/80 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#ffb15c]">
                  {item.label}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-black text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Acompanhe responsabilidades, marcos, riscos e decisões para manter cada entrega visível do início ao encerramento.
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          {[
            { icon: Target, title: 'Escopo claro', text: 'Cada projeto começa com objetivo, escopo, entregáveis, critérios de sucesso e responsáveis.', color: 'text-[#ff7a00]' },
            { icon: Users, title: 'Equipe conectada', text: 'Convites por e-mail, papéis definidos e acompanhamento das pessoas envolvidas.', color: 'text-[#22c55e]' },
            { icon: ArrowUpRight, title: 'Visão executiva', text: 'Indicadores, fases e decisões ficam em evidência para acelerar a tomada de decisão.', color: 'text-[#18c8df]' }
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-[#263345] bg-[#111827] p-5">
                <Icon className={`mb-4 h-6 w-6 ${item.color}`} />
                <h3 className="text-base font-black text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
              </div>
            );
          })}
        </section>
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

  if (activeBoard === 'Mapeamento de Processo') {
    return <ProcessMappingBoard onBack={() => setActiveBoard(null)} />;
  }

  if (activeBoard === 'Brainstorming de Produto') {
    return <ProductBrainstormBoard onBack={() => setActiveBoard(null)} />;
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
          {[
            {
              title: 'Mapeamento de Processo',
              subtitle: 'Fluxo, gargalos e responsáveis',
              icon: GitBranch,
              color: '#ff7a00',
              preview: ['Entrada', 'Triagem', 'Execução', 'Validação']
            },
            {
              title: 'Brainstorming de Produto',
              subtitle: 'Ideias, impacto e priorização',
              icon: Lightbulb,
              color: '#22c55e',
              preview: ['Descobrir', 'Idear', 'Priorizar', 'Roadmap']
            },
            {
              title: 'Diagrama de Arquitetura',
              subtitle: 'Componentes, integrações e camadas',
              icon: LayoutTemplate,
              color: '#18c8df',
              preview: ['App', 'API', 'Dados', 'Integrações']
            }
          ].map((template) => {
            const Icon = template.icon;
            return (
            <div
              key={template.title}
              onClick={() => setActiveBoard(template.title)}
              className="group cursor-pointer overflow-hidden rounded-lg border border-[#263345] bg-[#111827] transition-colors hover:border-[#ff7a00]"
            >
              <div className="relative h-32 border-b border-[#263345] bg-[#070b16] p-4">
                <div className="absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 20% 10%, ${template.color}22, transparent 34%)` }} />
                <div className="relative grid h-full grid-cols-4 items-center gap-2">
                  {template.preview.map((label, index) => (
                    <div key={label} className="min-w-0">
                      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: `${template.color}55`, backgroundColor: `${template.color}18`, color: template.color }}>
                        {index === 0 ? <Icon className="h-4 w-4" /> : <span className="text-xs font-black">{index + 1}</span>}
                      </div>
                      <div className="h-1 rounded-full bg-[#263345]">
                        <div className="h-full rounded-full" style={{ width: `${72 - index * 10}%`, backgroundColor: template.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-black text-slate-100 transition-colors group-hover:text-[#ffb15c]">{template.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{template.subtitle}</p>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}

function BoardShell({ title, subtitle, icon: Icon, onBack, children }: { title: string; subtitle: string; icon: any; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_16%_0%,rgba(255,122,0,0.18),transparent_26%),radial-gradient(circle_at_86%_8%,rgba(34,197,94,0.14),transparent_30%),linear-gradient(135deg,#050914,#070b16_46%,#111827)] p-6 text-slate-300 custom-scrollbar">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-[#263345] bg-[#0b1020]/88 p-5 shadow-2xl shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              onClick={onBack}
              className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#374151] bg-[#111827] text-slate-400 transition-colors hover:border-[#ff7a00] hover:text-white"
              title="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff7a00]/14 text-[#ff7a00] ring-1 ring-[#ff7a00]/35">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-[#22c55e]/35 bg-[#22c55e]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#5ee2a0]">
                  Quadro inteligente
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button className="flex items-center gap-2 rounded-md bg-[#ff7a00] px-4 py-2 text-sm font-black text-white transition-colors hover:bg-[#f6b40b] hover:text-[#050914]">
            <Sparkles className="h-4 w-4" />
            Gerar com IA
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ProcessMappingBoard({ onBack }: { onBack: () => void }) {
  const steps = [
    { title: 'Entrada', owner: 'Comercial', time: '1 dia', status: 'OK', color: '#18c8df', items: ['Pedido recebido', 'Dados mínimos', 'Prioridade inicial'] },
    { title: 'Triagem', owner: 'PMO', time: '2 dias', status: 'Atenção', color: '#f6b40b', items: ['Escopo validado', 'Dependências', 'Critérios de aceite'] },
    { title: 'Execução', owner: 'Operações', time: '5 dias', status: 'Em curso', color: '#ff7a00', items: ['Tarefas abertas', 'Bloqueios visíveis', 'Evidências'] },
    { title: 'Validação', owner: 'Cliente', time: '2 dias', status: 'Risco', color: '#ef4444', items: ['Homologação', 'Correções', 'Aceite formal'] },
    { title: 'Encerramento', owner: 'CS', time: '1 dia', status: 'Pronto', color: '#22c55e', items: ['Ata final', 'Documentação', 'Próximo ciclo'] }
  ];

  const swimlanes = [
    { area: 'Cliente', entries: ['Enviar requisitos', 'Validar solução', 'Aprovar aceite'], color: '#22c55e' },
    { area: 'Comercial', entries: ['Registrar oportunidade', 'Confirmar contrato', 'Comunicar mudança'], color: '#ff7a00' },
    { area: 'Operações', entries: ['Planejar execução', 'Executar entregas', 'Documentar evidências'], color: '#18c8df' },
    { area: 'Gestão', entries: ['Acompanhar SLA', 'Remover bloqueios', 'Report executivo'], color: '#f6b40b' }
  ];

  return (
    <BoardShell
      title="Mapeamento de Processo"
      subtitle="Visualize etapas, donos, tempos, gargalos e ações para transformar um processo solto em um fluxo governado."
      icon={GitBranch}
      onBack={onBack}
    >
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Route, label: 'Etapas', value: '5', tone: '#18c8df' },
          { icon: AlertTriangle, label: 'Gargalos', value: '2', tone: '#ff7a00' },
          { icon: TimerReset, label: 'Lead time', value: '11d', tone: '#f6b40b' },
          { icon: ClipboardCheck, label: 'Controles', value: '8', tone: '#22c55e' }
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-[#263345] bg-[#0b1020]/88 p-4">
              <Icon className="mb-4 h-5 w-5" style={{ color: item.tone }} />
              <p className="text-3xl font-black text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-lg border border-[#263345] bg-[#0b1020]/88 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Fluxo ponta a ponta</h2>
            <p className="mt-1 text-sm text-slate-500">Sequência recomendada com dono, SLA e pontos de controle.</p>
          </div>
          <span className="rounded-full border border-[#ff7a00]/35 bg-[#ff7a00]/10 px-3 py-1 text-xs font-black text-[#ffb15c]">AS-IS para TO-BE</span>
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          {steps.map((step, index) => (
            <div key={step.title} className="relative rounded-lg border border-[#263345] bg-[#070b16] p-4">
              {index < steps.length - 1 && <div className="absolute -right-3 top-1/2 hidden h-0.5 w-3 bg-[#374151] xl:block" />}
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black text-white" style={{ backgroundColor: `${step.color}22`, color: step.color, border: `1px solid ${step.color}55` }}>
                  {index + 1}
                </span>
                <span className="rounded-full px-2 py-1 text-[10px] font-black uppercase" style={{ backgroundColor: `${step.color}16`, color: step.color }}>
                  {step.status}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-100">{step.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{step.owner} · {step.time}</p>
              <div className="mt-4 space-y-2">
                {step.items.map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: step.color }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-lg border border-[#263345] bg-[#0b1020]/88 p-5">
          <h2 className="text-xl font-black text-white">Raias de responsabilidade</h2>
          <div className="mt-4 space-y-3">
            {swimlanes.map(lane => (
              <div key={lane.area} className="grid gap-3 rounded-lg border border-[#263345] bg-[#070b16] p-3 md:grid-cols-[150px_1fr]">
                <div className="flex items-center gap-2 text-sm font-black text-slate-100">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: lane.color }} />
                  {lane.area}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {lane.entries.map(entry => (
                    <div key={entry} className="rounded-md border border-[#263345] bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-300">
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#263345] bg-[linear-gradient(135deg,rgba(255,122,0,0.14),rgba(17,24,39,0.96))] p-5">
          <h2 className="text-xl font-black text-white">Ações de melhoria</h2>
          <div className="mt-4 space-y-3">
            {['Criar checklist de entrada obrigatório', 'Definir SLA por etapa e responsável', 'Automatizar aviso de bloqueio', 'Padronizar evidências de aceite'].map((action, index) => (
              <div key={action} className="flex gap-3 rounded-lg border border-[#374151] bg-[#070b16]/70 p-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#ff7a00]/15 text-xs font-black text-[#ffb15c]">{index + 1}</span>
                <p className="text-sm font-semibold text-slate-300">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </BoardShell>
  );
}

function ProductBrainstormBoard({ onBack }: { onBack: () => void }) {
  const ideas = [
    { title: 'Assistente de escopo com IA', cluster: 'Eficiência', score: 92, color: '#22c55e' },
    { title: 'Painel de saúde do cliente', cluster: 'Retenção', score: 86, color: '#18c8df' },
    { title: 'Portal de aprovações externas', cluster: 'Governança', score: 78, color: '#f6b40b' },
    { title: 'Resumo automático de reuniões', cluster: 'Produtividade', score: 81, color: '#ff7a00' }
  ];

  const matrix = [
    { quadrant: 'Apostar agora', hint: 'Alto impacto · baixo esforço', ideas: ['Ata automática', 'Templates por fase'], color: '#22c55e' },
    { quadrant: 'Planejar', hint: 'Alto impacto · alto esforço', ideas: ['Portal do cliente', 'Integração BI'], color: '#f6b40b' },
    { quadrant: 'Quick wins', hint: 'Baixo impacto · baixo esforço', ideas: ['Tags inteligentes', 'Favoritos'], color: '#18c8df' },
    { quadrant: 'Evitar agora', hint: 'Baixo impacto · alto esforço', ideas: ['Customização extrema'], color: '#ff7a00' }
  ];

  return (
    <BoardShell
      title="Brainstorming de Produto"
      subtitle="Organize hipóteses, ideias, dores, oportunidades e priorização para transformar colaboração em roadmap."
      icon={Lightbulb}
      onBack={onBack}
    >
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Lightbulb, label: 'Ideias', value: '24', tone: '#f6b40b' },
          { icon: Users, label: 'Personas', value: '4', tone: '#18c8df' },
          { icon: Gauge, label: 'Score médio', value: '84', tone: '#22c55e' },
          { icon: Layers3, label: 'Roadmap', value: '3 ondas', tone: '#ff7a00' }
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-[#263345] bg-[#0b1020]/88 p-4">
              <Icon className="mb-4 h-5 w-5" style={{ color: item.tone }} />
              <p className="text-3xl font-black text-white">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
        <div className="rounded-lg border border-[#263345] bg-[#0b1020]/88 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Banco de ideias</h2>
            <span className="rounded-full border border-[#22c55e]/35 bg-[#22c55e]/10 px-3 py-1 text-xs font-black text-[#5ee2a0]">Priorizado</span>
          </div>
          <div className="space-y-3">
            {ideas.map(idea => (
              <div key={idea.title} className="rounded-lg border border-[#263345] bg-[#070b16] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-100">{idea.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{idea.cluster}</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ color: idea.color, backgroundColor: `${idea.color}16` }}>
                    {idea.score}
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#263345]">
                  <div className="h-full rounded-full" style={{ width: `${idea.score}%`, background: `linear-gradient(90deg, ${idea.color}, #f6b40b)` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#263345] bg-[#0b1020]/88 p-5">
          <h2 className="text-xl font-black text-white">Matriz impacto x esforço</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {matrix.map(item => (
              <div key={item.quadrant} className="min-h-[150px] rounded-lg border border-[#263345] bg-[#070b16] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-100">{item.quadrant}</h3>
                  <Wand2 className="h-4 w-4" style={{ color: item.color }} />
                </div>
                <p className="mb-4 text-xs text-slate-500">{item.hint}</p>
                <div className="space-y-2">
                  {item.ideas.map(idea => (
                    <div key={idea} className="rounded-md border px-3 py-2 text-xs font-bold text-slate-300" style={{ borderColor: `${item.color}33`, backgroundColor: `${item.color}10` }}>
                      {idea}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#263345] bg-[#0b1020]/88 p-5">
        <h2 className="text-xl font-black text-white">Roadmap sugerido</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            { wave: 'Onda 1', title: 'Validar valor', text: 'Protótipos rápidos, entrevistas e métricas de adoção.', color: '#22c55e' },
            { wave: 'Onda 2', title: 'Construir MVP', text: 'Fluxos essenciais, integrações mínimas e telemetria.', color: '#f6b40b' },
            { wave: 'Onda 3', title: 'Escalar produto', text: 'Automação, governança, permissões e expansão comercial.', color: '#ff7a00' }
          ].map(item => (
            <div key={item.wave} className="rounded-lg border border-[#263345] bg-[#070b16] p-4">
              <span className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide" style={{ color: item.color, backgroundColor: `${item.color}14` }}>
                {item.wave}
              </span>
              <h3 className="mt-4 text-base font-black text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </BoardShell>
  );
}
