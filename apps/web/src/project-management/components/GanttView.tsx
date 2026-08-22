import React from 'react';
import { Issue } from '../types';

export default function GanttView({ issues }: { issues: Issue[] }) {
  // Simple fake Gantt implementation for visualization
  const startDate = new Date('2023-08-20').getTime();
  const endDate = new Date('2023-10-20').getTime();
  const totalDuration = endDate - startDate;

  const getPositionStyle = (start?: string, due?: string) => {
    if (!start || !due) return { left: '0%', width: '10%' };
    
    const s = new Date(start).getTime();
    const e = new Date(due).getTime();
    
    const left = ((s - startDate) / totalDuration) * 100;
    const width = ((e - s) / totalDuration) * 100;
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(2, width)}%` // At least 2% width
    };
  };

  return (
    <div className="h-full bg-[#0f172a] overflow-auto p-6 text-slate-300 flex flex-col">
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg overflow-hidden flex-1 flex flex-col min-w-[800px]">
        {/* Header */}
        <div className="flex border-b border-[#334155] bg-[#131416]">
          <div className="w-1/3 p-4 font-semibold text-sm border-r border-[#334155]">Tarefa</div>
          <div className="w-2/3 p-4 font-semibold text-sm flex justify-between text-slate-500 text-xs">
            <span>Agosto</span>
            <span>Setembro</span>
            <span>Outubro</span>
          </div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {issues.map(issue => (
            <div key={issue.id} className="flex border-b border-[#334155] hover:bg-[#1e293b] transition-colors group">
              {/* Task Name */}
              <div className="w-1/3 p-4 text-sm truncate border-r border-[#334155] flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${issue.status === 'PENDENTE' ? 'bg-slate-500' : 'bg-[#ea580c]'}`}></div>
                <span className="text-slate-200">{issue.title}</span>
              </div>
              
              {/* Timeline */}
              <div className="w-2/3 p-4 relative flex items-center border-l border-[#334155]/30">
                {/* Grid lines */}
                <div className="absolute inset-0 flex justify-between pointer-events-none opacity-10">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-full w-px bg-slate-500"></div>
                  ))}
                </div>

                {issue.startDate && issue.dueDate ? (
                  <div 
                    className="absolute h-6 bg-[#ea580c] rounded-md shadow-sm border border-[#6b58de] flex items-center px-2 overflow-hidden cursor-pointer hover:bg-[#c2410c]"
                    style={getPositionStyle(issue.startDate, issue.dueDate)}
                  >
                    <span className="text-[10px] text-white font-medium truncate">{issue.assignee?.initials}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 italic">Sem datas definidas</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
