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
import {
  Server,
  Database,
  Globe,
  Smartphone,
  Cloud,
  ArrowLeft,
  Layers,
  Box,
  Upload,
  Download,
  Save,
  Wifi,
  RadioTower,
  Network,
  Router,
  Cable,
  Shield,
  Building2,
  ImagePlus,
  Trash2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const iconMap: Record<string, any> = {
  server: Server,
  database: Database,
  globe: Globe,
  smartphone: Smartphone,
  cloud: Cloud,
  router: Router,
  switch: Network,
  accessPoint: Wifi,
  radio: RadioTower,
  fiber: Cable,
  firewall: Shield,
  pop: Building2,
};

const BackgroundImageNode = ({ data }: any) => (
  <div
    className="pointer-events-none overflow-hidden rounded-xl border border-[#2b3d56]/80 bg-[#050914]/60 shadow-2xl"
    style={{
      width: data.width || 1280,
      height: data.height || 760,
      opacity: data.opacity ?? 0.38
    }}
  >
    <img
      src={data.src}
      alt="Imagem de fundo do diagrama"
      className="h-full w-full object-contain"
      draggable={false}
    />
  </div>
);

const DiagramSetNodesContext = React.createContext<any>(null);

const ArchNode = ({ id, data, selected }: any) => {
  const [imgError, setImgError] = useState(false);
  const { setNodes: setFlowNodes } = useReactFlow();
  const setDiagramNodes = React.useContext(DiagramSetNodesContext);
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
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updateNodes = setDiagramNodes || setFlowNodes;
      updateNodes((nds: any[]) => nds.map((n) => {
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

  useEffect(() => {
    setImgError(false);
  }, [customImage]);

  return (
    <div className={`bg-[#111827] border ${selected ? 'border-[#ff7a00] shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'border-[#263345]'} rounded-md p-4 shadow-lg min-w-[190px] flex items-center gap-3 text-slate-200 transition-colors`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-[#111827] bg-[#ff7a00]" />
      <div
        className="w-12 h-12 rounded-lg bg-[#070b16] border border-[#263345] text-[#ff7a00] flex items-center justify-center shrink-0 overflow-hidden p-1.5 cursor-pointer relative group"
        onClick={(event) => {
          event.stopPropagation();
          fileInputRef.current?.click();
        }}
        onMouseDown={(event) => event.stopPropagation()}
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
          onClick={(event) => event.stopPropagation()}
        />
      </div>
      <div className="flex-1">
        <div className="font-bold text-sm leading-tight">{data.label}</div>
        {data.sublabel && <div className="text-[10px] text-slate-400 mt-0.5">{data.sublabel}</div>}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            fileInputRef.current?.click();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 rounded border border-[#263345] px-2 py-0.5 text-[10px] font-semibold text-slate-400 transition-colors hover:border-[#ff7a00]/70 hover:text-[#ff7a00]"
        >
          <Upload className="h-3 w-3" />
          Imagem
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-[#111827] bg-[#ff7a00]" />
    </div>
  );
};

const nodeTypes = { arch: ArchNode, backgroundImage: BackgroundImageNode };

const defaultEdgeOptions = {
  style: { stroke: '#374151', strokeWidth: 2 },
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#374151',
  },
};

const templates = {
  'blank': { nodes: [], edges: [] },
  'fiber-radio': {
    nodes: [
      { id: 'internet', type: 'arch', position: { x: 420, y: 10 }, data: { label: 'Operadora / Internet', icon: 'globe', sublabel: 'Link principal', imageName: 'internet' } },
      { id: 'pop', type: 'arch', position: { x: 420, y: 150 }, data: { label: 'POP Fibra', icon: 'pop', sublabel: 'DIO / OLT / Core', imageName: 'fiber' } },
      { id: 'tower-a', type: 'arch', position: { x: 120, y: 300 }, data: { label: 'Torre Rádio A', icon: 'radio', sublabel: 'Ponto de transmissão', imageName: 'radio' } },
      { id: 'tower-b', type: 'arch', position: { x: 420, y: 300 }, data: { label: 'Torre Rádio B', icon: 'radio', sublabel: 'Ponto remoto', imageName: 'radio' } },
      { id: 'core-switch', type: 'arch', position: { x: 700, y: 300 }, data: { label: 'Switch Core', icon: 'switch', sublabel: 'VLANs / Trunks', imageName: 'cisco' } },
      { id: 'ap-area', type: 'arch', position: { x: 700, y: 460 }, data: { label: 'Access Points', icon: 'accessPoint', sublabel: 'Wi-Fi corporativo', imageName: 'wifi' } },
    ],
    edges: [
      { id: 'e-fiber-1', source: 'internet', target: 'pop', label: 'Fibra', style: { stroke: '#22d3ee', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
      { id: 'e-radio-1', source: 'pop', target: 'tower-a', label: 'Fibra até torre', style: { stroke: '#22d3ee', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
      { id: 'e-radio-2', source: 'tower-a', target: 'tower-b', label: 'Rádio enlace', style: { stroke: '#f6b40b', strokeWidth: 3, strokeDasharray: '8 6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f6b40b' } },
      { id: 'e-lan-1', source: 'tower-b', target: 'core-switch', label: 'Backhaul', style: { stroke: '#ff7a00', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ff7a00' } },
      { id: 'e-lan-2', source: 'core-switch', target: 'ap-area', label: 'PoE / VLAN Wi-Fi', style: { stroke: '#34d399', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#34d399' } },
    ]
  },
  'switch-ap': {
    nodes: [
      { id: 'router', type: 'arch', position: { x: 420, y: 40 }, data: { label: 'Roteador / Firewall', icon: 'firewall', sublabel: 'Gateway / NAT / VPN', imageName: 'fortinet' } },
      { id: 'core-switch', type: 'arch', position: { x: 420, y: 190 }, data: { label: 'Switch Core', icon: 'switch', sublabel: '10G / VLANs', imageName: 'cisco' } },
      { id: 'access-1', type: 'arch', position: { x: 150, y: 350 }, data: { label: 'Switch Acesso 1', icon: 'switch', sublabel: 'PoE / Andar 1', imageName: 'switch' } },
      { id: 'access-2', type: 'arch', position: { x: 420, y: 350 }, data: { label: 'Switch Acesso 2', icon: 'switch', sublabel: 'PoE / Andar 2', imageName: 'switch' } },
      { id: 'access-3', type: 'arch', position: { x: 690, y: 350 }, data: { label: 'Switch Acesso 3', icon: 'switch', sublabel: 'PoE / Galpão', imageName: 'switch' } },
      { id: 'ap-1', type: 'arch', position: { x: 150, y: 520 }, data: { label: 'AP Escritório', icon: 'accessPoint', sublabel: 'SSID Corp / Guest', imageName: 'wifi' } },
      { id: 'ap-2', type: 'arch', position: { x: 420, y: 520 }, data: { label: 'AP Produção', icon: 'accessPoint', sublabel: 'Cobertura industrial', imageName: 'wifi' } },
      { id: 'ap-3', type: 'arch', position: { x: 690, y: 520 }, data: { label: 'AP Externo', icon: 'accessPoint', sublabel: 'Área externa', imageName: 'wifi' } },
    ],
    edges: [
      { id: 'e1', source: 'router', target: 'core-switch' },
      { id: 'e2', source: 'core-switch', target: 'access-1' },
      { id: 'e3', source: 'core-switch', target: 'access-2' },
      { id: 'e4', source: 'core-switch', target: 'access-3' },
      { id: 'e5', source: 'access-1', target: 'ap-1' },
      { id: 'e6', source: 'access-2', target: 'ap-2' },
      { id: 'e7', source: 'access-3', target: 'ap-3' },
    ]
  },
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
  const [nodes, setNodes, onNodesChange] = useNodesState(templates['fiber-radio'].nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(templates['fiber-radio'].edges);
  const [activeTemplate, setActiveTemplate] = useState('fiber-radio');
  const [customNodeName, setCustomNodeName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.38);
  const [hasSaved, setHasSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const { getNodes } = useReactFlow();

  useEffect(() => {
    const saved = localStorage.getItem('saved_diagram');
    if (saved) setHasSaved(true);
  }, []);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const flowNodes = React.useMemo(() => {
    const diagramNodes = nodes.map((node) => ({
      ...node,
      zIndex: node.zIndex ?? 10
    }));

    if (!backgroundImage) return diagramNodes;
    return [
      {
        id: 'diagram-background-image',
        type: 'backgroundImage',
        position: { x: -120, y: -80 },
        data: {
          src: backgroundImage,
          opacity: backgroundOpacity,
          width: 1280,
          height: 760
        },
        selectable: false,
        draggable: false,
        connectable: false,
        deletable: false,
        zIndex: 0,
      },
      ...diagramNodes
    ];
  }, [backgroundImage, backgroundOpacity, nodes]);

  const loadTemplate = (key: keyof typeof templates | 'saved') => {
    setActiveTemplate(key);
    if (key === 'saved') {
      const savedStr = localStorage.getItem('saved_diagram');
      if (savedStr) {
        const data = JSON.parse(savedStr);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setBackgroundImage(data.backgroundImage || null);
        setBackgroundOpacity(typeof data.backgroundOpacity === 'number' ? data.backgroundOpacity : 0.38);
      }
    } else {
      setNodes(templates[key].nodes);
      setEdges(templates[key].edges);
      if (key === 'blank') {
        setBackgroundImage(null);
        setBackgroundOpacity(0.38);
      }
    }
  };

  const saveDiagram = () => {
    const data = { nodes, edges, backgroundImage, backgroundOpacity };
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
      backgroundColor: '#070b16',
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
      data: { label, icon, sublabel: 'Componente de rede' }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addNetworkNode = (icon: string, label: string, sublabel: string, imageName?: string) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'arch',
      position: { x: Math.random() * 280 + 260, y: Math.random() * 260 + 140 },
      data: { label, icon, sublabel, imageName: imageName || label }
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

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (backgroundInputRef.current) {
      backgroundInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#070b16] overflow-hidden w-full absolute inset-0 z-50">
      <div className="h-14 border-b border-[#263345] bg-[#111827] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="w-px h-6 bg-[#263345]"></div>
          <h2 className="text-slate-200 font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#ff7a00]" /> Diagrama de Arquitetura
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#070b16] p-1 rounded-lg border border-[#263345]">
            {hasSaved && (
              <button
                onClick={() => loadTemplate('saved')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'saved' ? 'bg-[#ff7a00] text-white' : 'text-[#ff7a00] hover:bg-[#ff7a00]/10'}`}
              >Meu Diagrama</button>
            )}
            <div className="w-px h-4 bg-[#263345] mx-1"></div>
            <button
              onClick={() => loadTemplate('blank')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'blank' ? 'bg-[#263345] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Em Branco</button>
            <button
              onClick={() => loadTemplate('fiber-radio')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'fiber-radio' ? 'bg-[#263345] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Fibra + Rádio</button>
            <button
              onClick={() => loadTemplate('switch-ap')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'switch-ap' ? 'bg-[#263345] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Switches + APs</button>
            <button
              onClick={() => loadTemplate('3-tier')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === '3-tier' ? 'bg-[#263345] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Web 3-Tier</button>
            <button
              onClick={() => loadTemplate('microservices')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTemplate === 'microservices' ? 'bg-[#263345] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >Microserviços</button>
          </div>

          <div className="flex items-center gap-2 border-l border-[#263345] pl-3">
            <button
              onClick={saveDiagram}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-[#111827] hover:bg-[#263345] border border-[#263345] px-3 py-1.5 rounded-md transition-colors font-medium shadow-sm"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 text-sm text-white bg-[#ff7a00] hover:bg-[#f6b40b] px-4 py-1.5 rounded-md transition-colors font-medium shadow-lg"
            >
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <DiagramSetNodesContext.Provider value={setNodes}>
          <ReactFlow
            nodes={flowNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            colorMode="dark"
            fitView
            className="bg-[#070b16]"
          >
            <Background color="#263345" gap={24} size={2} />
            <Controls className="bg-[#111827] border-[#263345] fill-slate-300" />
            <MiniMap
              nodeColor={(n) => '#ff7a00'}
              maskColor="rgba(15, 23, 42, 0.7)"
              className="bg-[#111827] border border-[#263345] rounded-md"
            />

          <Panel position="top-left" className="bg-[#111827]/90 backdrop-blur-md border border-[#263345] p-3 rounded-md shadow-xl flex flex-col gap-2 max-h-[calc(100vh-100px)] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Componentes</h3>
            <button onClick={() => addNetworkNode('fiber', 'Fibra Óptica', 'Backbone / FO / DIO', 'fiber')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <Cable className="w-4 h-4 text-[#22d3ee]" /> Fibra / DIO
            </button>
            <button onClick={() => addNetworkNode('radio', 'Rádio Enlace', 'PTP / Backhaul', 'radio')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <RadioTower className="w-4 h-4 text-[#f6b40b]" /> Rádio Enlace
            </button>
            <button onClick={() => addNetworkNode('switch', 'Switch', 'Core / Acesso / PoE', 'switch')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <Network className="w-4 h-4 text-[#34d399]" /> Switch
            </button>
            <button onClick={() => addNetworkNode('accessPoint', 'Access Point', 'Wi-Fi / SSID / PoE', 'wifi')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <Wifi className="w-4 h-4 text-[#38bdf8]" /> Access Point
            </button>
            <button onClick={() => addNetworkNode('router', 'Roteador', 'Gateway / WAN', 'router')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <Router className="w-4 h-4 text-[#ff7a00]" /> Roteador
            </button>
            <button onClick={() => addNetworkNode('firewall', 'Firewall', 'Segurança / VPN', 'fortinet')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <Shield className="w-4 h-4 text-[#ff7a00]" /> Firewall
            </button>
            <button onClick={() => addNetworkNode('server', 'Servidor', 'Servidor local / VM', 'server')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <Server className="w-4 h-4 text-[#ff7a00]" /> Servidor
            </button>
            <button onClick={() => addNetworkNode('cloud', 'Cloud Service', 'Cloud / SaaS / DC', 'cloud')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white hover:bg-[#263345] p-2 rounded-lg transition-colors text-left">
              <Cloud className="w-4 h-4 text-[#ff7a00]" /> Cloud
            </button>

            <div className="mt-2 pt-3 border-t border-[#263345] flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tecnologia Específica</h3>
              <input
                type="text"
                placeholder="Ex: React, Docker, AWS"
                className="bg-[#070b16] border border-[#263345] rounded-md px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-[#ff7a00]"
                value={customNodeName}
                onChange={(e) => setCustomNodeName(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === 'Enter') addCustomNode();
                }}
              />
              <button
                onClick={addCustomNode}
                className="bg-[#ff7a00] hover:bg-[#f6b40b] text-white px-2 py-1.5 rounded-md text-sm font-medium transition-colors w-full"
              >
                Adicionar ao Diagrama
              </button>
            </div>

            <div className="mt-2 pt-3 border-t border-[#263345] flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Imagem de Fundo</h3>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={backgroundInputRef}
                onChange={handleBackgroundUpload}
              />
              <button
                onClick={() => backgroundInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#263345] border border-[#263345] text-slate-300 hover:text-white px-2 py-1.5 rounded-md text-sm font-medium transition-colors w-full"
              >
                <ImagePlus className="w-4 h-4" /> Adicionar fundo
              </button>
              {backgroundImage && (
                <>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Opacidade
                    <input
                      type="range"
                      min="0.12"
                      max="0.85"
                      step="0.01"
                      value={backgroundOpacity}
                      onChange={(event) => setBackgroundOpacity(Number(event.target.value))}
                      className="mt-1 w-full accent-[#ff7a00]"
                    />
                  </label>
                  <button
                    onClick={() => setBackgroundImage(null)}
                    className="flex items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" /> Remover fundo
                  </button>
                </>
              )}
              <p className="text-[10px] leading-4 text-slate-500">
                Para imagem de um componente, clique no ícone do próprio componente e envie a foto ou símbolo dele.
              </p>
            </div>
            </Panel>
          </ReactFlow>
        </DiagramSetNodesContext.Provider>
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
