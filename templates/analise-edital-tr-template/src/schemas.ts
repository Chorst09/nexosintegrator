import { z } from "zod";

export const AnalyzeEditalRequestSchema = z.object({
  fileDataUri: z.string().min(1, "fileDataUri obrigatorio.")
});

export const AnalyzeTrRequestSchema = z.object({
  fileDataUri: z.string().min(1, "fileDataUri obrigatorio."),
  analyzedModelName: z.string().min(1, "analyzedModelName obrigatorio."),
  analyzedModelManufacturer: z.string().optional(),
  analyzedModelSpecs: z.string().min(1, "analyzedModelSpecs obrigatorio."),
  datasheetFileDataUri: z.string().optional(),
  datasheetFileName: z.string().optional()
});

const PriceRegistrySchema = z.object({
  ataNumber: z.string().optional(),
  year: z.string().optional(),
  managingAgency: z.string().optional(),
  status: z.enum(["rascunho", "vigente", "suspensa", "expirada"]).optional(),
  validityStart: z.string().optional(),
  validityEnd: z.string().optional(),
  contractTerm: z.string().optional(),
  portal: z.string().optional(),
  modality: z.string().optional(),
  supplier: z
    .object({
      name: z.string().optional(),
      cnpj: z.string().optional(),
      contact: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional()
    })
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.string().optional(),
        unit: z.string().optional(),
        unitPrice: z.string().optional(),
        balance: z.string().optional(),
        lastMovement: z.string().optional()
      })
    )
    .optional(),
  adherences: z
    .array(
      z.object({
        requester: z.string(),
        status: z.enum(["APROVADA", "PENDENTE", "NEGADA"]),
        value: z.string().optional(),
        lastUpdate: z.string().optional()
      })
    )
    .optional(),
  consumption: z
    .object({
      committedValue: z.string().optional(),
      balanceValue: z.string().optional(),
      lastPurchaseDate: z.string().optional()
    })
    .optional(),
  alerts: z.array(z.string()).optional()
});

const EditalExtractedDataSchema = z.object({
  analysisType: z.literal("edital").optional(),
  general: z.object({
    openingDate: z.string(),
    openingTime: z.string(),
    portal: z.string(),
    agency: z.string(),
    modality: z.string(),
    objectSummary: z.string()
  }),
  deadlines: z
    .object({
      publicationDate: z.string(),
      impugnationDeadline: z.string(),
      clarificationDeadline: z.string(),
      proposalDeadline: z.string(),
      contractTerm: z.string()
    })
    .optional(),
  requirements: z.object({
    legal: z.array(z.string()),
    technical: z.array(z.string()),
    economic: z.array(z.string()),
    fiscal: z.array(z.string())
  }),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      specs: z.string()
    })
  ),
  risks: z.array(z.string()),
  priceRegistry: PriceRegistrySchema.optional()
});

const TrExtractedDataSchema = z.object({
  analysisType: z.literal("tr"),
  trSummary: z.string(),
  analyzedModel: z.object({
    modelName: z.string(),
    manufacturer: z.string().optional(),
    providedSpecs: z.string()
  }),
  termRequirements: z.array(z.string()),
  technicalNotebook: z.array(
    z.object({
      termRequirement: z.string(),
      meetsRequirement: z.enum(["ATENDE", "NAO_ATENDE"]),
      datasheetEvidence: z.string().optional(),
      rationale: z.string()
    })
  ),
  compliantEquipment: z.array(
    z.object({
      model: z.string(),
      manufacturer: z.string(),
      rationale: z.string()
    })
  ),
  complianceOverview: z.object({
    totalRequirements: z.number(),
    metRequirements: z.number(),
    fullCompliance: z.boolean()
  })
});

export const SaveAnalysisPayloadSchema = z.object({
  analysisId: z.string().min(1),
  fileName: z.string().min(1),
  processedAt: z.string().min(1),
  extractedData: z.union([EditalExtractedDataSchema, TrExtractedDataSchema]),
  originalFileDataUri: z.string().optional().nullable(),
  summaryPdfDataUri: z.string().optional().nullable()
});

export function firstZodError(error: z.ZodError): string {
  return error.errors[0]?.message ?? "Requisicao invalida.";
}
