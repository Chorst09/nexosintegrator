export type PriceRegistryStatus = "rascunho" | "vigente" | "suspensa" | "expirada";

export interface PriceRegistrySupplier {
  name?: string;
  cnpj?: string;
  contact?: string;
  email?: string;
  phone?: string;
}

export interface PriceRegistryItem {
  name: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
  balance?: string;
  lastMovement?: string;
}

export interface PriceRegistryAdherence {
  requester: string;
  status: "APROVADA" | "PENDENTE" | "NEGADA";
  value?: string;
  lastUpdate?: string;
}

export interface PriceRegistryConsumption {
  committedValue?: string;
  balanceValue?: string;
  lastPurchaseDate?: string;
}

export interface PriceRegistryData {
  ataNumber?: string;
  year?: string;
  managingAgency?: string;
  status?: PriceRegistryStatus;
  validityStart?: string;
  validityEnd?: string;
  contractTerm?: string;
  portal?: string;
  modality?: string;
  supplier?: PriceRegistrySupplier;
  items?: PriceRegistryItem[];
  adherences?: PriceRegistryAdherence[];
  consumption?: PriceRegistryConsumption;
  alerts?: string[];
}

export interface EditalAnalysisExtractedData {
  analysisType?: "edital";
  general: {
    openingDate: string;
    openingTime: string;
    portal: string;
    agency: string;
    modality: string;
    objectSummary: string;
  };
  deadlines?: {
    publicationDate: string;
    impugnationDeadline: string;
    clarificationDeadline: string;
    proposalDeadline: string;
    contractTerm: string;
  };
  requirements: {
    legal: string[];
    technical: string[];
    economic: string[];
    fiscal: string[];
  };
  items: Array<{
    name: string;
    quantity: string;
    specs: string;
  }>;
  risks: string[];
  priceRegistry?: PriceRegistryData;
}

export interface TrAnalysisExtractedData {
  analysisType: "tr";
  trSummary: string;
  analyzedModel: {
    modelName: string;
    manufacturer?: string;
    providedSpecs: string;
  };
  termRequirements: string[];
  technicalNotebook: Array<{
    termRequirement: string;
    meetsRequirement: "ATENDE" | "NAO_ATENDE";
    datasheetEvidence?: string;
    rationale: string;
  }>;
  compliantEquipment: Array<{
    model: string;
    manufacturer: string;
    rationale: string;
  }>;
  complianceOverview: {
    totalRequirements: number;
    metRequirements: number;
    fullCompliance: boolean;
  };
}

export type AiAnalysisExtractedData = EditalAnalysisExtractedData | TrAnalysisExtractedData;

export interface SaveAnalysisPayload {
  analysisId: string;
  fileName: string;
  processedAt: string;
  extractedData: AiAnalysisExtractedData;
  originalFileDataUri?: string | null;
  summaryPdfDataUri?: string | null;
}

export interface SavedAnalysisRecord extends SaveAnalysisPayload {
  id: string;
  companyId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "master" | "admin" | "user";

export interface RequestScope {
  companyId: string;
  userId: string;
  role: UserRole;
}
