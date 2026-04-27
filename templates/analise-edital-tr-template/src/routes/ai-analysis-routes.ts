import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { analyzeEdital } from "../ai/flows/analyze-edital.js";
import { analyzeTr } from "../ai/flows/analyze-tr.js";
import { AnalyzeEditalRequestSchema, AnalyzeTrRequestSchema, firstZodError } from "../schemas.js";
import type { TrAnalysisExtractedData } from "../types.js";

function buildTrFallbackResponse(
  payload: z.infer<typeof AnalyzeTrRequestSchema>,
  reason: string
): TrAnalysisExtractedData {
  const normalizedReason = reason.trim().length > 0 ? reason : "Falha ao processar o TR nesta tentativa.";
  return {
    analysisType: "tr",
    trSummary:
      "Analise de contingencia gerada automaticamente. Revise o caderno tecnico e execute novamente para obter estrutura completa.",
    analyzedModel: {
      modelName: payload.analyzedModelName,
      manufacturer: payload.analyzedModelManufacturer || "Nao informado",
      providedSpecs: payload.analyzedModelSpecs
    },
    termRequirements: ["Validacao automatica do TR indisponivel nesta tentativa"],
    technicalNotebook: [
      {
        termRequirement: "Validacao automatica do TR indisponivel nesta tentativa",
        meetsRequirement: "NAO_ATENDE",
        datasheetEvidence: "Comparacao TR x datasheet indisponivel nesta tentativa.",
        rationale: normalizedReason
      }
    ],
    compliantEquipment: [],
    complianceOverview: {
      totalRequirements: 1,
      metRequirements: 0,
      fullCompliance: false
    }
  };
}

const aiAnalysisRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/ai-analysis/edital", async (request, reply) => {
    try {
      const payload = AnalyzeEditalRequestSchema.parse(request.body);
      const result = await analyzeEdital(payload);
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: firstZodError(error) });
      }
      const message = error instanceof Error ? error.message : "Falha ao processar edital.";
      return reply.status(500).send({ message });
    }
  });

  app.post("/api/ai-analysis/tr", async (request, reply) => {
    try {
      const payload = AnalyzeTrRequestSchema.parse(request.body);
      try {
        const result = await analyzeTr(payload);
        return reply.send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao processar TR.";
        return reply.send(buildTrFallbackResponse(payload, message));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: firstZodError(error) });
      }
      const message = error instanceof Error ? error.message : "Falha ao processar TR.";
      return reply.status(500).send({ message });
    }
  });
};

export default aiAnalysisRoutes;
