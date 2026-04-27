export const ROLES = {
  MASTER: 'MASTER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  DIRECTOR: 'DIRECTOR',
  SELLER: 'SELLER',
  USER: 'USER',
  PRE_SALES: 'PRE_SALES'
};

export const ROLE_POLICY_MODULES = [
  {
    key: 'dashboard',
    label: 'Painel de Controle',
    description: 'Visão executiva geral e indicadores do funil.'
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'Cadastro e acompanhamento de novos leads corporativos.'
  },
  {
    key: 'opportunities',
    label: 'Oportunidades',
    description: 'Cadastro e acompanhamento de oportunidades corporativas.'
  },
  {
    key: 'publicOpportunities',
    label: 'Busca de Oportunidades Públicas',
    description: 'Monitoramento de editais e licitações em fontes públicas.'
  },
  {
    key: 'ownOpportunitiesOnly',
    label: 'Somente suas oportunidades',
    description: 'Quando ativo, o usuário vê apenas oportunidades criadas por ele.'
  },
  {
    key: 'manufacturerRegistry',
    label: 'Registro no Fabricante',
    description: 'Gestão de deal registration com fabricantes.'
  },
  {
    key: 'documentation',
    label: 'Documentação',
    description: 'Controle de documentos e validações.'
  },
  {
    key: 'strategicReports',
    label: 'Relatórios Estratégicos',
    description: 'Análises, desempenho e inteligência comercial.'
  }
];

export const ROLE_ACCESS_POLICY = {
  [ROLES.USER]: {
    dashboard: true,
    leads: true,
    opportunities: true,
    publicOpportunities: false,
    ownOpportunitiesOnly: true,
    manufacturerRegistry: true,
    documentation: true,
    strategicReports: true,
    administration: false,
    accessB2B: true,
    accessB2G: false,
    accessPreSales: false
  },
  [ROLES.PRE_SALES]: {
    dashboard: true,
    leads: true,
    opportunities: true,
    publicOpportunities: false,
    ownOpportunitiesOnly: true,
    manufacturerRegistry: false,
    documentation: false,
    strategicReports: false,
    administration: false,
    accessB2B: false,
    accessB2G: false,
    accessPreSales: true
  },
  [ROLES.ADMIN]: {
    dashboard: true,
    leads: true,
    opportunities: true,
    publicOpportunities: true,
    ownOpportunitiesOnly: false,
    manufacturerRegistry: true,
    documentation: true,
    strategicReports: true,
    administration: false, // ADMIN não tem acesso à administração MASTER
    accessB2B: true,
    accessB2G: true,
    accessPreSales: true
  },
  [ROLES.MASTER]: {
    dashboard: true,
    leads: true,
    opportunities: true,
    publicOpportunities: true,
    ownOpportunitiesOnly: false,
    manufacturerRegistry: true,
    documentation: true,
    strategicReports: true,
    administration: true, // Apenas MASTER tem acesso à administração
    accessB2B: true,
    accessB2G: true,
    accessPreSales: true
  }
};

export const toCanonicalRole = (role) => {
  const raw = String(role || '').trim().toUpperCase();
  if (!raw) return ROLES.USER;
  if (raw === 'PRE-VENDAS' || raw === 'PREVENDAS') return ROLES.PRE_SALES;
  if (raw === 'USUARIO') return ROLES.USER;
  if (raw === ROLES.MANAGER || raw === ROLES.DIRECTOR || raw === 'GERENTE') return ROLES.ADMIN;
  if (raw === ROLES.SELLER || raw === 'VENDEDOR') return ROLES.USER;
  if (raw === ROLES.MASTER || raw === ROLES.ADMIN || raw === ROLES.USER || raw === ROLES.PRE_SALES) return raw;
  return ROLES.USER;
};

export const normalizeRole = (value) => {
  return toCanonicalRole(value);
};

export const roleLabel = (role) => {
  const normalized = toCanonicalRole(role);
  const labels = {
    [ROLES.MASTER]: 'Master',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.MANAGER]: 'Gestor',
    [ROLES.DIRECTOR]: 'Diretoria',
    [ROLES.SELLER]: 'Vendas',
    [ROLES.USER]: 'User',
    [ROLES.PRE_SALES]: 'Pre-Vendas'
  };

  return labels[normalized] || normalized;
};

export const isMaster = (user) => normalizeRole(user?.role) === ROLES.MASTER;

export const getRolePolicy = (role) => {
  const canonical = toCanonicalRole(role);
  return ROLE_ACCESS_POLICY[canonical] || ROLE_ACCESS_POLICY[ROLES.USER];
};

export const getUserAccess = (user = {}) => {
  const role = toCanonicalRole(user.role);
  const policy = getRolePolicy(role);

  if (role === ROLES.USER) {
    const accessB2B = user.accessB2B !== undefined ? Boolean(user.accessB2B) : policy.accessB2B;
    const accessB2G = user.accessB2G !== undefined ? Boolean(user.accessB2G) : policy.accessB2G;
    return { accessB2B, accessB2G, accessPreSales: policy.accessPreSales };
  }

  return {
    accessB2B: policy.accessB2B,
    accessB2G: policy.accessB2G,
    accessPreSales: policy.accessPreSales
  };
};

export const moduleFromPath = (pathname = '') => {
  const path = String(pathname || '').toLowerCase();

  if (path.startsWith('/administracao')) {
    return 'ADMINISTRATION';
  }
  if (path.startsWith('/configuracoes')) {
    return 'SETTINGS';
  }

  if (
    path.startsWith('/pre-vendas') ||
    path.startsWith('/solicitacoes') ||
    path.startsWith('/orcamentos') ||
    path.startsWith('/prevendas-distribuidores') ||
    path.startsWith('/prevendas-fornecedores') ||
    path.startsWith('/prevendas-registro-oportunidades') ||
    path.startsWith('/prevendas-cadastros') ||
    path.startsWith('/calculadoras')
  ) {
    return 'PRE_SALES';
  }

  if (path.startsWith('/b2g-')) {
    return 'B2G';
  }

  if (['/login', '/'].includes(path)) return null;

  return 'B2B';
};

export const canAccessModule = (user, moduleName) => {
  if (!user) return false;
  if (isMaster(user)) return true;

  const role = toCanonicalRole(user.role);
  const policy = getRolePolicy(role);
  const mod = String(moduleName || '').toUpperCase();
  if (mod === 'ADMINISTRATION') return Boolean(policy.administration);
  if (mod === 'SETTINGS') {
    return role === ROLES.ADMIN || role === ROLES.MASTER;
  }

  const access = getUserAccess(user);
  if (mod === 'B2B') return access.accessB2B;
  if (mod === 'B2G') return access.accessB2G;
  if (mod === 'PRE_SALES') return access.accessPreSales;

  return false;
};

export const normalizeAllowedRoles = (allowedRoles = []) => {
  return (allowedRoles || []).map((item) => toCanonicalRole(item));
};

export const roleSatisfiesAllowed = (userRole, allowedRoles = []) => {
  const role = toCanonicalRole(userRole);
  const normalizedAllowed = normalizeAllowedRoles(allowedRoles);

  if (normalizedAllowed.length === 0) return true;
  if (role === ROLES.MASTER) return true;
  if (normalizedAllowed.includes(role)) return true;

  return false;
};
