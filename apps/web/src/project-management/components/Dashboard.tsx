import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Zap, Activity, Clock, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

const cfdData = [
  { name: 'Seg', 'PENDENTE': 10, 'EM PROGRESSO': 2, 'CONCLUÍDO': 5 },
  { name: 'Ter', 'PENDENTE': 8, 'EM PROGRESSO': 3, 'CONCLUÍDO': 6 },
  { name: 'Qua', 'PENDENTE': 7, 'EM PROGRESSO': 4, 'CONCLUÍDO': 7 },
  { name: 'Qui', 'PENDENTE': 5, 'EM PROGRESSO': 3, 'CONCLUÍDO': 10 },
  { name: 'Sex', 'PENDENTE': 3, 'EM PROGRESSO': 2, 'CONCLUÍDO': 13 },
];

const velocityData = [
  { name: 'Sp 10', comprometido: 20, entregue: 18 },
  { name: 'Sp 11', comprometido: 25, entregue: 25 },
  { name: 'Sp 12', comprometido: 22, entregue: 15 },
  { name: 'Sp 13', comprometido: 30, entregue: 28 },
  { name: 'Sp 14', comprometido: 24, entregue: 26 },
];

const distributionData = [
  { name: 'Bug', value: 12, color: '#f87171' },
  { name: 'Feature', value: 35, color: '#60a5fa' },
  { name: 'Melhoria', value: 20, color: '#38bdf8' },
  { name: 'Tech Debt', value: 10, color: '#2dd4bf' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#070f1f]/90 backdrop-blur-md border border-[#315d87] p-3 rounded-lg shadow-xl">
        <p className="text-slate-200 font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="text-slate-100 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  return (
    <div className="h-full bg-[#0e1b32] overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-100">Visão Geral do Projeto</h1>
          <p className="text-sm text-slate-400">Acompanhe métricas e progresso da equipe em tempo real.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#102139] to-[#132943] p-5 rounded-lg border border-[#294a70] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5  transition-colors group-hover:bg-blue-500/10" />
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                <ArrowDownRight className="w-3 h-3" /> 12%
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">3.2 <span className="text-lg font-medium text-slate-500">dias</span></h3>
            <p className="text-sm text-slate-400">Tempo de Ciclo Médio</p>
          </div>

          <div className="bg-gradient-to-br from-[#102139] to-[#132943] p-5 rounded-lg border border-[#294a70] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5  transition-colors group-hover:bg-cyan-500/10" />
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> 8%
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">26 <span className="text-lg font-medium text-slate-500">pts</span></h3>
            <p className="text-sm text-slate-400">Velocity Atual</p>
          </div>

          <div className="bg-gradient-to-br from-[#102139] to-[#132943] p-5 rounded-lg border border-[#294a70] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5  transition-colors group-hover:bg-emerald-500/10" />
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-400/10 px-2 py-1 rounded-full">
                Estável
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">85%</h3>
            <p className="text-sm text-slate-400">Carga de WIP</p>
          </div>

          <div className="bg-gradient-to-br from-[#102139] to-[#132943] p-5 rounded-lg border border-[#294a70] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 transition-colors group-hover:bg-teal-500/10" />
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-teal-400" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> +14
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">124</h3>
            <p className="text-sm text-slate-400">Tarefas Concluídas</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#13233b]/80 backdrop-blur-sm p-6 rounded-lg border border-[#294a70] shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-100">Diagrama de Fluxo Cumulativo (CFD)</h3>
              <select className="bg-[#13233b] border border-[#315d87] text-slate-300 text-xs rounded-md px-2 py-1 outline-none">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
              </select>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cfdData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPendente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProgresso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUpdate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2e4b" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                  <Area type="monotone" dataKey="CONCLUÍDO" stackId="1" stroke="#2dd4bf" strokeWidth={2} fill="url(#colorUpdate)" />
                  <Area type="monotone" dataKey="EM PROGRESSO" stackId="1" stroke="#3b82f6" strokeWidth={2} fill="url(#colorProgresso)" />
                  <Area type="monotone" dataKey="PENDENTE" stackId="1" stroke="#38bdf8" strokeWidth={2} fill="url(#colorPendente)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#13233b]/80 backdrop-blur-sm p-6 rounded-lg border border-[#294a70] shadow-xl flex flex-col">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Distribuição de Tipos</h3>
            <p className="text-xs text-slate-400 mb-6">Composição das tarefas na sprint ativa</p>
            <div className="flex-1 min-h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 4px 6px ${entry.color}40)` }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-white">77</span>
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Tarefas</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {distributionData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}80` }} />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-300">{item.name}</span>
                    <span className="text-[10px] text-slate-500">{item.value} items</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-[#13233b]/80 backdrop-blur-sm p-6 rounded-lg border border-[#294a70] shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Gráfico de Velocity</h3>
                <p className="text-xs text-slate-400 mt-1">Comparativo de pontos comprometidos vs entregues</p>
              </div>
              <div className="flex items-center gap-4 bg-[#13233b] p-1 rounded-lg border border-[#315d87]">
                <button className="px-3 py-1 text-xs font-medium bg-[#244568] text-white rounded shadow-sm">Sprints</button>
                <button className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">Meses</button>
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barGap={8}>
                  <defs>
                    <linearGradient id="colorComprometido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#294a70" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#13233b" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="colorEntregue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2e4b" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a2e4b', opacity: 0.4 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                  <Bar dataKey="comprometido" name="Comprometido" fill="url(#colorComprometido)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="entregue" name="Entregue" fill="url(#colorEntregue)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
