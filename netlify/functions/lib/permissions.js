const ROLE_ACCESS_DEFAULTS = {
  MASTER: { accessB2B: true, accessB2G: true, accessPreSales: true },
  ADMIN: { accessB2B: true, accessB2G: true, accessPreSales: true },
  MANAGER: { accessB2B: true, accessB2G: true, accessPreSales: true },
  DIRECTOR: { accessB2B: true, accessB2G: true, accessPreSales: false },
  SELLER: { accessB2B: true, accessB2G: true, accessPreSales: false },
  USER: { accessB2B: true, accessB2G: false, accessPreSales: false },
  PRE_SALES: { accessB2B: false, accessB2G: false, accessPreSales: true }
};

const ROLE_PERMISSION_TEMPLATES = {
  MASTER: {
    dashboard: true,
    leads: true,
    oportunidades: true,
    buscaOportunidadesPublicas: true,
    somenteSuasOportunidades: false,
    registroNoFabricante: true,
    documentacao: true,
    relatoriosEstrategicos: true,
    historico: true,
    precificacao: true,
    administracaoLicenciamento: true,
    administracaoUsuarios: true,
    billing: true,
    integrations: true
  },
  ADMIN: {
    dashboard: true,
    leads: true,
    oportunidades: true,
    buscaOportunidadesPublicas: true,
    somenteSuasOportunidades: false,
    registroNoFabricante: true,
    documentacao: true,
    relatoriosEstrategicos: true,
    historico: true,
    precificacao: true,
    administracaoLicenciamento: true,
    administracaoUsuarios: true,
    billing: true,
    integrations: true
  },
  USER: {
    dashboard: true,
    leads: true,
    oportunidades: true,
    buscaOportunidadesPublicas: true,
    somenteSuasOportunidades: true,
    registroNoFabricante: true,
    documentacao: true,
    relatoriosEstrategicos: true,
    historico: true,
    precificacao: false,
    administracaoLicenciamento: false,
    administracaoUsuarios: false,
    billing: false,
    integrations: false
  },
  PRE_SALES: {
    dashboard: true,
    leads: true,
    oportunidades: true,
    buscaOportunidadesPublicas: false,
    somenteSuasOportunidades: true,
    registroNoFabricante: false,
    documentacao: false,
    relatoriosEstrategicos: false,
    historico: false,
    precificacao: true,
    administracaoLicenciamento: false,
    administracaoUsuarios: false,
    billing: false,
    integrations: false
  },
  MANAGER: {
    dashboard: true,
    leads: true,
    oportunidades: true,
    buscaOportunidadesPublicas: true,
    somenteSuasOportunidades: false,
    registroNoFabricante: true,
    documentacao: true,
    relatoriosEstrategicos: true,
    historico: true,
    precificacao: true,
    administracaoLicenciamento: false,
    administracaoUsuarios: true,
    billing: false,
    integrations: true
  },
  DIRECTOR: {
    dashboard: true,
    leads: true,
    oportunidades: true,
    buscaOportunidadesPublicas: true,
    somenteSuasOportunidades: false,
    registroNoFabricante: true,
    documentacao: true,
    relatoriosEstrategicos: true,
    historico: true,
    precificacao: false,
    administracaoLicenciamento: false,
    administracaoUsuarios: false,
    billing: false,
    integrations: false
  },
  SELLER: {
    dashboard: true,
    leads: true,
    oportunidades: true,
    buscaOportunidadesPublicas: true,
    somenteSuasOportunidades: true,
    registroNoFabricante: true,
    documentacao: true,
    relatoriosEstrategicos: true,
    historico: true,
    precificacao: false,
    administracaoLicenciamento: false,
    administracaoUsuarios: false,
    billing: false,
    integrations: false
  }
};

export function normalizeRole(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'PRE-VENDAS' || raw === 'PREVENDAS') return 'PRE_SALES';
  if (raw === 'USUARIO') return 'USER';
  return raw || 'USER';
}

export function getRoleAccessDefaults(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_ACCESS_DEFAULTS[normalizedRole] || ROLE_ACCESS_DEFAULTS.USER;
}

export function resolveUserAccess(role, inputAccess = {}) {
  const normalizedRole = normalizeRole(role);
  const base = getRoleAccessDefaults(normalizedRole);

  if (normalizedRole === 'MASTER' || normalizedRole === 'ADMIN') {
    return { ...base };
  }

  if (normalizedRole === 'PRE_SALES') {
    return { accessB2B: false, accessB2G: false, accessPreSales: true };
  }

  const accessB2B = inputAccess.accessB2B !== undefined ? Boolean(inputAccess.accessB2B) : base.accessB2B;
  const accessB2G = inputAccess.accessB2G !== undefined ? Boolean(inputAccess.accessB2G) : base.accessB2G;
  const accessPreSales = inputAccess.accessPreSales !== undefined ? Boolean(inputAccess.accessPreSales) : base.accessPreSales;

  if (normalizedRole === 'USER' && !accessB2B && !accessB2G) {
    return { accessB2B: true, accessB2G: false, accessPreSales: false };
  }

  return {
    accessB2B,
    accessB2G,
    accessPreSales
  };
}

export function isMaster(user = {}) {
  return normalizeRole(user.actualRole || user.role) === 'MASTER';
}

export function canManageLicensing(user = {}) {
  const role = normalizeRole(user.actualRole || user.role);
  return role === 'MASTER' || role === 'ADMIN';
}

export function canAccessModule(user = {}, moduleName) {
  if (!user) return false;
  if (isMaster(user)) return true;

  const role = normalizeRole(user.actualRole || user.role);
  const moduleUpper = String(moduleName || '').trim().toUpperCase();

  if (role === 'ADMIN' || role === 'MANAGER' || role === 'DIRECTOR') {
    if (moduleUpper === 'PRE_SALES') return role !== 'DIRECTOR';
    return true;
  }

  if (role === 'PRE_SALES') return moduleUpper === 'PRE_SALES';

  const accessB2B = Boolean(user.accessB2B);
  const accessB2G = Boolean(user.accessB2G);
  const accessPreSales = Boolean(user.accessPreSales);

  if (moduleUpper === 'B2B') return accessB2B;
  if (moduleUpper === 'B2G') return accessB2G;
  if (moduleUpper === 'PRE_SALES') return accessPreSales;

  return false;
}

export function getPermissionTemplate(role, overrides = {}) {
  const normalizedRole = normalizeRole(role);
  const base = ROLE_PERMISSION_TEMPLATES[normalizedRole] || ROLE_PERMISSION_TEMPLATES.USER;

  if (!overrides || typeof overrides !== 'object') return { ...base };

  return {
    ...base,
    ...overrides
  };
}
