import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Beaker,
  Building2,
  Calculator,
  CalendarCheck2,
  ChevronDown,
  ClipboardList,
  Coins,
  FileSignature,
  FileSearch,
  FileText,
  Gavel,
  Handshake,
  History,
  Landmark,
  LayoutDashboard,
  Link2,
  Package,
  Palette,
  RefreshCcw,
  Search,
  Settings2,
  Shield,
  Target,
  Trophy,
  Workflow,
  Users
} from 'lucide-react';

import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { getUserAccess, normalizeRole, ROLES, isMaster } from '../utils/permissions';

const SIDEBAR_SCROLL_KEY = 'crm-sidebar-scroll-top';

const resolvePublicUrl = (maybeRelativeUrl) => {
  if (!maybeRelativeUrl) return null;
  if (/^https?:\/\//i.test(maybeRelativeUrl)) return maybeRelativeUrl;

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    const base = API_BASE_URL.replace(/\/api\/?$/i, '');
    return `${base}${maybeRelativeUrl}`;
  }

  return maybeRelativeUrl;
};

export default function Sidebar({ open = false, onOpenChange = () => {} }) {
  const location = useLocation();
  const navRef = useRef(null);
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const role = normalizeRole(user?.role || null);
  const access = getUserAccess(user || {});

  const [branding, setBranding] = useState({ appName: 'CRM NEXOS', logoUrl: null });
  const [expandedSections, setExpandedSections] = useState({
    geral: true,
    b2g: false,
    vendas: false,
    prevendas: false,
    gestao: false,
    automacao: false,
    administracao: false,
    configuracao: false
  });

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.settings, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setBranding({
          appName: data?.appName || 'CRM NEXOS',
          logoUrl: data?.logoUrl || null
        });
      } catch {
        // Best-effort only.
      }
    };
    loadBranding();

    // Listen for branding updates
    const handleBrandingUpdate = (event) => {
      const { appName, logoUrl } = event.detail || {};
      setBranding({
        appName: appName || 'CRM NEXOS',
        logoUrl: logoUrl || null
      });
    };

    window.addEventListener('crm-branding-updated', handleBrandingUpdate);
    return () => window.removeEventListener('crm-branding-updated', handleBrandingUpdate);
  }, []);

  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const menuSections = useMemo(() => ([
    {
      id: 'geral',
      title: 'VISÃO GERAL',
      icon: LayoutDashboard,
      items: [
        { path: '/dashboard-geral', label: 'Dashboard Geral', icon: BarChart3, description: 'Visão consolidada de todos os módulos' },
      ]
    },
    {
      id: 'vendas',
      title: 'B2B PRIVADO',
      icon: Target,
      items: [
        { path: '/dashboard', label: 'Dashboard B2B', icon: BarChart3, description: 'Visao geral do negocio' },
        { path: '/empresas', label: 'Empresas', icon: Building2, description: 'Clientes e prospects' },
        { path: '/oportunidades', label: 'Oportunidades', icon: Target, description: 'Funil e negociacoes' },
        { path: '/atividades', label: 'Atividades', icon: CalendarCheck2, description: 'Tarefas e agenda' },
        { path: '/leads', label: 'Lead', icon: RefreshCcw, description: 'Gestao de leads' },
        { path: '/propostas', label: 'Propostas', icon: FileText, description: 'Cotas e propostas' },
        { path: '/templates-propostas', label: 'Templates', icon: Palette, description: 'Templates de proposta' },
        { path: '/contratos', label: 'Contratos', icon: FileSignature, description: 'Contratos e SLA' }
      ]
    },
    {
      id: 'b2g',
      title: 'B2G GOVERNO',
      icon: Gavel,
      items: [
        { path: '/b2g-dashboard', label: 'Dashboard', icon: BarChart3, description: 'Visão estratégica B2G' },
        { path: '/b2g-orgaos', label: 'Órgãos', icon: Landmark, description: 'Cadastro de órgãos governamentais' },
        { path: '/b2g-portal-busca', label: 'Portal de Busca', icon: Search, description: 'Busca de editais e licitações no PNCP' },
        { path: '/b2g-leads', label: 'Leads', icon: Users, description: 'Órgãos e contas no radar' },
        { path: '/b2g-oportunidades', label: 'Oportunidades', icon: Target, description: 'Pipeline de licitações' },
        { path: '/b2g-analise-editais-tr', label: 'Analise Editais/TR', icon: FileSearch, description: 'Módulo isolado de análise funcional' },
        { path: '/b2g-resumos', label: 'Resumos de Edital', icon: FileText, description: 'Resumo executivo por edital' },
        { path: '/b2g-atas', label: 'Atas de Registro de Preços', icon: Landmark, description: 'Controle de atas RP' },
        { path: '/b2g-atividades', label: 'Atividades', icon: Workflow, description: 'Agenda operacional B2G' },
        { path: '/b2g-documentacao', label: 'Documentação', icon: ClipboardList, description: 'Checklist documental' },
        { path: '/b2g-relatorios', label: 'Relatórios Estratégicos', icon: BarChart3, description: 'Indicadores e decisões' },
        { path: '/b2g-historico', label: 'Histórico', icon: History, description: 'Linha do tempo do edital' }
      ]
    },
    {
      id: 'prevendas',
      title: 'Pre-Vendas',
      icon: ClipboardList,
      items: [
        { path: '/pre-vendas', label: 'Dashboard', icon: LayoutDashboard, description: 'Visao geral pre-vendas' },
        { path: '/solicitacoes', label: 'Solicitacoes', icon: ClipboardList, description: 'Solicitacoes recebidas' },
        { path: '/orcamentos', label: 'Orçamentos', icon: FileText, description: 'Cotações registradas no fluxo' },
        { path: '/prevendas-distribuidores', label: 'Distribuidores', icon: Building2, description: 'Base de distribuidores homologados' },
        { path: '/prevendas-fornecedores', label: 'Fornecedores', icon: Package, description: 'Base de fornecedores homologados' },
        { path: '/prevendas-registro-oportunidades', label: 'Registro de Oportunidades', icon: Target, description: 'Registro técnico para Pré-Vendas' },
        { path: '/calculadoras', label: 'Calculadoras', icon: Calculator, description: 'Venda, locacao e servicos' },
        { path: '/precificacao', label: 'Precificação', icon: Calculator, description: 'DRE, simulador, analytics e rateio' },
        { path: '/ratear-produtos', label: 'Ratear Produtos', icon: Calculator, description: 'Rateio de despesas por produto' },
        { path: '/rateios-salvos', label: 'Rateios Salvos', icon: History, description: 'Historico de rateios executados' },
        { path: '/gestao-pocs', label: 'Gestão de POCs', icon: Beaker, description: 'Planejamento e validação de provas de conceito' }
      ]
    },
    {
      id: 'gestao',
      title: 'Gestao',
      icon: BarChart3,
      items: [
        { path: '/produtos', label: 'Produtos', icon: Package, description: 'Catalogo e itens' },
        { path: '/vendedores', label: 'Vendedores', icon: Users, description: 'Equipe e cadastro' },
        { path: '/comissoes', label: 'Comissoes', icon: Coins, description: 'Pagamentos e regras' },
        { path: '/metas-performance', label: 'Metas & Performance', icon: Trophy, description: 'Metas e indicadores' },
        { path: '/pos-venda', label: 'Pos-Venda', icon: Handshake, description: 'Relacionamento e suporte' },
        { path: '/relatorios', label: 'Relatorios', icon: BarChart3, description: 'Analises e metricas' }
      ]
    },
    {
      id: 'automacao',
      title: 'Automação / Integrações',
      icon: Workflow,
      items: [
        { path: '/automacoes', label: 'Workflows', icon: Workflow, description: 'Regras e automacoes' },
        { path: '/integracoes', label: 'Integracoes', icon: Link2, description: 'APIs e conectores' }
      ]
    },
    {
      id: 'administracao',
      title: 'Administracao',
      icon: Shield,
      items: [
        {
          path: '/administracao',
          label: 'Administracao',
          icon: Shield,
          description: 'Gestao global de empresas, planos e licenciamento (MASTER)'
        }
      ]
    },
    {
      id: 'configuracao',
      title: 'Configuracoes',
      icon: Settings2,
      items: [
        {
          path: '/configuracoes',
          label: 'Configuracoes',
          icon: Shield,
          description: 'Gerencie suas preferências e configurações da empresa'
        },
        { path: '/funcionalidades-avancadas', label: 'Avancado', icon: Settings2, description: 'Configuracoes avancadas' }
      ]
    }
  ]), []);

  const filteredMenuSections = useMemo(() => {
    const master = isMaster(user || {});

    // Master has access to everything. This is the simplest and most reliable check.
    if (master) {
      return menuSections;
    }

    return menuSections
      .map((section) => {
        // The 'administracao' section is MASTER only
        if (section.id === 'administracao') {
          return role === ROLES.MASTER ? section : null;
        }

        if (section.id === 'configuracao') {
          const items = section.items.filter((item) => {
            // ADMIN and MASTER can see settings
            if (item.path === '/configuracoes') return role === ROLES.ADMIN || role === ROLES.MASTER;
            if (item.path === '/funcionalidades-avancadas') return role === ROLES.ADMIN || role === ROLES.MASTER;
            return false;
          });
          return items.length > 0 ? { ...section, items } : null;
        }

        // PRE_SALES role can only see the 'prevendas' section.
        if (role === ROLES.PRE_SALES) {
          return section.id === 'prevendas' ? section : null;
        }

        // Logic for USER and SELLER roles.
        if (role === ROLES.USER || role === ROLES.SELLER) {
          if (section.id === 'geral') return section;
          if (section.id === 'vendas' && access.accessB2B) {
            return {
              ...section,
              items: section.items.filter((item) =>
                ['/dashboard', '/empresas', '/oportunidades', '/atividades', '/leads'].includes(item.path)
              )
            };
          }
          if (section.id === 'b2g' && access.accessB2G) return section;
          if (section.id === 'prevendas' && access.accessPreSales) return section;
          // Deny other sections for these roles.
          return null;
        }

        // DIRECTOR role does not see 'prevendas'.
        if (role === ROLES.DIRECTOR) {
          if (section.id === 'prevendas') return null;
        }

        return section;
      })
      .filter(Boolean)
      .filter((section) => section.items && section.items.length > 0);
  }, [menuSections, role, access.accessB2B, access.accessB2G, access.accessPreSales, user]);

  useEffect(() => {
    const activeSection = filteredMenuSections.find((section) =>
      section.items.some((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
    );

    if (!activeSection) return;

    setExpandedSections((prev) => (
      prev[activeSection.id] ? prev : { ...prev, [activeSection.id]: true }
    ));
  }, [filteredMenuSections, location.pathname]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const restoreScroll = () => {
      const saved = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY));
      if (Number.isFinite(saved)) {
        nav.scrollTop = saved;
      }
    };

    restoreScroll();
    const frame = window.requestAnimationFrame(restoreScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  const toggleSection = (e, section) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const saveSidebarScroll = () => {
    const nav = navRef.current;
    if (nav) {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
    }
  };

  const NavItem = ({ item }) => {
    const Icon = item.icon;

    return (
      <NavLink
        to={item.path}
        title={item.description}
        onClick={saveSidebarScroll}
        className={({ isActive }) => [
          'group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl px-3 py-2.5',
          'border transition-all duration-300 ease-out',
          isActive
            ? 'border-cyan-200/35 bg-gradient-to-r from-cyan-400/35 via-sky-400/22 to-transparent text-white shadow-soft-2xl'
            : 'border-transparent bg-white/[0.02] text-slate-100/85 hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white'
        ].join(' ')}
      >
        {({ isActive }) => (
          <>
            <span
              className={[
                'absolute inset-y-2 left-0 w-1 rounded-r-full transition-opacity duration-300',
                isActive ? 'bg-cyan-200 opacity-100' : 'opacity-0 group-hover:opacity-70 bg-white/60'
              ].join(' ')}
            />

            <span
              className={[
                'relative mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300',
                isActive
                  ? 'border-cyan-100/40 bg-white/[0.16] shadow-[0_8px_20px_rgba(56,189,248,0.35)]'
                  : 'border-white/[0.12] bg-white/[0.07] group-hover:border-white/[0.22] group-hover:bg-white/[0.12]'
              ].join(' ')}
            >
              <Icon className={['h-5 w-5 transition-transform duration-300', isActive ? 'scale-105' : 'group-hover:scale-105'].join(' ')} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-5">{item.label}</span>
              <span className="mt-0.5 block truncate text-xs leading-4 text-slate-300/85">{item.description}</span>
            </span>
          </>
        )}
      </NavLink>
    );
  };

  const SidebarInner = () => (
    <div className="relative z-10 flex h-full flex-col">
      <div className="relative overflow-hidden border-b border-white/12 px-5 py-5">
        <div className="absolute -right-24 -top-20 h-56 w-56 rounded-full bg-cyan-400/18 blur-2xl motion-safe:animate-float" />
        <div className="absolute -left-16 -bottom-24 h-60 w-60 rounded-full bg-blue-500/16 blur-2xl motion-safe:animate-float" />

        <div className="relative flex h-[4.6rem] items-center justify-center rounded-[22px] border border-[#2f8ebc9a] bg-[#103c5d]/80 shadow-[0_18px_42px_-32px_rgba(47,198,255,0.75)]">
          {resolvePublicUrl(branding.logoUrl) ? (
            <img
              src={resolvePublicUrl(branding.logoUrl)}
              alt="Logo"
              className="max-h-12 max-w-[12rem] object-contain"
            />
          ) : (
            <div className="relative flex items-center gap-1.5">
              <div className="absolute -left-6 top-1/2 h-px w-12 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,#f07a2a,#43d8ff)]" />
              <div className="relative h-12 w-20">
                <div className="absolute left-0 top-1 h-10 w-10 rounded-full border-[9px] border-[#1fb5d4]" />
                <div className="absolute left-9 top-1 h-10 w-10 rounded-full border-[9px] border-[#ff9829]" />
                <div className="absolute left-[1.6rem] top-[0.72rem] flex h-8 w-8 items-center justify-center rounded-full bg-[#143956] text-[9px] font-black text-[#dcecff] shadow-inner">
                  AI
                </div>
              </div>
              <div className="-ml-5 text-[13px] font-black tracking-tight text-white">
                ChorstConsult
              </div>
            </div>
          )}
        </div>
      </div>

      <nav
        ref={navRef}
        aria-label="Menu principal"
        onScroll={saveSidebarScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-gutter:stable]"
      >
        {filteredMenuSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = !!expandedSections[section.id];

          return (
            <div key={section.id} className="mb-3 motion-safe:animate-fade-in">
              <button
                type="button"
                onClick={(e) => toggleSection(e, section.id)}
                className={[
                  'w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5',
                  'text-left text-[11px] font-bold uppercase tracking-[0.14em]',
                  'border border-transparent bg-white/[0.02] text-slate-300/90',
                  'transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white'
                ].join(' ')}
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.08]">
                    <SectionIcon className="h-4 w-4" />
                  </span>
                  {section.title}
                </span>

                <ChevronDown
                  className={[
                    'h-4 w-4 text-white/80 transition-transform duration-300',
                    isOpen ? 'rotate-180' : 'rotate-0'
                  ].join(' ')}
                />
              </button>

              <div
                className={[
                  'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-75'
                ].join(' ')}
              >
                <ul className="overflow-hidden space-y-1 px-1 pt-1">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <NavItem item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/12 px-3 py-3">
        <div className="text-center text-[10px] text-slate-300/65">
          <div className="font-semibold">{branding.appName || 'CRM NEXOS'} v2</div>
          <div className="opacity-90">© 2026</div>
        </div>
      </div>
    </div>
  );

  const showOverlay = open;

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-30 bg-slate-950/65 backdrop-blur-sm transition-opacity lg:hidden',
          showOverlay ? 'opacity-100' : 'pointer-events-none opacity-0'
        ].join(' ')}
        onClick={() => onOpenChange(false)}
        aria-hidden={!showOverlay}
      />

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-[312px] max-w-[86vw]',
          'transform transition-transform duration-300 will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-20 lg:max-w-none',
          'flex flex-col overflow-hidden text-white',
          'bg-gradient-to-b from-[#020817] via-[#081226] to-[#10233f]',
          'border-r border-cyan-300/20 shadow-soft-2xl'
        ].join(' ')}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/[0.12] via-transparent to-blue-500/[0.18]" />
          <div className="absolute inset-0 crm-dotgrid opacity-20" />
        </div>

        <SidebarInner />
      </aside>
    </>
  );
}
