import { Menu, Monitor, Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { useLocation } from 'react-router-dom';

const ROUTE_META = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Visao geral e indicadores' },
  '/empresas': { title: 'Empresas', subtitle: 'Clientes, prospects e contatos' },
  '/oportunidades': { title: 'Pipeline', subtitle: 'Kanban, negociacoes e previsao' },
  '/atividades': { title: 'Atividades', subtitle: 'Tarefas, follow-ups e agenda' },
  '/produtos': { title: 'Produtos', subtitle: 'Catalogo e precificacao' },
  '/propostas': { title: 'Propostas', subtitle: 'Cotas, templates e aprovacao' },
  '/contratos': { title: 'Contratos', subtitle: 'SLA, anexos e ciclo de vida' },
  '/pos-venda': { title: 'Pos-venda', subtitle: 'Onboarding e suporte' },
  '/comissoes': { title: 'Comissoes', subtitle: 'Pagamentos e metas' },
  '/vendedores': { title: 'Vendedores', subtitle: 'Equipe e performance' },
  '/relatorios': { title: 'Relatorios', subtitle: 'Analises e metricas' },
  '/integracoes': { title: 'Integracoes', subtitle: 'APIs e conectores' },
  '/configuracoes': {
    title: 'Configuracoes',
    subtitle: 'Gerencie suas preferências de conta e configurações da empresa'
  },
  '/administracao': { title: 'Administracao', subtitle: 'Usuarios, roles, empresas e licenciamento' },
  '/pre-vendas': { title: 'Pre-Vendas', subtitle: 'Painel operacional' },
  '/solicitacoes': { title: 'Solicitacoes', subtitle: 'Fila de entrada comercial' },
  '/orcamentos': { title: 'Orçamentos', subtitle: 'Cotações consolidadas do Pré-Vendas' },
  '/prevendas-distribuidores': { title: 'Distribuidores', subtitle: 'Base operacional de distribuidores do Pré-Vendas' },
  '/prevendas-fornecedores': { title: 'Fornecedores', subtitle: 'Base operacional de fornecedores do Pré-Vendas' },
  '/prevendas-registro-oportunidades': { title: 'Registro de Oportunidades', subtitle: 'Registro técnico de oportunidades do Pré-Vendas' },
  '/prevendas-cadastros': { title: 'Cadastros Pré-Vendas', subtitle: 'Distribuidores, fornecedores e registro de oportunidades' },
  '/calculadoras': { title: 'Calculadoras', subtitle: 'Simulacoes e precos' },
  '/leads': { title: 'Lead Management', subtitle: 'Qualificacao e distribuicao' },
  '/b2g-editais': { title: 'B2G GOVERNO', subtitle: 'Operação comercial B2G' },
  '/b2g-dashboard': { title: 'B2G Dashboard', subtitle: 'Visao executiva dos editais e pipeline público' },
  '/b2g-leads': { title: 'B2G Leads', subtitle: 'Orgaos e contas priorizadas por potencial' },
  '/b2g-oportunidades': { title: 'B2G Oportunidades', subtitle: 'Funil de licitações e previsibilidade de receita' },
  '/b2g-analise': { title: 'B2G Análise com AI', subtitle: 'Análise técnica de edital e TR com recomendação GO/NO-GO' },
  '/b2g-resumos': { title: 'B2G Resumos de Edital', subtitle: 'Resumos executivos para decisão rápida' },
  '/b2g-atas': { title: 'B2G Atas RP', subtitle: 'Monitoramento de atas de registro de preços' },
  '/b2g-atividades': { title: 'B2G Atividades', subtitle: 'Acompanhamento operacional e follow-ups' },
  '/b2g-documentacao': { title: 'B2G Documentação', subtitle: 'Gestão de checklist e conformidade documental' },
  '/b2g-relatorios': { title: 'B2G Relatórios Estratégicos', subtitle: 'Indicadores para direcionamento comercial' },
  '/b2g-historico': { title: 'B2G Histórico', subtitle: 'Timeline completa dos eventos do edital' }
};

export default function Topbar({ onMenuClick }) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const meta = ROUTE_META[location.pathname] || { title: 'CRM NEXOS', subtitle: 'Conexões que impulsionam negócios' };
  const modeLabel = theme === 'system' ? 'Sistema' : resolvedTheme === 'dark' ? 'Escuro' : 'Claro';

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 lg:px-6 lg:pt-5">
      <div className="relative overflow-hidden rounded-3xl border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-rgb)_/_0.62)] shadow-soft-xl backdrop-blur-2xl dark:bg-[rgb(var(--crm-surface-rgb)_/_0.55)]">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.08] via-transparent to-sky-500/[0.10] dark:from-cyan-400/[0.14] dark:via-transparent dark:to-blue-500/[0.18]" />
        <div className="absolute inset-0 crm-dotgrid opacity-15" />

        <div className="relative mx-auto flex h-[4.5rem] max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden crm-btn crm-btn-secondary h-10 w-10 rounded-2xl p-0"
              aria-label="Abrir menu"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[rgb(var(--crm-accent-rgb))]" />
                <div className="truncate text-sm font-bold text-[var(--crm-ink)] sm:text-base">{meta.title}</div>
              </div>
              <div className="truncate text-xs text-[var(--crm-muted)]">{meta.subtitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center rounded-full border border-[color:var(--crm-border)] bg-[rgb(var(--crm-surface-rgb)_/_0.55)] px-2.5 py-1 text-[11px] font-semibold text-[var(--crm-muted)]">
              Tema {modeLabel}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              className="crm-btn crm-btn-secondary h-10 px-3"
              title={`Tema: ${theme} (ativo: ${resolvedTheme})`}
              aria-label="Alternar tema (claro/escuro/sistema)"
            >
              {theme === 'system' ? (
                <Monitor className="h-4 w-4" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{modeLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
