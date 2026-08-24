import React from 'react';
import { Issue } from '../types';
import {
  X, CheckSquare, Maximize2, MoreHorizontal, MessageSquare,
  Search, Bell, Filter, User as UserIcon, Calendar,
  Flag, Paperclip, ChevronRight, Sparkles, Smile, Image as ImageIcon,
  Plus, Edit, CheckSquare as CheckSquareIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TaskModal({ task, onClose }: { task: Issue, onClose: () => void }) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#070b16] w-full max-w-[1200px] h-[90vh] rounded-md border border-[#263345] shadow-2xl flex flex-col overflow-hidden text-slate-300 flex-row">

        {/* Left Side: Task Details (65%) */}
        <div className="w-[65%] border-r border-[#263345] flex flex-col h-full bg-[#111827]">
          {/* Header */}
          <div className="h-12 flex items-center justify-between px-6 shrink-0 text-xs">
            <div className="flex items-center gap-2 text-slate-400 mt-2">
              <span className="flex items-center gap-1 hover:bg-[#111827] px-2 py-1 rounded cursor-pointer transition-colors border border-[#263345]">
                <CheckSquare className="w-3.5 h-3.5" /> Fase <ChevronRight className="w-3 h-3" />
              </span>
              <Maximize2 className="w-4 h-4 cursor-pointer hover:text-slate-200" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <h1 className="text-3xl font-bold text-white mb-6 leading-snug line-clamp-2 text-ellipsis" title={task.title}>
              {task.title}
            </h1>

            {/* AI Prompt */}
            <div className="bg-[#070b16] border border-[#263345] rounded-lg p-3 mb-8 flex items-center gap-2 text-slate-400 text-sm">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Peça ao Brain² um <span className="text-slate-200">apresentação</span>, documento ou <span className="text-slate-200">protótipo</span></span>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10 text-sm">
              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500 shrink-0">
                  <CheckSquareIcon className="w-4 h-4" /> Status
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors flex-1">
                  <span className="bg-[#0d1423] px-2 py-1 rounded text-xs font-bold text-slate-200 uppercase">
                    {task.status === 'PENDENTE' ? 'PENDENTE' : task.status}
                  </span>
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500 shrink-0">
                  <UserIcon className="w-4 h-4" /> Responsáveis
                </div>
                <div className="flex-1">
                  {task.assignee ? (
                    <div className="flex items-center gap-2 text-slate-200 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors w-fit">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", task.assignee.color)}>
                        {task.assignee.initials}
                      </div>
                      {task.assignee.name}
                    </div>
                  ) : (
                    <span className="text-slate-500 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors">Vazio</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500 shrink-0">
                  <Calendar className="w-4 h-4" /> Datas
                </div>
                <div className="flex items-center gap-1 text-slate-300 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors flex-wrap flex-1">
                  <span className="text-slate-500">Início</span> → <Calendar className="w-3.5 h-3.5" /> {task.dueDate || '2023-09-04'}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500 shrink-0">
                  <Flag className="w-4 h-4" /> Prioridade
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors flex-1">
                  {task.priority === 'Alta' ? (
                    <span className="text-yellow-500 flex items-center gap-1"><Flag className="w-4 h-4 fill-current" /> Alta</span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1"><Flag className="w-4 h-4" /> {task.priority}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500 shrink-0">
                  <span className="w-4 h-4 border border-dashed border-slate-500 flex items-center justify-center rounded"></span>
                  Estimativa
                </div>
                <div className="text-slate-500 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors flex-1">Vazio</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500 shrink-0">
                  <Sparkles className="w-4 h-4" /> Pontos
                </div>
                <div className="text-slate-500 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors flex-1">Vazio</div>
              </div>
              {task.customFields && task.customFields.length > 0 && (
                <>
                  <div className="h-px bg-[#0d1423] my-4 w-full" />
                  {task.customFields.map((cf) => (
                    <div key={cf.id} className="flex items-center gap-4">
                      <div className="w-32 flex items-center gap-2 text-slate-500 shrink-0 truncate">
                        <CheckSquareIcon className="w-4 h-4" /> {cf.name}
                      </div>
                      <div className="text-slate-300 cursor-pointer hover:bg-[#111827] px-2 py-1 -ml-2 rounded transition-colors flex-1 break-words">
                        {cf.value || 'Vazio'}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Description */}
            <div className="text-sm mb-12 mt-6">
              {task.description ? (
                <div className="text-slate-300 whitespace-pre-wrap">{task.description}</div>
              ) : (
                <div className="text-slate-500 cursor-text">
                  Adicione uma descrição ou escreva com <Sparkles className="w-3 h-3 inline text-slate-400" /> IA
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 text-sm text-slate-300">
              <button className="flex items-center gap-3 hover:text-slate-100 transition-colors w-fit font-medium">
                <CheckSquareIcon className="w-4 h-4 text-slate-400" /> Adicione os campos
              </button>
              <button className="flex items-center gap-3 hover:text-slate-100 transition-colors w-fit font-medium">
                <Plus className="w-4 h-4 text-slate-400" /> Adicionar subtarefa
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Activity & Comments (35%) */}
        <div className="w-[35%] flex flex-col h-full bg-[#070b16]">

          {/* Header */}
          <div className="h-12 border-b border-[#263345] flex items-center justify-between px-4 shrink-0 text-slate-400">
            <span className="font-semibold text-slate-200">Activity</span>
            <div className="flex items-center gap-4">
              <Search className="w-4 h-4 cursor-pointer hover:text-slate-200" />
              <div className="relative">
                <Bell className="w-4 h-4 cursor-pointer hover:text-slate-200" />
                <div className="absolute -top-1 -right-1 bg-[#ff7a00] text-white text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold">2</div>
              </div>
              <Filter className="w-4 h-4 cursor-pointer hover:text-slate-200" />
              <div className="w-px h-4 bg-slate-700 mx-1"></div>
              <X className="w-5 h-5 cursor-pointer hover:text-slate-200" onClick={onClose} />
            </div>
          </div>

          {/* Activity Log */}
          <div className="flex-1 overflow-y-auto p-4 text-xs text-slate-400 space-y-4">
            <div className="flex items-start justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                <span>Você criou esta tarefa</span>
              </div>
              <span>14:43</span>
            </div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                <span>Você definiu a data final</span>
              </div>
              <span>14:44</span>
            </div>

            <div className="mt-8 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ff7a00] flex items-center justify-center text-white font-bold shrink-0">
                CH
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-200">Carlos Horst</span>
                  <span className="text-slate-500">17:01</span>
                </div>
                <p className="text-slate-200 text-sm mb-3">Revisar documentação e aprovar os designs.</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    <button className="text-slate-400 hover:text-slate-200"><Smile className="w-4 h-4" /></button>
                  </div>
                  <button className="text-slate-300 hover:text-white font-medium">Responder</button>
                </div>
              </div>
            </div>
          </div>

          {/* Comment Input */}
          <div className="p-4 bg-[#070b16] border-t border-[#263345]">
            <div className="bg-[#111827] border border-[#374151] rounded-md p-3 focus-within:border-[#5a5c63] transition-colors">
              <input
                type="text"
                placeholder="Escreva um comentário..."
                className="w-full bg-transparent border-none focus:outline-none text-sm text-slate-200 mb-3"
              />
              <div className="flex items-center justify-between text-slate-400 mt-2">
                <div className="flex items-center gap-2">
                  <button className="w-6 h-6 rounded hover:bg-[#1f2937] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  <button className="bg-[#0d1423] px-2 py-1 rounded text-xs flex items-center gap-1 hover:text-slate-200 transition-colors">
                    Comentário <ChevronRight className="w-3 h-3 rotate-90" />
                  </button>
                  <Sparkles className="w-4 h-4 text-teal-400 cursor-pointer ml-1 hover:text-teal-300" />
                </div>
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 cursor-pointer hover:text-slate-200" />
                  <Paperclip className="w-4 h-4 cursor-pointer hover:text-slate-200" />
                  <div className="bg-[#1f2937] p-1.5 rounded-md cursor-pointer hover:bg-[#374151] transition-colors flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
