export const COMMERCIAL_PROPOSALS_STORAGE_KEY = 'proposta-comercial-double-drafts-v1';

const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');

export const getCommercialProposalNumber = (proposal) =>
  normalizeText(proposal?.proposalNumber || proposal?.number || proposal?.draft?.proposalNumber || proposal?.draft?.number);

export const readCommercialProposalDrafts = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMMERCIAL_PROPOSALS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime())
      : [];
  } catch {
    return [];
  }
};

const generateProposalNumber = (proposals) => {
  const year = new Date().getFullYear();
  const prefix = `PROP-${year}-`;
  const used = proposals
    .map(getCommercialProposalNumber)
    .filter(number => number.startsWith(prefix))
    .map(number => Number(number.slice(prefix.length)))
    .filter(Number.isFinite);

  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(4, '0')}`;
};

const generateProposalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatProposalDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('pt-BR');
  return date.toLocaleDateString('pt-BR');
};

const formatCurrency = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '';
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const createOrUpdateCommercialProposalFromOpportunity = (opportunity, options = {}) => {
  if (!opportunity?.id || typeof window === 'undefined') return null;

  const currentEntries = readCommercialProposalDrafts();
  const existing = currentEntries.find(proposal =>
    proposal.opportunityId === opportunity.id || proposal?.draft?.opportunityId === opportunity.id
  );
  const proposalId = existing?.id || generateProposalId();
  const proposalNumber = getCommercialProposalNumber(existing) || generateProposalNumber(currentEntries);
  const now = new Date().toISOString();
  const clientType = options.clientType || existing?.clientType || 'B2B';
  const companyName = normalizeText(opportunity?.company?.name || opportunity?.companyName || opportunity?.clientName);
  const clientName = companyName || normalizeText(opportunity?.title) || 'Cliente sem nome';
  const productName = normalizeText(opportunity?.projectName || opportunity?.title || opportunity?.description) || 'Produto/servico';
  const projectMonths = Number(opportunity?.projectMonths || 0);
  const contractTerm = projectMonths > 0 ? `${projectMonths} meses` : '';
  const draft = existing?.draft || {
    savedAt: now,
    cover: {
      clientName,
      date: formatProposalDate(),
      product: productName
    },
    slides: {},
    contract: {
      vigencia: '',
      prazo: contractTerm,
      termos: ''
    },
    investment: {
      rows: [
        {
          service: productName,
          description: normalizeText(opportunity?.description),
          monthly: formatCurrency(opportunity?.value),
          contract: contractTerm
        }
      ],
      installationFee: ''
    }
  };

  const entry = {
    ...(existing || {}),
    id: proposalId,
    title: existing?.title || clientName,
    proposalNumber,
    opportunityId: opportunity.id,
    clientType,
    savedAt: existing?.savedAt || now,
    draft: {
      ...draft,
      proposalNumber,
      opportunityId: opportunity.id,
      cover: {
        ...(draft.cover || {}),
        clientName: draft.cover?.clientName || clientName,
        date: draft.cover?.date || formatProposalDate(),
        product: draft.cover?.product || productName
      }
    }
  };

  const next = [entry, ...currentEntries.filter(proposal => proposal.id !== proposalId)];
  window.localStorage.setItem(COMMERCIAL_PROPOSALS_STORAGE_KEY, JSON.stringify(next));
  return entry;
};
