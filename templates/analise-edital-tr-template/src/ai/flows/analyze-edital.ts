import { z } from "genkit";
import { ai, executeWithRetry } from "../genkit.js";

const AnalyzeEditalInputSchema = z.object({
  fileDataUri: z.string().describe("Arquivo do edital como Data URI (PDF).")
});

const AnalyzeEditalOutputSchema = z.object({
  analysisType: z.literal("edital").optional(),
  general: z.object({
    openingDate: z.string().describe("Data da sessao publica no formato DD/MM/AAAA."),
    openingTime: z.string().describe("Hora da sessao publica no formato HH:MM."),
    portal: z.string().describe("Portal ou plataforma da licitacao."),
    agency: z.string().describe("Orgao licitante."),
    modality: z.string().describe("Modalidade da licitacao."),
    objectSummary: z.string().describe("Resumo curto do objeto.")
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
  risks: z.array(z.string())
});

const analyzeEditalPrompt = ai.definePrompt({
  name: "templateAnalyzeEditalPrompt",
  input: { schema: AnalyzeEditalInputSchema },
  output: { schema: AnalyzeEditalOutputSchema },
  prompt: `Voce e especialista em licitacoes B2G.
Analise o edital em anexo e retorne JSON estritamente no schema de saida.

Regras:
1. Se nao localizar um dado, use "Nao identificado" ou string vazia.
2. Em "risks", foque em clausulas restritivas, multas altas e riscos de desclassificacao.
3. Em "items", extraia os principais itens tecnicos do TR.
4. Seja objetivo.

Documento: {{media url=fileDataUri}}`
});

const analyzeEditalFlow = ai.defineFlow(
  {
    name: "templateAnalyzeEditalFlow",
    inputSchema: AnalyzeEditalInputSchema,
    outputSchema: AnalyzeEditalOutputSchema
  },
  async (input) => {
    return executeWithRetry(async () => {
      const { output } = await analyzeEditalPrompt(input);
      if (!output) throw new Error("IA nao retornou conteudo para analise de edital.");
      return {
        ...output,
        analysisType: "edital" as const
      };
    });
  }
);

export async function analyzeEdital(input: { fileDataUri: string }) {
  return analyzeEditalFlow(input);
}
