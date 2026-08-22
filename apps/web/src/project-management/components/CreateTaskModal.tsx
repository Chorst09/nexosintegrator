import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, List as ListIcon, Calendar, Flag, Tag, Users, MoreHorizontal, Sparkles, Paperclip, Bell, ChevronDown, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { mockUsers, mockColumns } from '../data';
import { User, Column } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (title: string, data: any) => void;
  defaultStatus?: string;
}

export default function CreateTaskModal({ onClose, onCreate, defaultStatus = 'PENDENTE' }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showTaskType, setShowTaskType] = useState(false);

  const [showPriority, setShowPriority] = useState(false);
  const [priority, setPriority] = useState<string | null>(null);

  const [showStatus, setShowStatus] = useState(false);
  const [status, setStatus] = useState<string>(defaultStatus);

  const [showAssignees, setShowAssignees] = useState(false);
  const [assignee, setAssignee] = useState<User | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState<string>('');

  const [customFields, setCustomFields] = useState<{ id: string, name: string, value: string }[]>([]);

  const handleCreate = () => {
    onCreate(title, { description, priority, status, assignee, dueDate, customFields });
  };

  const handleAddCustomField = () => {
    setCustomFields(prev => [...prev, { id: `cf-${Date.now()}`, name: '', value: '' }]);
  };

  const updateCustomField = (id: string, field: 'name' | 'value', val: string) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const currentColumn = mockColumns.find(c => c.id === status) || mockColumns[0];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#13233b] w-full max-w-[800px] rounded-md flex flex-col overflow-hidden shadow-2xl border border-[#294a70]">
        {/* Top Navigation / Tabs */}
        <div className="flex items-center justify-between border-b border-[#294a70] px-2 h-12 bg-[#13233b]">
          <div className="flex gap-1 h-full">
            <button className="px-4 text-sm font-medium text-[#38bdf8] border-b-2 border-[#38bdf8] flex items-center">
              Tarefa
            </button>
            <button className="px-4 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-[#13233b] rounded-t-lg transition-colors flex items-center">
              Documento
            </button>
            <button className="px-4 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-[#13233b] rounded-t-lg transition-colors flex items-center">
              Lembrete
            </button>
            <button className="px-4 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-[#13233b] rounded-t-lg transition-colors flex items-center">
              Quadro branco
            </button>
            <button className="px-4 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-[#13233b] rounded-t-lg transition-colors flex items-center">
              Painéis
            </button>
          </div>
          <div className="flex items-center gap-2 pr-2">
            <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#1a2e4b] rounded-md transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#1a2e4b] rounded-full transition-colors bg-[#1a2e4b]/50">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 flex flex-col flex-1 gap-6 relative overflow-y-auto max-h-[70vh] custom-scrollbar">

          {/* Top Badges / Selectors */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1a2e4b] border border-[#315d87] hover:bg-[#1a2e4b] text-slate-300 text-xs font-medium transition-colors">
              <ListIcon className="w-3.5 h-3.5" /> List <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
            </button>

            <div className="relative">
              <button onClick={() => setShowTaskType(!showTaskType)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1a2e4b] border border-[#315d87] hover:bg-[#1a2e4b] text-slate-300 text-xs font-medium transition-colors">
                <Circle className="w-3.5 h-3.5" /> Tarefa <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
              </button>

              {showTaskType && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a2e4b] border border-[#315d87] rounded-md shadow-xl z-10 py-2">
                  <div className="px-3 pb-2 mb-2 border-b border-[#315d87] flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">Tipos de tarefa <div className="w-3 h-3 rounded-full border border-slate-400 text-[8px] flex items-center justify-center font-bold">?</div></span>
                    <button className="text-[#38bdf8] font-medium hover:text-[#2dd4bf]">Editar</button>
                  </div>
                  <div className="px-1 space-y-0.5">
                    <button className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#244568]/50 hover:bg-[#244568] text-left transition-colors">
                      <div className="flex items-center gap-2 text-sm text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-slate-400" /> Tarefa <span className="text-slate-500 text-xs">(padrão)</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-[#38bdf8]" />
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-300 transition-colors">
                      <div className="w-4 h-4 rotate-45 border-2 border-slate-400 rounded-sm" /> Marco
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-300 transition-colors">
                      <ListIcon className="w-4 h-4 text-slate-400" /> Anotação da reunião
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-300 transition-colors">
                      <ListIcon className="w-4 h-4 text-slate-400" /> Resposta do formulário
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <input
              type="text"
              autoFocus
              placeholder="Tarefa Nome"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-2xl font-bold text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Description Input */}
          <div className="flex-1 min-h-[120px]">
            <div className="relative">
              <textarea
                placeholder="Adicione uma descrição ou escreva com IA"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full h-full min-h-[120px] bg-transparent border-none outline-none text-base text-slate-300 placeholder-slate-500 resize-none"
              />
              {!description && (
                <div className="absolute top-0 left-[295px] pointer-events-none flex items-center gap-1 text-slate-500">
                  <Sparkles className="w-4 h-4" /> IA
                </div>
              )}
            </div>
          </div>

          {/* Task Metadata row */}
          <div className="flex items-center flex-wrap gap-2 pt-4">
            {/* Status Dropdown */}
            <div className="relative">
              <button onClick={() => setShowStatus(!showStatus)} className={cn("px-3 py-1.5 rounded-md hover:opacity-80 text-sm font-semibold transition-colors uppercase border border-transparent flex items-center gap-2", currentColumn?.colorClass.split('bg-')[0] || "text-slate-300 bg-[#1a2e4b]")}>
                {status.replace('_', ' ')} <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {showStatus && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a2e4b] border border-[#315d87] rounded-md shadow-xl z-10 py-1 overflow-hidden">
                  {mockColumns.map(col => (
                    <button
                      key={col.id}
                      onClick={() => { setStatus(col.id); setShowStatus(false); }}
                      className={cn("w-full px-3 py-2 text-left text-xs font-bold hover:bg-[#244568] transition-colors", col.colorClass.split('bg-')[0])}
                    >
                      {col.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignee Dropdown */}
            <div className="relative">
              <button onClick={() => setShowAssignees(!showAssignees)} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#315d87] hover:bg-[#1a2e4b] text-slate-300 text-sm font-medium transition-colors">
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white", assignee.color)}>
                      {assignee.initials}
                    </div>
                    {assignee.name}
                  </div>
                ) : (
                  <><Users className="w-4 h-4 text-slate-400" /> Responsável</>
                )}
              </button>

              {showAssignees && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a2e4b] border border-[#315d87] rounded-md shadow-xl z-10 py-2">
                  <div className="px-3 pb-2 text-xs text-slate-400 font-medium">Atribuir a</div>
                  <div className="px-1 space-y-0.5">
                    {mockUsers.map(u => (
                      <button key={u.id} onClick={() => { setAssignee(u); setShowAssignees(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-200 transition-colors">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", u.color)}>
                          {u.initials}
                        </div>
                        {u.name}
                      </button>
                    ))}
                    <div className="h-px bg-[#244568] my-1 mx-2" />
                    <button onClick={() => { setAssignee(null); setShowAssignees(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-300 transition-colors">
                      <div className="w-6 h-6 flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></div> Remover
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Due Date Dropdown (Native) */}
            <div className="relative">
              <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#315d87] hover:bg-[#1a2e4b] text-slate-300 text-sm font-medium transition-colors">
                <Calendar className="w-4 h-4 text-slate-400" /> {dueDate ? dueDate.split('-').reverse().join('/') : 'Data de vencimento'}
              </button>
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-[#1a2e4b] border border-[#315d87] rounded-md shadow-xl z-10">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => { setDueDate(e.target.value); setShowDatePicker(false); }}
                    className="bg-[#13233b] border border-[#315d87] text-slate-200 rounded p-1 text-sm outline-none"
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowPriority(!showPriority)} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#315d87] hover:bg-[#1a2e4b] text-slate-300 text-sm font-medium transition-colors">
                <Flag className="w-4 h-4 text-slate-400" />
                {priority ? priority : 'Prioridade'}
              </button>

              {showPriority && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a2e4b] border border-[#315d87] rounded-md shadow-xl z-10 py-2">
                  <div className="px-3 pb-2 text-xs text-slate-400 font-medium">Prioridade</div>
                  <div className="px-1 space-y-0.5">
                    <button onClick={() => { setPriority('Urgente'); setShowPriority(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-200 transition-colors">
                      <Flag className="w-4 h-4 text-red-500 fill-red-500" /> Urgente
                    </button>
                    <button onClick={() => { setPriority('Alta'); setShowPriority(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-200 transition-colors">
                      <Flag className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Alta
                    </button>
                    <button onClick={() => { setPriority('Normal'); setShowPriority(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-200 transition-colors">
                      <Flag className="w-4 h-4 text-blue-500 fill-blue-500" /> Normal
                    </button>
                    <button onClick={() => { setPriority('Baixa'); setShowPriority(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-200 transition-colors">
                      <Flag className="w-4 h-4 text-slate-400 fill-slate-400" /> Baixa
                    </button>
                    <div className="h-px bg-[#244568] my-1 mx-2" />
                    <button onClick={() => { setPriority(null); setShowPriority(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#244568] text-left text-sm text-slate-300 transition-colors">
                      <div className="w-4 h-4 flex items-center justify-center text-slate-400"><X className="w-3 h-3" /></div> Limpar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => alert("Menu de Etiquetas (mock)")} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#315d87] hover:bg-[#1a2e4b] text-slate-300 text-sm font-medium transition-colors">
              <Tag className="w-4 h-4 text-slate-400" /> Etiquetas
            </button>
            <button className="p-1.5 rounded-md border border-[#315d87] hover:bg-[#1a2e4b] text-slate-400 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Custom Fields section */}
          <div className="pt-4 border-t border-[#294a70]">
            <div className="text-xs font-semibold text-slate-400 mb-3">Campos</div>

            {customFields.length > 0 && (
              <div className="flex flex-col gap-3 mb-4">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-3 group">
                    <input
                      type="text"
                      placeholder="Nome do campo"
                      value={field.name}
                      onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                      className="bg-[#1a2e4b] border border-[#315d87] text-slate-200 text-sm rounded-md px-3 py-1.5 w-1/3 focus:border-[#38bdf8] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Valor"
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                      className="bg-[#1a2e4b] border border-[#315d87] text-slate-200 text-sm rounded-md px-3 py-1.5 flex-1 focus:border-[#38bdf8] outline-none"
                    />
                    <button onClick={() => removeCustomField(field.id)} className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-[#1a2e4b]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleAddCustomField} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1a2e4b]/50 hover:bg-[#1a2e4b] text-slate-300 text-sm font-medium transition-colors w-fit border border-transparent hover:border-[#315d87]">
              <Plus className="w-4 h-4" /> Criar novo campo
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="h-16 border-t border-[#294a70] px-6 flex items-center justify-between bg-[#13233b] shrink-0">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#315d87] hover:bg-[#1a2e4b] text-slate-300 text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4 text-slate-400" /> Modelos
          </button>

          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-200 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
              <Bell className="w-5 h-5" />
              <span className="text-sm font-medium">1</span>
            </div>

            <div className="flex rounded-lg overflow-hidden ml-2 shadow-lg">
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className="bg-[#38bdf8] hover:bg-[#0ea5e9] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 text-sm font-semibold transition-colors"
              >
                Criar Tarefa
              </button>
              <div className="w-px bg-[#2dd4bf]" />
              <button className="bg-[#38bdf8] hover:bg-[#0ea5e9] text-white px-2 py-2 flex items-center justify-center transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

