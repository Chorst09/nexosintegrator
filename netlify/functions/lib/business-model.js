const B2G_SIGNAL_PATTERN = /(\bB2G\b|GOVERNO|\bGOV\b|LICIT|EDITAL|TERMO DE REFER[ÊE]NCIA)/i;

const B2G_COMPANY_SIGNAL_FILTERS = [
  { clientType: 'B2G' },
  { segment: { contains: 'B2G', mode: 'insensitive' } },
  { segment: { contains: 'GOVERNO', mode: 'insensitive' } },
  { segment: { contains: 'LICIT', mode: 'insensitive' } }
];

const B2G_OPPORTUNITY_SIGNAL_FILTERS = [
  { b2gStage: { not: null } },
  { source: { contains: 'B2G', mode: 'insensitive' } },
  { source: { contains: 'GOVERNO', mode: 'insensitive' } },
  { source: { contains: 'LICIT', mode: 'insensitive' } },
  { company: { is: { OR: B2G_COMPANY_SIGNAL_FILTERS } } }
];

const toText = (value) => String(value || '').trim();

export const normalizeClientType = (value) => {
  const normalized = toText(value).toUpperCase();
  if (normalized === 'B2B' || normalized === 'B2G') return normalized;
  return null;
};

const hasB2GSignal = (value) => {
  const text = toText(value);
  if (!text) return false;
  return B2G_SIGNAL_PATTERN.test(text);
};

const hasB2GDescriptionShape = (value) => {
  const text = toText(value);
  if (!text) return false;
  if (hasB2GSignal(text)) return true;
  if (!text.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return false;
    return Boolean(
      parsed.noticeId ||
      parsed.numeroEdital ||
      parsed.orgaoEntidade ||
      parsed.faseAtual ||
      parsed.modalidade
    );
  } catch {
    return false;
  }
};

export const inferCompanyClientType = (company, fallback = 'B2B') => {
  const direct = normalizeClientType(company?.clientType);
  if (direct) return direct;

  if (
    hasB2GSignal(company?.segment) ||
    hasB2GSignal(company?.marketSegment) ||
    hasB2GSignal(company?.businessModel)
  ) {
    return 'B2G';
  }

  return fallback;
};

export const inferOpportunityClientType = (opportunity, companyOrResolver, fallback = 'B2B') => {
  const direct = normalizeClientType(opportunity?.clientType);
  if (direct) return direct;

  if (opportunity?.b2gStage) return 'B2G';
  if (hasB2GSignal(opportunity?.source)) return 'B2G';
  if (hasB2GDescriptionShape(opportunity?.description)) return 'B2G';

  const company = typeof companyOrResolver === 'function'
    ? companyOrResolver(opportunity)
    : (companyOrResolver || opportunity?.company || null);

  if (company) return inferCompanyClientType(company, fallback);
  return fallback;
};

export const isCompanyInClientType = (company, clientType, fallback = 'B2B') => {
  const expected = normalizeClientType(clientType) || fallback;
  return inferCompanyClientType(company, fallback) === expected;
};

export const isOpportunityInClientType = (opportunity, clientType, companyOrResolver, fallback = 'B2B') => {
  const expected = normalizeClientType(clientType) || fallback;
  return inferOpportunityClientType(opportunity, companyOrResolver, fallback) === expected;
};

export const buildCompanyClientTypeWhere = (clientType) => {
  const normalized = normalizeClientType(clientType);
  if (!normalized) return null;

  if (normalized === 'B2G') {
    return { OR: B2G_COMPANY_SIGNAL_FILTERS };
  }

  return { NOT: { OR: B2G_COMPANY_SIGNAL_FILTERS } };
};

export const buildOpportunityClientTypeWhere = (clientType) => {
  const normalized = normalizeClientType(clientType);
  if (!normalized) return null;

  if (normalized === 'B2G') {
    return { OR: B2G_OPPORTUNITY_SIGNAL_FILTERS };
  }

  return { NOT: { OR: B2G_OPPORTUNITY_SIGNAL_FILTERS } };
};
