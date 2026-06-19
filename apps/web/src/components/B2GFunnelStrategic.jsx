import React from 'react';

const STAGE_PALETTES = {
  ANALISE: ['#ff5d7d', '#d73958', '#8f1f39'],
  PROPOSTA_ENVIADA: ['#ffd15f', '#e79d12', '#99640b'],
  HABILITACAO: ['#8be3a4', '#5fb97e', '#27653e'],
  RECURSO: ['#82d7f5', '#52acd2', '#236680'],
  SUSPENSO: ['#c8d2e2', '#9daac0', '#596579'],
  HOMOLOGADO: ['#7da2ff', '#5478e7', '#253b8e'],
  CONCLUIDO: ['#9474ff', '#6a4de4', '#3d238c'],
  GANHO: ['#82dd8c', '#64bd70', '#276335'],
  NO_GO: ['#f4c34f', '#d99a1e', '#84540d'],
  PERDIDO: ['#ef6a5d', '#bf3f36', '#73241f']
};

const B2GFunnelStrategic = ({ funnelRows = [] }) => {
  const funnelData = funnelRows.map((row) => ({
    ...row,
    palette: STAGE_PALETTES[row.id] || ['#78a9ff', '#4e79da', '#243c7a']
  }));

  const svgWidth = 560;
  const svgHeight = 410;
  const centerX = svgWidth / 2;
  const maxStageWidth = 480;
  const stageHeight = 32;
  const stageGap = 7;
  const startY = 20;
  const depthX = 15;
  const depthY = 8;

  return (
    <div className="b2g-funnel-shell relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[#7ec8ff26] px-3 py-2">
      <style>
        {`
          .b2g-funnel-shell {
            background:
              radial-gradient(circle at 24% 18%, rgba(102, 215, 234, 0.22), transparent 30%),
              linear-gradient(125deg, rgba(8, 29, 58, 0.72), rgba(18, 58, 103, 0.74), rgba(9, 25, 54, 0.78));
            background-size: 180% 180%;
            animation: b2gFunnelGradient 9s ease-in-out infinite;
          }

          .b2g-funnel-shell::after {
            position: absolute;
            inset: 12px;
            content: '';
            border-radius: 14px;
            background:
              linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent),
              repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 16px);
            opacity: 0.65;
            pointer-events: none;
          }

          @keyframes b2gFunnelGradient {
            0%, 100% { background-position: 0% 45%; }
            50% { background-position: 100% 55%; }
          }

          @media (prefers-reduced-motion: reduce) {
            .b2g-funnel-shell { animation: none; }
          }
        `}
      </style>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="relative z-10 h-full max-h-[390px] w-full max-w-[700px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {funnelData.map((stage) => (
            <linearGradient key={`grad-${stage.id}`} id={`b2g-stage-${stage.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stage.palette[0]} />
              <stop offset="54%" stopColor={stage.palette[1]} />
              <stop offset="100%" stopColor={stage.palette[2]} />
            </linearGradient>
          ))}

          <linearGradient id="b2g-shine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.38)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <filter id="b2g-soft-shadow" x="-20%" y="-40%" width="140%" height="190%">
            <feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#020817" floodOpacity="0.42" />
          </filter>
        </defs>

        {funnelData.map((stage, idx) => {
          const stageWidth = Math.max(132, (Number(stage.width) / 100) * maxStageWidth);
          const x = centerX - stageWidth / 2;
          const y = startY + idx * (stageHeight + stageGap);
          const labelFill = stage.id === 'HABILITACAO' || stage.id === 'NO_GO' ? '#1a2433' : '#ffffff';

          return (
            <g key={stage.id} filter="url(#b2g-soft-shadow)">
              <path
                d={`M ${x + stageWidth - 10} ${y + depthY} L ${x + stageWidth + depthX} ${y + depthY + 4} L ${x + stageWidth + depthX} ${y + stageHeight + depthY - 8} L ${x + stageWidth - 10} ${y + stageHeight} Z`}
                fill={stage.palette[2]}
                opacity="0.72"
              />
              <path
                d={`M ${x + 12} ${y + stageHeight - 3} L ${x + stageWidth - 12} ${y + stageHeight - 3} L ${x + stageWidth + depthX - 2} ${y + stageHeight + depthY} L ${x + depthX + 2} ${y + stageHeight + depthY} Z`}
                fill={stage.palette[2]}
                opacity="0.55"
              />
              <rect
                x={x}
                y={y}
                width={stageWidth}
                height={stageHeight}
                rx="13"
                fill={`url(#b2g-stage-${stage.id})`}
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="1"
              />
              <rect
                x={x + 12}
                y={y + 4}
                width={Math.max(26, stageWidth - 24)}
                height="6"
                rx="3"
                fill="url(#b2g-shine)"
                opacity="0.62"
              />
              <text
                x={x + 24}
                y={y + 21}
                fill={labelFill}
                fontSize="14"
                fontWeight="800"
              >
                {stage.label}
              </text>
              <text
                x={x + stageWidth - 22}
                y={y + 21}
                textAnchor="end"
                fill={labelFill}
                fontSize="16"
                fontWeight="900"
              >
                {stage.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default B2GFunnelStrategic;
