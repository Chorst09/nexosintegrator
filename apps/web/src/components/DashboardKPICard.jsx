/**
 * KPI Card Avançado para Dashboards
 * Arquitetura: Senior - Com efeitos neon, gradientes e animações
 */

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { DASHBOARD_COLORS, TRANSITIONS } from '../constants/dashboardTheme';
import '../styles/dashboardEffects.css';

const DashboardKPICard = ({
  title,
  value,
  unit = '',
  trend = null,
  trendLabel = '',
  status = 'neutral',
  icon: Icon = null,
  colorTheme = 'cyan',
  showChart = false,
  sparklineData = [],
  isAnimated = true,
  subtitle = '',
  onClick = null
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = Number(value || 0);

  // Animação de contagem para números
  useEffect(() => {
    if (!isAnimated) {
      setDisplayValue(numericValue);
      return;
    }

    let current = 0;
    const increment = numericValue / 50;
    const interval = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(interval);
      } else {
        setDisplayValue(current);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [numericValue, isAnimated]);

  // Determinar cores baseado no tema
  const colorMap = {
    cyan: DASHBOARD_COLORS.neon.cyan,
    magenta: DASHBOARD_COLORS.neon.magenta,
    pink: DASHBOARD_COLORS.neon.pink,
    purple: DASHBOARD_COLORS.neon.purple,
    blue: DASHBOARD_COLORS.neon.blue,
    green: DASHBOARD_COLORS.neon.green,
    yellow: DASHBOARD_COLORS.neon.yellow,
    orange: DASHBOARD_COLORS.neon.orange
  };

  const color = colorMap[colorTheme] || colorMap.cyan;

  const statusConfig = {
    positive: { icon: TrendingUp, color: DASHBOARD_COLORS.neon.green },
    negative: { icon: TrendingDown, color: DASHBOARD_COLORS.neon.pink },
    warning: { icon: AlertCircle, color: DASHBOARD_COLORS.neon.orange },
    success: { icon: CheckCircle, color: DASHBOARD_COLORS.neon.green },
    neutral: { icon: null, color: DASHBOARD_COLORS.neon.cyan }
  };

  const StatusIcon = statusConfig[status]?.icon;
  const statusColor = statusConfig[status]?.color;

  const formatValue = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return Math.round(val).toLocaleString('pt-BR');
  };

  return (
    <div
      onClick={onClick}
      className={`
        dashboard-card group relative overflow-hidden p-6
        ${onClick ? 'cursor-pointer' : ''}
        ${isAnimated ? 'animate-fade-in-up' : ''}
      `}
      style={{
        borderColor: `${color}20`,
        '--tw-shadow-color': `${color}15`
      }}
    >
      {/* Fundo com gradiente animado */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at top-right, ${color}15, transparent)`
        }}
      />

      {/* Brilho neon no hover */}
      <div
        className="absolute -top-1/2 -right-1/2 h-full w-full rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle, ${color}, transparent)`,
          animation: 'float 6s ease-in-out infinite'
        }}
      />

      {/* Conteúdo */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {title}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          {Icon && (
            <div
              className="p-2 rounded-lg transition-all duration-300"
              style={{
                backgroundColor: `${color}15`,
                border: `1px solid ${color}30`
              }}
            >
              <Icon
                size={20}
                style={{ color }}
                className="group-hover:animate-float"
              />
            </div>
          )}
        </div>

        {/* Valor Principal */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-bold tracking-tight"
              style={{
                color,
                textShadow: `0 0 20px ${color}40`
              }}
            >
              {formatValue(displayValue)}
            </span>
            {unit && (
              <span className="text-sm font-medium text-slate-400">
                {unit}
              </span>
            )}
          </div>
        </div>

        {/* Trend e Status */}
        <div className="flex items-center justify-between">
          {trend !== null && (
            <div className="flex items-center gap-2">
              {StatusIcon && (
                <StatusIcon size={16} style={{ color: statusColor }} />
              )}
              <span
                className="text-xs font-semibold"
                style={{ color: statusColor }}
              >
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
              {trendLabel && (
                <span className="text-xs text-slate-500">{trendLabel}</span>
              )}
            </div>
          )}

          {/* Sparkline simples */}
          {showChart && sparklineData.length > 0 && (
            <svg width="60" height="24" className="opacity-60">
              <polyline
                points={sparklineData
                  .map(
                    (val, idx) =>
                      `${(idx / (sparklineData.length - 1)) * 60},${24 - (val / Math.max(...sparklineData)) * 24}`
                  )
                  .join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Efeito de borda neon no hover */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          border: `2px solid transparent`,
          backgroundImage: `linear-gradient(95deg, ${DASHBOARD_COLORS.background.card}, ${DASHBOARD_COLORS.background.card}), linear-gradient(95deg, ${color}40, ${color}20)`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box'
        }}
      />
    </div>
  );
};

export default DashboardKPICard;
