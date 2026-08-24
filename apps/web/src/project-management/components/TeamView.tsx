import React from 'react';
import { User } from '../types';
import { mockUsers } from '../data';
import { Mail, MoreHorizontal, Search, UserPlus, Shield, Activity, Users } from 'lucide-react';

export default function TeamView() {
  return (
    <div className="h-full bg-[#070b16] overflow-y-auto p-8 text-slate-300">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Users className="w-6 h-6 text-[#ff7a00]" />
            Equipe do Projeto
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Procurar membro..."
                className="bg-[#111827] border border-[#263345] text-sm text-slate-200 rounded-md pl-9 pr-4 py-1.5 focus:outline-none focus:border-[#ff7a00] w-64"
              />
            </div>
            <button className="flex items-center gap-2 text-sm text-white bg-[#ff7a00] hover:bg-[#f6b40b] px-4 py-1.5 rounded-md transition-colors font-medium">
              <UserPlus className="w-4 h-4" /> Convidar
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111827] border border-[#263345] rounded-md p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="text-slate-500 text-sm font-medium">Membros Totais</div>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-200">{mockUsers.length}</div>
          </div>
          <div className="bg-[#111827] border border-[#263345] rounded-md p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="text-slate-500 text-sm font-medium">Ativos Agora</div>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-200">2</div>
          </div>
          <div className="bg-[#111827] border border-[#263345] rounded-md p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="text-slate-500 text-sm font-medium">Convites Pendentes</div>
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-200">1</div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#263345] rounded-md overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#263345] text-slate-400 bg-[#0b1729]">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Membro</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Função</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Último Acesso</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0d1423]">
              {mockUsers.map((user, idx) => (
                <tr key={user.id} className="hover:bg-[#111827] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner ${user.color}`}>
                        {user.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#0d1423] border border-[#263345] text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 w-fit">
                      {user.role === 'Admin' && <Shield className="w-3 h-3 text-teal-400" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${idx < 2 ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                      <span className="text-slate-300 text-xs">{idx < 2 ? 'Online' : 'Offline'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                    {idx === 0 ? 'Agora mesmo' : idx === 1 ? 'Há 5 min' : 'Há 2 dias'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-500 hover:text-slate-200 p-1.5 rounded hover:bg-[#1f2937] transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
