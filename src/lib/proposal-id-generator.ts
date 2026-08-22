// Gerador de IDs para propostas
// Formato: Prop_{Tipo}_{Número}_v{Versão}

export type ProposalType = 
  | 'PABX'
  | 'VM'
  | 'FIBER'
  | 'RADIO'
  | 'DOUBLE'
  | 'INTERNET_MAN_FIBRA' // legado
  | 'MANRADIO' // legado
  | 'REDE_MAN_MPLS_FIBRA'
  | 'REDE_MAN_MPLS_RADIO'
  | 'SD_WAN'
  | 'EVENTOS_TI';

const TYPE_PREFIXES: Record<ProposalType, string> = {
  'PABX': 'Prop_Pabx_Sip',
  'VM': 'Prop_MV',
  'FIBER': 'Prop_Inter_Fibra',
  'RADIO': 'Prop_Inter_Radio',
  'DOUBLE': 'Prop_Inter_Double',
  'INTERNET_MAN_FIBRA': 'Prop_Inter_Man',
  'MANRADIO': 'Prop_InterMan_Radio',
  'REDE_MAN_MPLS_FIBRA': 'Prop_Rede_Man/Filbra',
  'REDE_MAN_MPLS_RADIO': 'Prop_Rede_Man/Radio',
  'SD_WAN': 'Prop_Rede_SD-WAN',
  'EVENTOS_TI': 'Prop_Eventos_TI'
};

const TYPE_LEGACY_PREFIXES: Partial<Record<ProposalType, string[]>> = {
  'REDE_MAN_MPLS_FIBRA': ['Prop_Inter_Man', 'Prop_ManFibra', 'Prop_IM', 'Prop_Rede_Man/Fibra'],
  'REDE_MAN_MPLS_RADIO': ['Prop_InterMan_Radio', 'Prop_ManRadio']
};

const VERSION_SUFFIX_REGEX = /_v(\d+)$/;

const stripVersionSuffix = (proposalId: string): string => {
  return proposalId.replace(VERSION_SUFFIX_REGEX, '');
};

const extractVersionFromBaseId = (
  proposalId: string,
  baseIdWithoutVersion: string
): number | null => {
  if (!proposalId.startsWith(baseIdWithoutVersion)) {
    return null;
  }

  const suffix = proposalId.slice(baseIdWithoutVersion.length);
  if (suffix.length === 0) {
    return 1;
  }

  const match = suffix.match(/^_v(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Gera um ID único para proposta no formato especificado
 * @param type Tipo da proposta
 * @param number Número sequencial (001, 002, etc)
 * @param version Versão da proposta (padrão: 1)
 * @returns ID formatado (ex: Prop_Pabx_Sip_001_v1)
 */
export function generateProposalId(
  type: ProposalType,
  number: number,
  version: number = 1
): string {
  const prefix = TYPE_PREFIXES[type];
  const paddedNumber = String(number).padStart(3, '0');
  return `${prefix}_${paddedNumber}_v${version}`;
}

/**
 * Extrai informações de um ID de proposta
 * @param proposalId ID da proposta
 * @returns Objeto com tipo, número e versão
 */
export function parseProposalId(proposalId: string): {
  type: string;
  number: number;
  version: number;
} | null {
  // Formato: Prop_{Tipo}_{Número}_v{Versão} (versão opcional em IDs legados)
  const match = proposalId.match(/^Prop_(.+?)_(\d+)(?:_v(\d+))?$/);
  
  if (!match) {
    return null;
  }

  return {
    type: match[1],
    number: parseInt(match[2], 10),
    version: match[3] ? parseInt(match[3], 10) : 1
  };
}

/**
 * Obtém o próximo número disponível para um tipo de proposta
 * @param existingProposals Lista de propostas existentes
 * @param type Tipo da proposta
 * @returns Próximo número disponível
 */
export function getNextProposalNumber(
  existingProposals: Array<{ base_id: string }>,
  type: ProposalType
): number {
  const prefix = TYPE_PREFIXES[type];
  const validPrefixes = [prefix, ...(TYPE_LEGACY_PREFIXES[type] || [])];
  
  // Filtrar propostas do mesmo tipo
  const sameTypeProposals = existingProposals.filter(p => 
    validPrefixes.some(validPrefix => p.base_id.startsWith(validPrefix))
  );

  if (sameTypeProposals.length === 0) {
    return 1;
  }

  // Extrair números e encontrar o maior
  const numbers = sameTypeProposals
    .map(p => parseProposalId(p.base_id))
    .filter(parsed => parsed !== null)
    .map(parsed => parsed!.number);

  const maxNumber = Math.max(...numbers, 0);
  return maxNumber + 1;
}

/**
 * Gera o próximo ID disponível para uma proposta
 * @param existingProposals Lista de propostas existentes
 * @param type Tipo da proposta
 * @param version Versão (padrão: 1)
 * @returns ID completo da proposta
 */
export function generateNextProposalId(
  existingProposals: Array<{ base_id: string }>,
  type: ProposalType,
  version: number = 1
): string {
  const nextNumber = getNextProposalNumber(existingProposals, type);
  return generateProposalId(type, nextNumber, version);
}

/**
 * Gera uma nova versão de uma proposta existente
 * @param currentBaseId ID base atual (ex: Prop_Inter_Fibra_001_v1)
 * @param existingProposals Lista de propostas existentes
 * @returns Novo ID com versão incrementada
 */
export function generateNewVersion(
  currentBaseId: string,
  existingProposals: Array<{ base_id: string }>
): string {
  // Encontrar a maior versão existente para este base_id (sem a versão)
  const baseIdWithoutVersion = stripVersionSuffix(currentBaseId);
  const sameBaseProposals = existingProposals.filter(p => 
    p.base_id.startsWith(baseIdWithoutVersion)
  );

  const versions = sameBaseProposals
    .map(p => extractVersionFromBaseId(p.base_id, baseIdWithoutVersion))
    .filter((version): version is number => version !== null);

  const currentVersion = extractVersionFromBaseId(currentBaseId, baseIdWithoutVersion) ?? 1;
  const maxVersion = versions.length > 0 ? Math.max(...versions, currentVersion) : currentVersion;
  const newVersion = maxVersion + 1;

  // Reconstruir o ID com a nova versão
  return `${baseIdWithoutVersion}_v${newVersion}`;
}
