import React from 'react';

// Funil B2G 3D Estratégico - Versão 3.0 - 18 Junho 2026 18:25:00
const B2GFunnelStrategic = ({ funnelRows = [] }) => {
  // Mapear as etapas para cores
  const stageColorMap = {
    'ANALISE': { color: '#5BA3FF', dark: '#1a3d7a' },
    'PROPOSTA_ENVIADA': { color: '#66FF66', dark: '#1a6a1a' },
    'HABILITACAO': { color: '#FFFF00', dark: '#996600' },
    'RECURSO': { color: '#FFB84D', dark: '#994400' },
    'SUSPENSO': { color: '#FF6B6B', dark: '#8B0000' },
    'HOMOLOGADO': { color: '#5BA3FF', dark: '#1a3d7a' },
    'CONCLUIDO': { color: '#9966FF', dark: '#4a0080' },
    'GANHO': { color: '#66FF66', dark: '#1a6a1a' },
    'NO_GO': { color: '#FFB84D', dark: '#994400' },
    'PERDIDO': { color: '#FF6B6B', dark: '#8B0000' }
  };

  // Usar TODAS as etapas do funil
  const funnelData = funnelRows.map((row, idx) => {
    const mapping = stageColorMap[row.id] || { color: '#666666', dark: '#333333' };
    return {
      ...row,
      ...mapping
    };
  });

  const numStages = funnelData.length;
  const svgWidth = 520;
  const svgHeight = 500;
  const funnelStartY = 50;
  const funnelHeight = svgHeight - 100;
  const stageHeight = funnelHeight / numStages;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center py-2 px-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ 
            filter: 'drop-shadow(0 12px 20px rgba(0, 0, 0, 0.5))'
          }}
        >
          <defs>
            {/* Gradientes para cada cor */}
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#5BA3FF', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#2E7FD8', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#1e5aa8', stopOpacity: 1 }} />
            </linearGradient>

            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#66FF66', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#3FD84F', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#2aa030', stopOpacity: 1 }} />
            </linearGradient>

            <linearGradient id="gradYellow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#FFFF00', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#E6A500', stopOpacity: 1 }} />
            </linearGradient>

            <linearGradient id="gradOrange" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#FFB84D', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#FF8C00', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#E67E00', stopOpacity: 1 }} />
            </linearGradient>

            <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#FF6B6B', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#FF4500', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#D63900', stopOpacity: 1 }} />
            </linearGradient>

            <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#9966FF', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#6b21a8', stopOpacity: 1 }} />
            </linearGradient>

            <filter id="shadow3d" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.5" />
            </filter>

            <radialGradient id="lightEffect" cx="50%" cy="0%">
              <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.4)' }} />
              <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0)' }} />
            </radialGradient>
          </defs>

          {/* Setas no topo */}
          <g opacity="0.8">
            <line x1="150" y1="25" x2="150" y2="15" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="150,12 147,20 153,20" fill="#FFD700" />
            
            <line x1="260" y1="22" x2="260" y2="8" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />
            <polygon points="260,5 256,15 264,15" fill="#FFD700" />
            
            <line x1="370" y1="25" x2="370" y2="15" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="370,12 367,20 373,20" fill="#FFD700" />
          </g>

          {/* Renderizar segmentos como trapézios horizontais */}
          {funnelData.map((stage, idx) => {
            // Calcular largura decrescente (funil shape)
            const maxWidth = 420;
            const minWidth = 80;
            const widthDecrement = (maxWidth - minWidth) / Math.max(numStages - 1, 1);
            const topWidth = maxWidth - idx * widthDecrement;
            const bottomWidth = maxWidth - (idx + 1) * widthDecrement;

            const y1 = funnelStartY + idx * stageHeight;
            const y2 = y1 + stageHeight;
            const centerX = svgWidth / 2;

            const x1Left = centerX - topWidth / 2;
            const x1Right = centerX + topWidth / 2;
            const x2Left = centerX - bottomWidth / 2;
            const x2Right = centerX + bottomWidth / 2;

            // Selecionar gradiente baseado no índice
            const gradients = ['gradBlue', 'gradGreen', 'gradYellow', 'gradOrange', 'gradRed', 'gradBlue', 'gradPurple', 'gradGreen', 'gradOrange', 'gradRed'];
            const gradId = gradients[idx % gradients.length];

            const darkColors = ['#1a3d7a', '#1a6a1a', '#996600', '#994400', '#8B0000', '#1a3d7a', '#4a0080', '#1a6a1a', '#994400', '#8B0000'];
            const darkColor = darkColors[idx % darkColors.length];

            return (
              <g key={`stage-${idx}`} filter="url(#shadow3d)">
                {/* Face principal (trapézio) */}
                <path
                  d={`M ${x1Left} ${y1} L ${x1Right} ${y1} L ${x2Right} ${y2} L ${x2Left} ${y2} Z`}
                  fill={`url(#${gradId})`}
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Face lateral direita 3D - mais pronunciada */}
                <path
                  d={`M ${x1Right} ${y1} L ${x1Right + 10} ${y1 + 3} L ${x2Right + 10} ${y2 + 3} L ${x2Right} ${y2} Z`}
                  fill={darkColor}
                  opacity="0.7"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="0.5"
                />

                {/* Face lateral inferior 3D */}
                <path
                  d={`M ${x2Left} ${y2} L ${x2Right} ${y2} L ${x2Right + 10} ${y2 + 3} L ${x2Left - 5} ${y2 + 3} Z`}
                  fill={darkColor}
                  opacity="0.5"
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="0.5"
                />

                {/* Brilho superior */}
                <ellipse 
                  cx={(x1Left + x1Right) / 2} 
                  cy={y1 + 2} 
                  rx={topWidth / 2 - 15} 
                  ry="2.5" 
                  fill="url(#lightEffect)" 
                  opacity="0.4" 
                />
                
                {/* Texto - Nome da etapa */}
                <text 
                  x={(x1Left + x1Right) / 2} 
                  y={y1 + stageHeight / 2 + 2}
                  textAnchor="middle" 
                  fill={stage.label.includes('Amarelo') || stage.label.includes('Habilitação') ? 'rgba(0,0,0,0.85)' : 'white'}
                  fontSize="11"
                  fontWeight="bold"
                  className="truncate"
                >
                  {stage.label}
                </text>
                
                {/* Texto - Contagem */}
                <text 
                  x={x2Right - 5}
                  y={y2 - 2}
                  textAnchor="end"
                  fill={stage.label.includes('Amarelo') || stage.label.includes('Habilitação') ? 'rgba(0,0,0,0.85)' : 'white'}
                  fontSize="10"
                  fontWeight="bold"
                >
                  {stage.count}
                </text>
              </g>
            );
          })}

          {/* Moedas na base */}
          <g opacity="0.8">
            <circle cx="110" cy="470" r="7" fill="#FFD700" filter="url(#shadow3d)" />
            <circle cx="110" cy="470" r="6.5" fill="#FFC700" />
            <text x="110" y="473" textAnchor="middle" fontSize="9" fill="#8B6914">$</text>

            <circle cx="260" cy="490" r="11" fill="#FFD700" filter="url(#shadow3d)" />
            <circle cx="260" cy="490" r="10.5" fill="#FFC700" />
            <text x="260" y="494" textAnchor="middle" fontSize="13" fill="#8B6914">$</text>

            <circle cx="410" cy="470" r="7" fill="#FFD700" filter="url(#shadow3d)" />
            <circle cx="410" cy="470" r="6.5" fill="#FFC700" />
            <text x="410" y="473" textAnchor="middle" fontSize="9" fill="#8B6914">$</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default B2GFunnelStrategic;
