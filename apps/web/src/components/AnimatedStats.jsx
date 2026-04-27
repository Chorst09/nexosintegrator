import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const AnimatedStats = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'blue',
  trend = null,
  prefix = '',
  suffix = '',
  animate = true,
  onClick = null 
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (animate && typeof value === 'number') {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, animate]);

  const colorClasses = {
    blue: {
      wash: 'from-sky-500/25 via-sky-500/10 to-transparent',
      light: 'from-sky-500/20 to-sky-500/5 dark:from-sky-400/20 dark:to-sky-400/5',
      text: 'text-sky-700 dark:text-sky-200',
      icon: 'text-sky-700 dark:text-sky-200'
    },
    green: {
      wash: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
      light: 'from-emerald-500/20 to-emerald-500/5 dark:from-emerald-400/20 dark:to-emerald-400/5',
      text: 'text-emerald-700 dark:text-emerald-200',
      icon: 'text-emerald-700 dark:text-emerald-200'
    },
    purple: {
      wash: 'from-indigo-500/25 via-indigo-500/10 to-transparent',
      light: 'from-indigo-500/20 to-indigo-500/5 dark:from-indigo-400/20 dark:to-indigo-400/5',
      text: 'text-indigo-700 dark:text-indigo-200',
      icon: 'text-indigo-700 dark:text-indigo-200'
    },
    orange: {
      wash: 'from-orange-500/25 via-orange-500/10 to-transparent',
      light: 'from-orange-500/20 to-orange-500/5 dark:from-orange-400/20 dark:to-orange-400/5',
      text: 'text-orange-700 dark:text-orange-200',
      icon: 'text-orange-700 dark:text-orange-200'
    },
    red: {
      wash: 'from-red-500/25 via-red-500/10 to-transparent',
      light: 'from-red-500/20 to-red-500/5 dark:from-red-400/20 dark:to-red-400/5',
      text: 'text-red-700 dark:text-red-200',
      icon: 'text-red-700 dark:text-red-200'
    },
    yellow: {
      wash: 'from-amber-500/25 via-amber-500/10 to-transparent',
      light: 'from-amber-500/20 to-amber-500/5 dark:from-amber-400/20 dark:to-amber-400/5',
      text: 'text-amber-800 dark:text-amber-200',
      icon: 'text-amber-800 dark:text-amber-200'
    }
  };

  const classes = colorClasses[color] || colorClasses.blue;

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />;
      case 'down':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    switch (trend.direction) {
      case 'up':
        return 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-200 dark:bg-emerald-500/10';
      case 'down':
        return 'text-red-700 bg-red-500/10 dark:text-red-200 dark:bg-red-500/10';
      default:
        return 'text-slate-700 bg-slate-500/10 dark:text-slate-200 dark:bg-slate-500/10';
    }
  };

  return (
    <div 
      className={`
        crm-panel group relative overflow-hidden p-6
        transition-all duration-300 hover:shadow-soft-xl hover:-translate-y-0.5
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className={`absolute inset-0 bg-gradient-to-br ${classes.wash}`}></div>
      </div>
      <div className="absolute inset-0 crm-dotgrid opacity-10"></div>

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--crm-muted)] mb-1">{title}</p>
            <div className="flex items-baseline">
              <p className={`text-3xl font-bold ${classes.text} transition-all duration-300`}>
                {prefix}{typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}{suffix}
              </p>
            </div>
            
            {subtitle && (
              <p className="text-xs text-[var(--crm-muted)] mt-1">{subtitle}</p>
            )}
            
            {trend && (
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${classes.light} border border-white/10 shadow-sm`}>
            <Icon className={`w-6 h-6 ${classes.icon}`} />
          </div>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 motion-safe:group-hover:animate-shine" />
      </div>
    </div>
  );
};

export default AnimatedStats;
