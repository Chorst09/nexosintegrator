import React from 'react';

const B2B_STAGES = [
  {
    key: 'LEAD_GENERATION',
    label: 'Geração de Leads',
    width: 100,
    palette: ['#65b4ff', '#367bdc', '#1b3f86']
  },
  {
    key: 'LEAD_QUALIFICATION',
    label: 'Qualificar Leads',
    width: 88,
    palette: ['#69e2a8', '#31b77a', '#166445']
  },
  {
    key: 'PROBLEM_ASSESSMENT',
    label: 'Avaliar Desafios / Problemas',
    width: 76,
    palette: ['#ffd76b', '#eaa522', '#8d5d0e']
  },
  {
    key: 'SOLUTION',
    label: 'Solucionar Problemas',
    width: 64,
    palette: ['#ffad65', '#e87025', '#8c3716']
  },
  {
    key: 'CONVERSION',
    label: 'Converter',
    width: 52,
    palette: ['#ff7c82', '#d94650', '#84232d']
  },
  {
    key: 'CLOSING',
    label: 'Fechar',
    width: 42,
    palette: ['#b184ff', '#7f52e8', '#43268a']
  }
];

const getStageCount = (data, stage, index) => {
  const row = data.find((item) => item?.stage === stage.key || item?.key === stage.key);
  const fallback = data[index];
  const source = row || fallback || {};
  return Number(source?._count?.stage ?? source?.count ?? source?.value ?? 0) || 0;
};

const SalesFunnel = ({ data = [] }) => {
  const svgWidth = 560;
  const svgHeight = 300;
  const centerX = svgWidth / 2;
  const maxStageWidth = 470;
  const stageHeight = 34;
  const stageGap = 9;
  const startY = 20;
  const depthX = 15;
  const depthY = 8;

  return (
    <div className="b2b-funnel-shell relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[#7ec8ff26] px-3 py-2">
      <style>
        {`
          .b2b-funnel-shell {
            background:
              radial-gradient(circle at 24% 18%, rgba(94, 176, 255, 0.22), transparent 30%),
              linear-gradient(125deg, rgba(8, 29, 58, 0.72), rgba(19, 61, 105, 0.74), rgba(9, 25, 54, 0.78));
            background-size: 180% 180%;
            animation: b2bFunnelGradient 9s ease-in-out infinite;
          }

          .b2b-funnel-shell::after {
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

          @keyframes b2bFunnelGradient {
            0%, 100% { background-position: 0% 45%; }
            50% { background-position: 100% 55%; }
          }

          @media (prefers-reduced-motion: reduce) {
            .b2b-funnel-shell { animation: none; }
          }
        `}
      </style>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="relative z-10 h-full max-h-[330px] w-full max-w-[690px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {B2B_STAGES.map((stage) => (
            <linearGradient key={`grad-${stage.key}`} id={`b2b-stage-${stage.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stage.palette[0]} />
              <stop offset="54%" stopColor={stage.palette[1]} />
              <stop offset="100%" stopColor={stage.palette[2]} />
            </linearGradient>
          ))}

          <linearGradient id="b2b-shine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.38)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <filter id="b2b-soft-shadow" x="-20%" y="-40%" width="140%" height="190%">
            <feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#020817" floodOpacity="0.42" />
          </filter>
        </defs>

        {B2B_STAGES.map((stage, index) => {
          const stageWidth = Math.max(142, (stage.width / 100) * maxStageWidth);
          const x = centerX - stageWidth / 2;
          const y = startY + index * (stageHeight + stageGap);
          const labelFill = stage.key === 'PROBLEM_ASSESSMENT' ? '#1a2433' : '#ffffff';
          const label = stage.key === 'PROBLEM_ASSESSMENT' ? 'Avaliar Desafios / Problemas' : stage.label;

          return (
            <g key={stage.key} filter="url(#b2b-soft-shadow)">
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
                fill={`url(#b2b-stage-${stage.key})`}
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="1"
              />
              <rect
                x={x + 12}
                y={y + 4}
                width={Math.max(26, stageWidth - 24)}
                height="6"
                rx="3"
                fill="url(#b2b-shine)"
                opacity="0.62"
              />
              <text
                x={x + 24}
                y={y + 22}
                fill={labelFill}
                fontSize={stage.key === 'PROBLEM_ASSESSMENT' ? '13' : '14'}
                fontWeight="800"
              >
                {label}
              </text>
              <text
                x={x + stageWidth - 22}
                y={y + 22}
                textAnchor="end"
                fill={labelFill}
                fontSize="16"
                fontWeight="900"
              >
                {getStageCount(data, stage, index)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SalesFunnel;
