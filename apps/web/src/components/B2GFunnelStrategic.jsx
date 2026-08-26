import React from 'react';

const STAGE_PALETTES = {
  ANALISE: ['#ff4b42', '#db1f25', '#7f1018'],
  PROPOSTA_ENVIADA: ['#ff9950', '#e35d22', '#853013'],
  HABILITACAO: ['#fff4a6', '#e4d66e', '#837934'],
  RECURSO: ['#c0e867', '#83bd38', '#41691d'],
  SUSPENSO: ['#72dc7e', '#40b85c', '#206739'],
  HOMOLOGADO: ['#36d9e5', '#16aaba', '#0d5d69'],
  CONCLUIDO: ['#258bd0', '#125b9c', '#092f5a'],
  GANHO: ['#34d399', '#16a34a', '#14532d'],
  NO_GO: ['#f59e0b', '#d97706', '#78350f'],
  PERDIDO: ['#ef4444', '#b91c1c', '#7f1d1d']
};

const B2GFunnelStrategic = ({ funnelRows = [] }) => {
  const svgWidth = 620;
  const svgHeight = 420;
  const centerX = svgWidth / 2;
  const maxStageWidth = 520;
  const stageHeight = 37;
  const totalCount = funnelRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const maxCount = Math.max(...funnelRows.map((row) => Number(row.count || 0)), 1);
  const funnelData = funnelRows.map((row, index) => ({
    ...row,
    y: 17 + index * 39,
    percentage: totalCount > 0 ? Math.round((Number(row.count || 0) / totalCount) * 100) : 0,
    renderedWidth: Math.max(
      Number(row.count || 0) > 0 ? 190 : 126,
      (Number(row.count || 0) / maxCount) * maxStageWidth
    ),
    palette: STAGE_PALETTES[row.id] || ['#78a9ff', '#4e79da', '#243c7a']
  }));

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-2 py-1">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-full w-full max-w-[760px]" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Funil de licitações B2G em dez etapas">
        <defs>
          {funnelData.map((stage) => (
            <React.Fragment key={stage.id}>
              <linearGradient id={`b2g-front-${stage.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={stage.palette[2]} />
                <stop offset="17%" stopColor={stage.palette[1]} />
                <stop offset="50%" stopColor={stage.palette[0]} />
                <stop offset="83%" stopColor={stage.palette[1]} />
                <stop offset="100%" stopColor={stage.palette[2]} />
              </linearGradient>
              <linearGradient id={`b2g-rim-${stage.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={stage.palette[0]} />
                <stop offset="48%" stopColor={stage.palette[1]} />
                <stop offset="100%" stopColor={stage.palette[2]} />
              </linearGradient>
              <linearGradient id={`b2g-depth-${stage.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#020713" stopOpacity="0.55" />
              </linearGradient>
            </React.Fragment>
          ))}
          <filter id="b2g-stage-shadow" x="-20%" y="-25%" width="140%" height="175%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#01040c" floodOpacity="0.6" />
          </filter>
        </defs>

        {funnelData.map((stage, index) => {
          const nextWidth = funnelData[index + 1]?.renderedWidth || stage.renderedWidth * 0.72;
          const bottomWidth = Math.min(stage.renderedWidth - 10, nextWidth + 12);
          const topLeft = centerX - stage.renderedWidth / 2;
          const topRight = centerX + stage.renderedWidth / 2;
          const bottomLeft = centerX - bottomWidth / 2;
          const bottomRight = centerX + bottomWidth / 2;
          const topY = stage.y;
          const bottomY = topY + stageHeight;
          const percent = Number(stage.percentage || 0);
          const textColor = stage.id === 'HABILITACAO' ? '#27303b' : '#ffffff';

          return (
            <g key={stage.id} filter="url(#b2g-stage-shadow)">
              <title>{`${stage.label}: ${Number(stage.count || 0)} oportunidade${Number(stage.count || 0) === 1 ? '' : 's'}`}</title>
              <path d={`M ${topLeft + 5} ${topY + 2} C ${topLeft + 10} ${topY + 13}, ${bottomLeft - 3} ${bottomY - 12}, ${bottomLeft} ${bottomY - 5} Q ${centerX} ${bottomY + 6} ${bottomRight} ${bottomY - 5} C ${bottomRight + 3} ${bottomY - 12}, ${topRight - 10} ${topY + 13}, ${topRight - 5} ${topY + 2} Z`} fill={`url(#b2g-front-${stage.id})`} stroke={stage.palette[2]} strokeWidth="1.1" />
              <path d={`M ${bottomLeft} ${bottomY - 8} Q ${centerX} ${bottomY + 7} ${bottomRight} ${bottomY - 8} Q ${centerX} ${bottomY + 13} ${bottomLeft} ${bottomY - 8} Z`} fill={`url(#b2g-depth-${stage.id})`} opacity="0.8" />
              <ellipse cx={centerX} cy={topY + 2} rx={stage.renderedWidth / 2} ry="9" fill={`url(#b2g-rim-${stage.id})`} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <ellipse cx={centerX} cy={topY + 3} rx={Math.max(stage.renderedWidth / 2 - 9, 24)} ry="5" fill={stage.palette[2]} opacity="0.7" />
              <path d={`M ${topLeft + 14} ${topY} Q ${centerX} ${topY - 6} ${topRight - 14} ${topY}`} fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.7" opacity="0.34" />
              <text x={centerX} y={topY + 27} textAnchor="middle" fill={textColor} fontFamily="Arial, Segoe UI, sans-serif" fontSize={stage.renderedWidth < 190 ? '12' : stage.renderedWidth < 250 ? '13' : '14'} fontWeight="800" paintOrder="stroke" stroke={textColor === '#ffffff' ? 'rgba(3,8,18,0.34)' : 'transparent'} strokeWidth="1.2">
                {`${stage.label} (${percent}%)`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default B2GFunnelStrategic;
