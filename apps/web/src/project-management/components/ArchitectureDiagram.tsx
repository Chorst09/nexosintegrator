import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Panel,
  MarkerType,
  Connection,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Server, Database, Globe, Smartphone, Cloud, ArrowLeft, Layers, Box, Upload, Download, Save, FolderOpen } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const iconMap: Record<string, any> = {
  server: Server,
  database: Database,
  globe: Globe,
  smartphone: Smartphone,
  cloud: Cloud,
};

const ArchNode = ({ id, data, selected }: any) => {
  const [imgError, setImgError] = useState(false);
  const { setNodes } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = iconMap[data.icon] || Box;

  const getNormalizedName = (name: string) => {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower === 'node.js' || lower === 'nodejs') return 'nodedotjs';
    if (lower === 'vue' || lower === 'vuejs') return 'vuedotjs';
    return lower.replace(/[^a-z0-9]/g, '');
  };

  const normalized = getNormalizedName(data.imageName || data.label);
  const customImage = data.uploadedImage || (normalized ? `https://cdn.simpleicons.org/${normalized}/0ea5e9` : null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, uploadedImage: dataUrl } };
        }
        return n;
      }));
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-[#1e293b] border ${selected ? 'border-[#0ea5e9] shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'border-[#334155]'} rounded-xl p-4 shadow-lg min-w-[180px] flex items-center gap-3 text-slate-200 transition-colors`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-[#1e293b] bg-[#0ea5e9]" />
      <div 
        className="w-12 h-12 rounded-lg bg-[#0f172a] border border-[#334155] text-[#0ea5e9] flex items-center justify-center shrink-0 overflow-hidden p-1.5 cursor-pointer relative group"
        onClick={() => fileInputRef.current?.click()}
        title="Clique para alterar a imagem"
      >
        {customImage && !imgError ? (
          <img 
            src={customImage} 
            alt={data.label} 
            onError={() => setImgError(true)} 
            className="w-full h-full object-contain" 
          />
        ) : (
          <Icon className="w-6 h-6" />
        )}
        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-lg">
          <Upload className="w-4 h-4 text-white" />
        </div>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
        />
      </div>
      <div className="flex-1">
        <div className="font-bold text-sm leading-tight">{data.label}</div>
        {data.sublabel && <div className="text-[10px] text-slate-400 mt-0.5">{data.sublabel}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-[#1e293b] bg-[#ea580c]" />
    </div>
  );
};

const nodeTypes = { arch: ArchNode };

const defaultEdgeOptions = {
  style: { stroke: '#475569', strokeWidth: 2 },
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#475569',
  },
};

const templates = {
  'blank': { nodes: [], edges: [] },
  '3-tier': {
    nodes: [
      { id: 'client', type: 'arch', position: { x: 250, y: 50 }, data: { label: 'Web Client', icon: 'globe', sublabel: 'React / SPA', imageName: 'react' } },
      { id: 'api', type: 'arch', position: { x: 250, y: 200 }, data: { label: 'API Gateway', icon: 'server', sublabel: 'Node.js Express', imageName: 'nodedotjs' } },
      { id: 'db', type: 'arch', position: { x: 250, y: 350 }, data: { label: 'Database', icon: 'database', sublabel: 'PostgreSQL', imageName: 'postgresql' } },
    ],
    edges: [
      { id: 'e1', source: 'client', target: 'api' },
      { id: 'e2', source: 'api', target: 'db' },
    ]
  },
  'microservices': {
    nodes: [
      { id: 'client', type: 'arch', position: { x: 400, y: 50 }, data: { label: 'Mobile App', icon: 'smartphone', sublabel: 'iOS / Android', imageName: 'apple' } },
      { id: 'gateway', type: 'arch', position: { x: 400, y: 200 }, data: { label: 'API Gateway', icon: 'cloud', sublabel: 'Kong / Nginx', imageName: 'nginx' } },
      { id: 'auth', type: 'arch', position: { x: 150, y: 350 }, data: { label: 'Auth Service', icon: 'server', sublabel: 'Go', imageName: 'go' } },
      { id: 'users', type: 'arch', position: { x: 400, y: 350 }, data: { label: 'Users Service', icon: 'server', sublabel: 'Node.js', imageName: 'nodedotjs' } },
      { id: 'orders', type: 'arch', position: { x: 650, y: 350 }, data: { label: 'Orders Service', icon: 'server', sublabel: 'Java', imageName: 'java' } },
      { id: 'db-auth', type: 'arch', position: { x: 150, y: 500 }, data: { label: 'Auth DB', icon: 'database', sublabel: 'Redis', imageName: 'redis' } },
      { id: 'db-users', type: 'arch', position: { x: 400, y: 500 }, data: { label: 'Users DB', icon: 'database', sublabel: 'PostgreSQL', imageName: 'postgresql' } },
      { id: 'db-orders', type: 'arch', position: { x: 650, y: 500 }, data: { label: 'Orders DB', icon: 'database', sublabel: 'MongoDB', imageName: 'mongodb' } },
    ],
    edges: [
      { id: 'e1', source: 'client', target: 'gateway' },
      { id: 'e2', source: 'gateway', target: 'auth' },
      { id: 'e3', source: 'gateway', target: 'users' },
      { id: 'e4', source: 'gateway', target: 'orders' },
      { id: 'e5', source: 'auth', target: 'db-auth' },
      { id: 'e6', source: 'users', target: 'db-users' },
      { id: 'e7', source: 'orders', target: 'db-orders' },
    ]
  }
};

