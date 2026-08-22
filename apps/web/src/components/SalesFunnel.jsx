import React from 'react';

const B2B_STAGES = [
  { key: 'LEAD_GENERATION', label: 'Geração de Leads', lines: ['Geração de Leads (0%)'], width: 100, height: 46, palette: ['#ff4b42', '#db1f25', '#7f1018'] },
  { key: 'LEAD_QUALIFICATION', label: 'Qualificar Leads', lines: ['Qualificar Leads (25%)'], width: 86, height: 46, palette: ['#fff4a6', '#e4d66e', '#837934'] },
  { key: 'PROBLEM_ASSESSMENT', label: 'Avaliar Desafios / Problemas', lines: ['Avaliar Desafios / Problemas', '(50%)'], width: 72, height: 53, palette: ['#9ddd50', '#67b934', '#315f1d'] },
  { key: 'SOLUTION', label: 'Solucionar Problemas', lines: ['Solucionar', 'Problemas (75%)'], width: 58, height: 53, palette: ['#36d9e5', '#16aaba', '#0d5d69'] },
  { key: 'CONVERSION', label: 'Converter', lines: ['Converter'], width: 44, height: 46, palette: ['#258bd0', '#125b9c', '#092f5a'] },
  { key: 'CLOSING', label: 'Fechar', lines: ['Fechar', '(100%)'], width: 32, height: 52, palette: ['#a63ce0', '#701bab', '#3d0c65'] }
];

const getStageCount = (data, stage, index) => {
  const row = data.find((item) => item?.stage === stage.key || item?.key === stage.key);
  const source = row || data[index] || {};
  return Number(source?._count?.stage ?? source?.count ?? source?.value ?? 0) || 0;
};

const SalesFunnel = ({ data = [] }) => {
  const svgWidth = 620;
  const svgHeight = 340;
  const centerX = svgWidth / 2;
  const maxStageWidth = 510;
  let currentY = 18;
  const layouts = B2B_STAGES.map((stage, index) => {
    const renderedWidth = (stage.width / 100) * maxStageWidth;
    const bottomWidth = index < B2B_STAGES.length - 1
      ? (B2B_STAGES[index + 1].width / 100) * maxStageWidth + 14
      : renderedWidth * 0.7;
    const layout = { ...stage, y: currentY, renderedWidth, bottomWidth };
    currentY += stage.height + 2;
    return layout;
  });

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-2 py-1">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-full w-full max-w-[760px]" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Funil comercial B2B em seis etapas">
        <defs>
          {layouts.map((stage) => (
            <React.Fragment key={stage.key}>
              <linearGradient id={`b2b-front-${stage.key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={stage.palette[2]} />
                <stop offset="17%" stopColor={stage.palette[1]} />
                <stop offset="50%" stopColor={stage.palette[0]} />
                <stop offset="83%" stopColor={stage.palette[1]} />
                <stop offset="100%" stopColor={stage.palette[2]} />
              </linearGradient>
              <linearGradient id={`b2b-rim-${stage.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={stage.palette[0]} />
                <stop offset="48%" stopColor={stage.palette[1]} />
                <stop offset="100%" stopColor={stage.palette[2]} />
              </linearGradient>
              <linearGradient id={`b2b-depth-${stage.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#020713" stopOpacity="0.55" />
              </linearGradient>
            </React.Fragment>
          ))}
          <filter id="b2b-stage-shadow" x="-20%" y="-25%" width="140%" height="175%">
            <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#01040c" floodOpacity="0.62" />
          </filter>
        </defs>

        {layouts.map((stage, index) => {
          const topLeft = centerX - stage.renderedWidth / 2;
          const topRight = centerX + stage.renderedWidth / 2;
          const bottomLeft = centerX - stage.bottomWidth / 2;
          const bottomRight = centerX + stage.bottomWidth / 2;
          const topY = stage.y;
          const bottomY = topY + stage.height;
          const count = getStageCount(data, stage, index);
          const textColor = stage.key === 'LEAD_QUALIFICATION' ? '#27303b' : '#ffffff';
          const lineHeight = stage.lines.length > 1 ? 17 : 18;
          const textStartY = topY + (stage.height / 2) - ((stage.lines.length - 1) * lineHeight / 2) + 7;

          return (
            <g key={stage.key} filter="url(#b2b-stage-shadow)">
              <title>{`${stage.label}: ${count} oportunidade${count === 1 ? '' : 's'}`}</title>
              <path d={`M ${topLeft + 5} ${topY + 2} C ${topLeft + 10} ${topY + 14}, ${bottomLeft - 3} ${bottomY - 13}, ${bottomLeft} ${bottomY - 5} Q ${centerX} ${bottomY + 7} ${bottomRight} ${bottomY - 5} C ${bottomRight + 3} ${bottomY - 13}, ${topRight - 10} ${topY + 14}, ${topRight - 5} ${topY + 2} Z`} fill={`url(#b2b-front-${stage.key})`} stroke={stage.palette[2]} strokeWidth="1.2" />
              <path d={`M ${bottomLeft} ${bottomY - 8} Q ${centerX} ${bottomY + 8} ${bottomRight} ${bottomY - 8} Q ${centerX} ${bottomY + 15} ${bottomLeft} ${bottomY - 8} Z`} fill={`url(#b2b-depth-${stage.key})`} opacity="0.8" />
              <ellipse cx={centerX} cy={topY + 2} rx={stage.renderedWidth / 2} ry="11" fill={`url(#b2b-rim-${stage.key})`} stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
              <ellipse cx={centerX} cy={topY + 3} rx={Math.max(stage.renderedWidth / 2 - 10, 24)} ry="6" fill={stage.palette[2]} opacity="0.72" />
              <path d={`M ${topLeft + 16} ${topY - 1} Q ${centerX} ${topY - 8} ${topRight - 16} ${topY - 1}`} fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="2" opacity="0.38" />
              <text x={centerX} y={textStartY} textAnchor="middle" fill={textColor} fontFamily="Arial, Segoe UI, sans-serif" fontSize={stage.key === 'PROBLEM_ASSESSMENT' ? '15' : '17'} fontWeight="800" paintOrder="stroke" stroke={textColor === '#ffffff' ? 'rgba(3,8,18,0.34)' : 'transparent'} strokeWidth="1.4">
                {stage.lines.map((line, lineIndex) => <tspan key={line} x={centerX} dy={lineIndex === 0 ? 0 : lineHeight}>{line}</tspan>)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SalesFunnel;
