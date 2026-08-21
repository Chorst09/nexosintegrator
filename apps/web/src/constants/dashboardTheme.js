/**
 * Design System para Dashboards - Arquitetura Senior
 * Paleta de cores baseada em modern dark theme com gradientes e efeitos
 * Inspiração: prints fornecidos com cores vibrantes neon
 */

// ─── PALETA DE CORES PRIMÁRIA ───────────────────────────────────────────────
export const DASHBOARD_COLORS = {
  // Cores de fundo
  background: {
    primary: '#0f0f1e',      // Preto profundo
    secondary: '#1a1a2e',    // Preto com toque azul
    tertiary: '#16213e',     // Azul escuro
    card: 'rgba(26, 26, 46, 0.95)',
    overlay: 'rgba(15, 15, 30, 0.85)'
  },

  // Cores Neon vibrantes (dos prints)
  neon: {
    cyan: '#00d9ff',         // Ciano brilhante
    magenta: '#ff00ff',      // Magenta puro
    pink: '#ff006e',         // Rosa quente
    purple: '#b200ff',       // Roxo elétrico
    blue: '#0080ff',         // Azul elétrico
    green: '#00ff88',        // Verde neon
    yellow: '#ffed00',       // Amarelo vibrante
    orange: '#ff6600'        // Laranja quente
  },

  // Gradientes principais
  gradients: {
    // Fundo de cards
    cardGradient: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
    
    // Gradientes para charts
    chartGradients: {
      blue: 'linear-gradient(135deg, #0080ff 0%, #00d9ff 100%)',
      pink: 'linear-gradient(135deg, #ff006e 0%, #ff00ff 100%)',
      purple: 'linear-gradient(135deg, #b200ff 0%, #ff006e 100%)',
      cyan: 'linear-gradient(135deg, #00d9ff 0%, #00ff88 100%)',
      multi: 'linear-gradient(90deg, #0080ff 0%, #b200ff 25%, #ff006e 50%, #ffed00 75%, #00ff88 100%)'
    },

    // Fundo de temperatura
    temperatureGradient: 'conic-gradient(from 0deg, #00ff88 0deg, #ffed00 90deg, #ff6600 180deg, #ff006e 270deg, #00ff88 360deg)'
  },

  // Paleta de dados - 14 cores para múltiplas séries
  data: {
    product: [
      '#0080ff', '#00d9ff', '#00ff88', '#ffed00',
      '#ff6600', '#ff006e', '#b200ff', '#ff00ff'
    ],
    stage: {
      LEAD_GENERATION: '#65b4ff',
      LEAD_QUALIFICATION: '#69e2a8',
      PROBLEM_ASSESSMENT: '#ffd76b',
      SOLUTION: '#ffad65',
      CONVERSION: '#ff7c82',
      CLOSING: '#b184ff'
    },
    status: {
      excellent: '#00ff88',
      good: '#00d9ff',
      neutral: '#ffed00',
      warning: '#ff6600',
      critical: '#ff006e'
    },
    temperature: {
      0: '#00ff88',    // Frio (verde)
      25: '#00d9ff',   // Morno (ciano)
      50: '#ffed00',   // Quente (amarelo)
      75: '#ff6600',   // Muito quente (laranja)
      100: '#ff006e'   // Crítico (rosa/magenta)
    }
  },

  // Textos
  text: {
    primary: '#ffffff',
    secondary: '#b0b0c0',
    tertiary: '#80809f',
    muted: '#60608f'
  },

  // Bordas e divisores
  border: {
    light: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.12)',
    bright: 'rgba(0, 217, 255, 0.15)'
  }
};

// ─── EFEITOS E SOMBRAS ──────────────────────────────────────────────────────
export const DASHBOARD_EFFECTS = {
  shadows: {
    sm: '0 4px 12px rgba(0, 0, 0, 0.15)',
    md: '0 8px 24px rgba(0, 0, 0, 0.25)',
    lg: '0 16px 48px rgba(0, 0, 0, 0.35)',
    glow: '0 0 20px rgba(0, 217, 255, 0.25)',
    pink: '0 0 20px rgba(255, 0, 110, 0.25)',
    purple: '0 0 30px rgba(178, 0, 255, 0.2)'
  },

  // Backdrop blur para cards
  backdrop: {
    xs: 'backdrop-blur-sm',
    sm: 'backdrop-blur-md',
    md: 'backdrop-blur-lg',
    lg: 'backdrop-blur-xl'
  },

  // Animações CSS
  animations: {
    fadeInUp: 'animate-fade-in-up',
    slideInRight: 'animate-slide-in-right',
    pulse: 'animate-pulse',
    glow: 'animate-glow',
    float: 'animate-float'
  }
};

// ─── CONFIGURAÇÃO DE CHARTS ────────────────────────────────────────────────
export const CHART_CONFIG = {
  defaults: {
    responsive: true,
    maintainAspectRatio: false,
    tension: 0.4,
    backgroundColor: 'transparent'
  },

  options: {
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#b0b0c0',
          font: { size: 11, weight: '500' }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.02)',
          drawBorder: false
        },
        ticks: {
          color: '#b0b0c0',
          font: { size: 11, weight: '500' }
        }
      }
    },

    plugins: {
      legend: {
        labels: {
          color: '#b0b0c0',
          font: { size: 12, weight: '500' },
          padding: 15,
          usePointStyle: true
        }
      },

      tooltip: {
        backgroundColor: 'rgba(15, 15, 30, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#b0b0c0',
        borderColor: 'rgba(0, 217, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        usePointStyle: true,
        boxPadding: 8,
        displayColors: true
      }
    }
  },

  // Templates para diferentes tipos de chart
  templates: {
    lineAreaChart: {
      fill: true,
      borderWidth: 2,
      borderJoinStyle: 'round',
      pointRadius: 4,
      pointBorderWidth: 2,
      pointBackgroundColor: '#0f0f1e',
      pointHoverRadius: 6
    },

    barChart: {
      borderRadius: 8,
      borderSkipped: false,
      shadowBlur: 15,
      shadowColor: 'rgba(0, 0, 0, 0.3)'
    },

    doughnutChart: {
      borderWidth: 2,
      borderColor: '#0f0f1e',
      cutout: '75%'
    }
  }
};

// ─── TAMANHO E ESPAÇAMENTO ─────────────────────────────────────────────────
export const LAYOUT = {
  cardRadius: '16px',
  containerPadding: '24px',
  gridGap: '16px',
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '1024px',
    lg: '1280px',
    xl: '1536px'
  }
};

// ─── TRANSIÇÕES ────────────────────────────────────────────────────────────
export const TRANSITIONS = {
  fast: 'transition-all duration-200',
  normal: 'transition-all duration-300',
  slow: 'transition-all duration-500'
};