function ArchitectureDiagramContent({ onBack }: { onBack: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(templates['3-tier'].nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(templates['3-tier'].edges);
  const [activeTemplate, setActiveTemplate] = useState('3-tier');
  const [customNodeName, setCustomNodeName] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getNodes } = useReactFlow();

  useEffect(() => {
    const saved = localStorage.getItem('saved_diagram');
    if (saved) setHasSaved(true);
  }, []);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const loadTemplate = (key: keyof typeof templates | 'saved') => {
    setActiveTemplate(key);
    if (key === 'saved') {
      const savedStr = localStorage.getItem('saved_diagram');
      if (savedStr) {
        const data = JSON.parse(savedStr);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      }
    } else {
      setNodes(templates[key].nodes);
      setEdges(templates[key].edges);
    }
  };

  const saveDiagram = () => {
    const data = { nodes, edges };
    localStorage.setItem('saved_diagram', JSON.stringify(data));
    setHasSaved(true);
    alert('Diagrama salvo com sucesso no navegador!');
  };

  const downloadPDF = () => {
    const nodes = getNodes();
    if (nodes.length === 0) return;

    // Calculate bounds manually since exports might differ by version
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    nodes.forEach((n) => {
      const width = n.measured?.width || 200;
      const height = n.measured?.height || 150;
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + width);
      maxY = Math.max(maxY, n.position.y + height);
    });

    const padding = 60;
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    
    const imageWidth = boundsWidth + padding * 2;
    const imageHeight = boundsHeight + padding * 2;

    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) return;

    // We can manually force the transform on the element just for the snapshot
    // But since html-to-image takes a style object, we can just apply a translate
    const translateX = -minX + padding;
    const translateY = -minY + padding;

    toPng(viewportElement, {
      backgroundColor: '#0f172a',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${translateX}px, ${translateY}px) scale(1)`,
      },
    }).then((dataUrl) => {
      const pdf = new jsPDF({
        orientation: imageWidth > imageHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imageWidth, imageHeight]
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, imageWidth, imageHeight);
      pdf.save('diagrama.pdf');
    }).catch(err => {
      console.error('Erro ao gerar PDF', err);
      alert('Erro ao gerar o PDF. Tente novamente.');
    });
  };

  const addNode = (icon: string, label: string) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'arch',
      position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 100 },
      data: { label, icon, sublabel: 'Básico' }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addCustomNode = () => {
    if (!customNodeName.trim()) return;
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'arch',
      position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 100 },
      data: { label: customNodeName, icon: 'server', sublabel: 'Customizado', imageName: customNodeName }
    };
    setNodes((nds) => [...nds, newNode]);
    setCustomNodeName('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newNode = {
        id: `node-${Date.now()}`,
        type: 'arch',
        position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 100 },
        data: { label: file.name.split('.')[0], icon: 'server', sublabel: 'Imagem Customizada', uploadedImage: dataUrl }
      };
      setNodes((nds) => [...nds, newNode]);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0f172a] overflow-hidden w-full absolute inset-0 z-50">
      <div className="h-14 border-b border-[#334155] bg-[#1e293b] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="w-px h-6 bg-[#334155]"></div>
          <h2 className="text-slate-200 font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0ea5e9]" /> Diagrama de Arquitetura
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0f172a] p-1 rounded-lg border border-[#334155]">
            {hasSaved && (
              <button 
                onClick={() => loadTemplate('saved')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'saved' ? 'bg-[#ea580c] text-white' : 'text-[#ea580c] hover:bg-[#ea580c]/10'}`}
              >Meu Diagrama</button>
            )}
            <div className="w-px h-4 bg-[#334155] mx-1"></div>
            <button 
              onClick={() => loadTemplate('blank')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'blank' ? 'bg-[#334155] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Em Branco</button>
            <button 
              onClick={() => loadTemplate('3-tier')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === '3-tier' ? 'bg-[#334155] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Web 3-Tier</button>
            <button 
              onClick={() => loadTemplate('microservices')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'microservices' ? 'bg-[#334155] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Microserviços</button>
          </div>
          
          <div className="flex items-center gap-2 border-l border-[#334155] pl-3">
            <button 
              onClick={saveDiagram}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-[#1e293b] hover:bg-[#334155] border border-[#334155] px-3 py-1.5 rounded-md transition-colors font-medium shadow-sm"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button 
              onClick={downloadPDF}
              className="flex items-center gap-2 text-sm text-white bg-[#0ea5e9] hover:bg-[#0284c7] px-4 py-1.5 rounded-md transition-colors font-medium shadow-lg"
            >
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          colorMode="dark"
          fitView
          className="bg-[#0f172a]"
        >
          <Background color="#334155" gap={24} size={2} />
          <Controls className="bg-[#1e293b] border-[#334155] fill-slate-300" />
          <MiniMap 
            nodeColor={(n) => '#0ea5e9'}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="bg-[#1e293b] border border-[#334155] rounded-xl"
          />
          
          <Panel position="top-left" className="bg-[#1e293b]/90 backdrop-blur-md border border-[#334155] p-3 rounded-xl shadow-xl flex flex-col gap-2 max-h-[calc(100vh-100px)] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Componentes</h3>
            <button onClick={() => addNode('globe', 'Web Client')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#334155] p-2 rounded-lg transition-colors text-left">
              <Globe className="w-4 h-4 text-[#0ea5e9]" /> Web App
            </button>
            <button onClick={() => addNode('smartphone', 'Mobile App')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#334155] p-2 rounded-lg transition-colors text-left">
              <Smartphone className="w-4 h-4 text-[#0ea5e9]" /> Mobile App
            </button>
            <button onClick={() => addNode('server', 'Servidor API')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#334155] p-2 rounded-lg transition-colors text-left">
              <Server className="w-4 h-4 text-[#0ea5e9]" /> Servidor
            </button>
            <button onClick={() => addNode('database', 'Banco de Dados')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#334155] p-2 rounded-lg transition-colors text-left">
              <Database className="w-4 h-4 text-[#0ea5e9]" /> Banco de Dados
            </button>
            <button onClick={() => addNode('cloud', 'Cloud Service')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#334155] p-2 rounded-lg transition-colors text-left">
              <Cloud className="w-4 h-4 text-[#0ea5e9]" /> Cloud Service
            </button>

            <div className="mt-2 pt-3 border-t border-[#334155] flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tecnologia Específica</h3>
              <input 
                type="text" 
                placeholder="Ex: React, Docker, AWS" 
                className="bg-[#0f172a] border border-[#334155] rounded-md px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-[#0ea5e9]"
                value={customNodeName}
                onChange={(e) => setCustomNodeName(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === 'Enter') addCustomNode();
                }}
              />
              <button 
                onClick={addCustomNode}
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-2 py-1.5 rounded-md text-sm font-medium transition-colors w-full"
              >
                Adicionar ao Diagrama
              </button>
            </div>

            <div className="mt-2 pt-3 border-t border-[#334155] flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Upload de Imagem</h3>
              <input 
                type="file" 
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 hover:text-white px-2 py-1.5 rounded-md text-sm font-medium transition-colors w-full"
              >
                <Upload className="w-4 h-4" /> Enviar Arquivo
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export default function ArchitectureDiagram(props: { onBack: () => void }) {
  return (
    <ReactFlowProvider>
      <ArchitectureDiagramContent {...props} />
    </ReactFlowProvider>
  );
}
