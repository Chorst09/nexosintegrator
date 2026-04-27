import { z } from "genkit";
import { ai, executeWithRetry } from "../genkit.js";

const AnalyzeTrInputSchema = z.object({
  fileDataUri: z.string().describe("Arquivo do Termo de Referencia em Data URI (PDF)."),
  analyzedModelName: z.string().describe("Nome do modelo analisado."),
  analyzedModelManufacturer: z.string().optional().describe("Fabricante do modelo."),
  analyzedModelSpecs: z.string().describe("Especificacoes tecnicas do modelo."),
  datasheetFileDataUri: z.string().optional().describe("Datasheet em Data URI."),
  datasheetFileName: z.string().optional().describe("Nome do arquivo de datasheet.")
});

const AnalyzeTrOutputSchema = z.object({
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

const analyzeTrPrompt = ai.definePrompt({
  name: "templateAnalyzeTrPrompt",
  input: { schema: AnalyzeTrInputSchema },
  output: { schema: AnalyzeTrOutputSchema },
  prompt: `Voce e especialista em licitacoes B2G e engenharia de presales.
Analise o TR e compare com o modelo informado.

Regras obrigatorias:
1. Extraia todos os requisitos tecnicos e funcionais relevantes.
2. Gere no minimo 5 linhas no technicalNotebook.
3. "meetsRequirement" deve ser somente "ATENDE" ou "NAO_ATENDE".
4. "analysisType" deve ser "tr".
5. Sempre preencher "datasheetEvidence" quando possivel.

Formato sugerido para datasheetEvidence:
- ATENDE: "TR exige [x]. Modelo possui [y]"
- NAO_ATENDE: "TR exige [x]. Modelo possui [z] ou Nao identificado"

Modelo analisado:
- Nome: {{analyzedModelName}}
- Fabricante: {{analyzedModelManufacturer}}
- Especificacoes: {{analyzedModelSpecs}}
{{#if datasheetFileName}}
- Datasheet anexado: {{datasheetFileName}}
{{/if}}

Documento TR: {{media url=fileDataUri}}
{{#if datasheetFileDataUri}}
Datasheet: {{media url=datasheetFileDataUri}}
{{/if}}`
});

const analyzeTrFlow = ai.defineFlow(
  {
    name: "templateAnalyzeTrFlow",
    inputSchema: AnalyzeTrInputSchema,
    outputSchema: AnalyzeTrOutputSchema
  },
  async (input) => {
    return executeWithRetry(async () => {
      const { output } = await analyzeTrPrompt(input);
      if (!output) throw new Error("IA nao retornou conteudo para analise de TR.");
      return {
        ...output,
        analysisType: "tr" as const
      };
    });
  }
);

export async function analyzeTr(input: {
  fileDataUri: string;
  analyzedModelName: string;
  analyzedModelManufacturer?: string;
  analyzedModelSpecs: string;
  datasheetFileDataUri?: string;
  datasheetFileName?: string;
}) {
  return analyzeTrFlow(input);
}
