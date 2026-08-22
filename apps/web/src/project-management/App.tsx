import React, { useState, useEffect } from 'react';
import { 
  Home, Compass, CheckSquare, Sparkles, Users, FileText, 
  BarChart2, LayoutTemplate, MoreHorizontal,
  Search, Bell, Settings, Plus, ChevronDown, CheckCircle2,
  List as ListIcon, Calendar, Activity, 
  Users2, GanttChartSquare, ArrowLeft
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import KanbanBoard from './components/KanbanBoard';
import ListView from './components/ListView';
import Dashboard from './components/Dashboard';
import TeamView from './components/TeamView';
import CalendarView from './components/CalendarView';
import GanttView from './components/GanttView';
import ActivityView from './components/ActivityView';
import WorkloadView from './components/WorkloadView';
import { HomeView, PlannedView, DocsView, WhiteboardsView } from './components/GlobalViews';
import TaskModal from './components/TaskModal';
import CreateTaskModal from './components/CreateTaskModal';
import { mockIssues } from './data';
import { Space, Issue } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ViewMode = 'board' | 'list' | 'dashboard' | 'team' | 'calendar' | 'gantt' | 'activity' | 'workload';

export default function App({ onBack }: { onBack?: () => void }) {
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [globalView, setGlobalView] = useState('spaces');
  
  // Try to load issues from localStorage, fallback to mockIssues
  const [issues, setIssues] = useState<Issue[]>(() => {
    const saved = localStorage.getItem('pm_issues_v4');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return mockIssues;
  });

  // Save issues to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pm_issues_v4', JSON.stringify(issues));
  }, [issues]);

  const [spaces, setSpaces] = useState<Space[]>([
    { id: 's1', name: 'Projeto Paranacidade', initial: 'P', color: 'bg-slate-700' }
  ]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>('s1');
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({ 's1': true });
  
  // New States
  const [selectedTask, setSelectedTask] = useState<Issue | null>(null);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  
  const submitNewSpace = () => {
    if (newSpaceName.trim() !== "" && isCreatingSpace) {
      const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-blue-600', 'bg-amber-600'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const newSpace: Space = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newSpaceName.trim(),
        initial: newSpaceName.trim().charAt(0).toUpperCase(),
        color: randomColor
      };
      setSpaces(prev => [...prev, newSpace]);
      setActiveSpaceId(newSpace.id);
      setExpandedSpaces(prev => ({ ...prev, [newSpace.id]: true }));
    }
    setIsCreatingSpace(false);
    setNewSpaceName('');
  };

  const toggleSpace = (id: string) => {
    setExpandedSpaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [isCreatingTaskGlobal, setIsCreatingTaskGlobal] = useState(false);

  // Create a new task test flow
  const handleCreateTask = () => {
    setIsCreatingTaskGlobal(true);
  };

  const handleGlobalCreateTaskSubmit = (title: string, data: any) => {
    const newTask: Issue = {
      id: `new-${Date.now()}`,
      key: `TSK-${Math.floor(Math.random() * 1000) + 100}`,
      title: title.trim(),
      description: data.description || '',
      status: data.status || 'PENDENTE',
      priority: data.priority || 'Normal',
      assignee: data.assignee,
      dueDate: data.dueDate,
      customFields: data.customFields || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setIssues(prev => [newTask, ...prev]);
    setIsCreatingTaskGlobal(false);
  };

  return (
    <div className="flex h-screen bg-[#0b1120] font-sans overflow-hidden text-slate-300 text-sm">
      
      {/* Far Left Thin Navigation */}
      <nav className="w-16 bg-[#0b1120] flex-shrink-0 flex flex-col items-center py-4 border-r border-[#334155] z-30">
        <div className="w-8 h-8 bg-emerald-500 rounded text-white flex items-center justify-center font-bold mb-6 cursor-pointer">
          C
        </div>
        
        <div className="flex flex-col gap-4 w-full px-2">
          <NavItem icon={Home} label="Início" active={globalView === 'home'} onClick={() => setGlobalView('home')} />
          <NavItem icon={Compass} label="Espaços" active={globalView === 'spaces'} onClick={() => setGlobalView('spaces')} />
          <NavItem icon={CheckSquare} label="Planejado" active={globalView === 'planned'} onClick={() => setGlobalView('planned')} />
          <NavItem icon={Users} label="Equipes" active={globalView === 'teams'} onClick={() => setGlobalView('teams')} />
          <NavItem icon={FileText} label="Documentos" active={globalView === 'docs'} onClick={() => setGlobalView('docs')} />
          <NavItem icon={BarChart2} label="Painéis" active={globalView === 'dashboards'} onClick={() => setGlobalView('dashboards')} />
          <NavItem icon={LayoutTemplate} label="Quadros" active={globalView === 'whiteboards'} onClick={() => setGlobalView('whiteboards')} />
        </div>
      </nav>

      {/* Second Sidebar (Spaces) */}
      {globalView === 'spaces' && (
        <aside className="w-[260px] bg-[#1e293b] flex-shrink-0 flex flex-col h-full border-r border-[#334155] z-20">
          <div className="p-4 flex items-center justify-between border-b border-[#334155]">
          <h2 className="font-semibold text-slate-200">Espaços</h2>
          <button onClick={() => setIsCreatingSpace(true)} className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> Criar
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 text-slate-400 hover:bg-[#334155] p-1.5 rounded cursor-pointer mb-4">
            <LayoutTemplate className="w-4 h-4" />
            <span className="text-sm">Todas as tarefas</span>
          </div>

          <div className="flex flex-col gap-2">
            {isCreatingSpace && (
              <div className="mb-2">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Nome do espaço..."
                  className="w-full bg-[#1e293b] border border-[#0ea5e9] text-slate-200 text-sm rounded px-2 py-1 outline-none"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewSpace();
                    if (e.key === 'Escape') { setIsCreatingSpace(false); setNewSpaceName(''); }
                  }}
                  onBlur={() => { setIsCreatingSpace(false); setNewSpaceName(''); }}
                />
              </div>
            )}
            
            {spaces.map(space => (
              <div key={space.id}>
                <div 
                  className={cn("flex items-center justify-between p-1.5 rounded cursor-pointer group", activeSpaceId === space.id ? "bg-[#334155] text-slate-200" : "text-slate-300 hover:bg-[#334155]")}
                  onClick={() => setActiveSpaceId(space.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-bold text-white", space.color)}>{space.initial}</div>
                    <span className="font-medium text-sm">{space.name}</span>
                  </div>
                  <ChevronDown 
                    className={cn("w-4 h-4 transition-transform", expandedSpaces[space.id] ? "rotate-180 text-slate-300" : "opacity-0 group-hover:opacity-100")} 
                    onClick={(e) => { e.stopPropagation(); toggleSpace(space.id); }}
                  />
                </div>
                
                {expandedSpaces[space.id] && (
                  <div className="ml-5 mt-1 border-l border-slate-700 pl-2 flex flex-col gap-1">
                    <div 
                      className={cn("flex items-center justify-between p-1.5 rounded cursor-pointer", activeView === 'list' && activeSpaceId === space.id ? 'bg-[#334155] text-slate-200' : 'text-slate-400 hover:bg-[#334155]')}
                      onClick={() => { setActiveView('list'); setActiveSpaceId(space.id); }}
                    >
                      <div className="flex items-center gap-2">
                        <ListIcon className="w-4 h-4" />
                        <span className="text-sm">List</span>
                      </div>
                      <span className="text-xs text-slate-500">{activeSpaceId === space.id ? issues.length : 0}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div onClick={() => setIsCreatingSpace(true)} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 p-1.5 ml-5 rounded cursor-pointer mt-1">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-sm">Novo Espaço</span>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
        
        {/* Top Global Bar */}
        <header className="h-12 border-b border-[#334155] px-4 flex items-center justify-between bg-[#1e293b] flex-shrink-0">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-8 items-center gap-1.5 rounded-md border border-[#475569] px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[#64748b] hover:bg-[#334155] hover:text-white"
                title="Voltar ao CRM"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer hover:bg-[#334155] px-2 py-1 rounded transition-colors">
              <div className="w-5 h-5 bg-emerald-500 rounded text-white flex items-center justify-center font-bold text-xs">C</div>
              <span className="font-semibold text-slate-200">Carlos Horst's Workspace</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          
          <div className="flex-1 max-w-lg mx-4 flex items-center gap-2">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-8 pr-3 py-1 bg-[#1e293b] border border-[#475569] rounded-md text-slate-300 placeholder-slate-500 focus:outline-none focus:border-[#0ea5e9] text-xs transition-colors"
                placeholder="Pesquisar ⌘ K"
                onClick={() => alert('Pesquisa global ativada. Use ⌘ K para buscar tarefas, documentos ou pessoas.')}
              />
            </div>
            <button onClick={() => alert('Abrindo painel de Chat com IA...')} className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-slate-300 px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2 transition-colors">
              Chats com IA <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </button>
          </div>
          
          <div className="flex items-center gap-3 text-slate-400">
            <CheckCircle2 onClick={() => setGlobalView('planned')} className="w-5 h-5 hover:text-slate-200 cursor-pointer" />
            <Bell onClick={() => alert('Painel de Notificações')} className="w-5 h-5 hover:text-slate-200 cursor-pointer" />
            <div onClick={() => alert('Menu do Perfil')} className="w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#1a1b1e] cursor-pointer">
              CH
            </div>
          </div>
        </header>

        {globalView === 'spaces' ? (
          <>
            {/* Project Header & Tabs */}
            <div className="bg-[#1e293b] border-b border-[#334155] flex-shrink-0">
          <div className="px-6 pt-4 pb-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xl font-bold text-slate-200">
                <div className={cn("w-5 h-5 rounded-sm text-[10px] flex items-center justify-center font-bold text-white mr-1", spaces.find(s => s.id === activeSpaceId)?.color || "bg-slate-700")}>
                  {spaces.find(s => s.id === activeSpaceId)?.initial || "P"}
                </div>
                {spaces.find(s => s.id === activeSpaceId)?.name || "Projeto Paranacidade"} <span className="text-slate-500 font-normal">/</span>
                <ListIcon className="w-5 h-5 text-slate-400 ml-1" /> List
                <ChevronDown className="w-5 h-5 text-slate-500 cursor-pointer" />
              </div>
              
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <button onClick={() => alert('Funcionalidade de Agentes será lançada em breve')} className="hover:text-slate-200 flex items-center gap-1"><Users2 className="w-4 h-4" /> Agentes</button>
                <button onClick={() => alert('ClickUp Brain em processamento...')} className="hover:text-slate-200 flex items-center gap-1"><Sparkles className="w-4 h-4 text-purple-400" /> Brain</button>
                <button onClick={() => alert('Compartilhar este espaço com outras pessoas')} className="hover:text-slate-200 flex items-center gap-1"><Users className="w-4 h-4" /> Compartilhar</button>
              </div>
            </div>

            <div className="flex items-center gap-6 overflow-x-auto text-sm font-medium hide-scrollbar">
              <Tab icon={Users} label="Equipe" active={activeView === 'team'} onClick={() => setActiveView('team')} />
              <Tab icon={BarChart2} label="Painéis" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
              <Tab icon={ListIcon} label="Lista" active={activeView === 'list'} onClick={() => setActiveView('list')} />
              <Tab icon={LayoutTemplate} label="Quadro" active={activeView === 'board'} onClick={() => setActiveView('board')} />
              <Tab icon={Calendar} label="Calendário" active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} />
              <Tab icon={GanttChartSquare} label="Gantt" active={activeView === 'gantt'} onClick={() => setActiveView('gantt')} />
              <Tab icon={Activity} label="Atividade" active={activeView === 'activity'} onClick={() => setActiveView('activity')} />
              <Tab icon={ListIcon} label="Carga de trabalho" active={activeView === 'workload'} onClick={() => setActiveView('workload')} />
              <div className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer pb-2">
                <Plus className="w-4 h-4" /> Visualização
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-14 px-6 flex items-center justify-between flex-shrink-0 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <button onClick={() => alert('Controles de Visão (Filtros, Agrupamento)')} className="bg-[#1e293b] hover:bg-[#2b2d32] text-slate-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 border border-[#475569]">
              <LayersIcon className="w-4 h-4 text-[#0ea5e9]" /> View Controls
            </button>
          </div>
          
          <div className="flex items-center gap-3 text-slate-400">
            <button onClick={() => alert('Busca específica na lista atual')} className="hover:bg-[#1e293b] p-1.5 rounded"><Search className="w-4 h-4" /></button>
            <button onClick={() => alert('Configurações da visualização atual')} className="hover:bg-[#1e293b] p-1.5 rounded"><Settings className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <button onClick={handleCreateTask} className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tarefa <ChevronDown className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>

        {/* View Renderer */}
        <div className="flex-1 overflow-hidden relative bg-[#0f172a]">
          {activeView === 'board' && <KanbanBoard issues={issues} setIssues={setIssues} onTaskClick={setSelectedTask} />}
          {activeView === 'list' && <ListView issues={issues} onTaskClick={setSelectedTask} />}
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'team' && <TeamView />}
          {activeView === 'calendar' && <CalendarView issues={issues} onTaskClick={setSelectedTask} />}
          {activeView === 'gantt' && <GanttView issues={issues} />}
          {activeView === 'activity' && <ActivityView />}
          {activeView === 'workload' && <WorkloadView issues={issues} />}
        </div>
        
          </>
        ) : (
          <div className="flex-1 overflow-hidden relative bg-[#0f172a]">
            {globalView === 'home' && <HomeView />}
            {globalView === 'planned' && <PlannedView />}
            {globalView === 'teams' && <TeamView />}
            {globalView === 'docs' && <DocsView />}
            {globalView === 'dashboards' && <Dashboard />}
            {globalView === 'whiteboards' && <WhiteboardsView />}
          </div>
        )}
      </main>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
      
      {isCreatingTaskGlobal && (
        <CreateTaskModal 
          onClose={() => setIsCreatingTaskGlobal(false)} 
          onCreate={handleGlobalCreateTaskSubmit} 
        />
      )}
    </div>
  );
}

// Helpers
function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-full py-2 px-1 rounded-xl transition-colors group",
      active ? "text-[#0ea5e9] bg-[#0ea5e9]/10" : "text-slate-500 hover:text-slate-300 hover:bg-[#334155]"
    )}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

function Tab({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 pb-2 border-b-2 transition-colors whitespace-nowrap",
        active ? "border-[#0ea5e9] text-slate-200" : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-[#0ea5e9]" : "")} />
      {label}
    </button>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 12 12 17 22 12"/>
      <polyline points="2 17 12 22 22 17"/>
    </svg>
  );
}
