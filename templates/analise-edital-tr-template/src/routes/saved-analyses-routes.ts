import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { SaveAnalysisPayloadSchema, firstZodError } from "../schemas.js";
import type { RequestScope, UserRole } from "../types.js";
import type { SavedAnalysisRepository } from "../repositories/saved-analysis-repository.js";

interface RouteOptions {
  repository: SavedAnalysisRepository;
}

const roleSet = new Set<UserRole>(["master", "admin", "user"]);

function normalizeHeaderValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" && value[0].trim().length > 0 ? value[0].trim() : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getScopeFromHeaders(headers: Record<string, unknown>): RequestScope | null {
  const companyId = normalizeHeaderValue(headers["x-company-id"]);
  const userId = normalizeHeaderValue(headers["x-user-id"]);
  const roleRaw = normalizeHeaderValue(headers["x-user-role"]) ?? "user";
  const role: UserRole = roleSet.has(roleRaw as UserRole) ? (roleRaw as UserRole) : "user";

  if (!companyId || !userId) return null;
  return { companyId, userId, role };
}

const savedAnalysesRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { repository } = options;

  app.get("/api/analyses/saved", async (request, reply) => {
    const scope = getScopeFromHeaders(request.headers as Record<string, unknown>);
    if (!scope) {
      return reply.status(401).send({ message: "Headers x-company-id e x-user-id sao obrigatorios." });
    }

    const records = await repository.list(scope);
    return reply.send(records);
  });

  app.get("/api/analyses/saved/:id", async (request, reply) => {
    const scope = getScopeFromHeaders(request.headers as Record<string, unknown>);
    if (!scope) {
      return reply.status(401).send({ message: "Headers x-company-id e x-user-id sao obrigatorios." });
    }

    const id = (request.params as { id?: string }).id;
    if (!id || id.trim().length === 0) {
      return reply.status(400).send({ message: "Id obrigatorio." });
    }

    const record = await repository.getById(id, scope);
    if (!record) return reply.status(404).send({ message: "Registro nao encontrado." });
    return reply.send(record);
  });

  app.post("/api/analyses/saved", async (request, reply) => {
    const scope = getScopeFromHeaders(request.headers as Record<string, unknown>);
    if (!scope) {
      return reply.status(401).send({ message: "Headers x-company-id e x-user-id sao obrigatorios." });
    }

    try {
      const payload = SaveAnalysisPayloadSchema.parse(request.body);
      const saved = await repository.upsert(payload, scope);
      return reply.send(saved);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: firstZodError(error) });
      }
      const message = error instanceof Error ? error.message : "Falha ao salvar resumo.";
      const status = message.toLowerCase().includes("permissao") ? 403 : 500;
      return reply.status(status).send({ message });
    }
  });

  app.delete("/api/analyses/saved/:id", async (request, reply) => {
    const scope = getScopeFromHeaders(request.headers as Record<string, unknown>);
    if (!scope) {
      return reply.status(401).send({ message: "Headers x-company-id e x-user-id sao obrigatorios." });
    }

    const id = (request.params as { id?: string }).id;
    if (!id || id.trim().length === 0) {
      return reply.status(400).send({ message: "Id obrigatorio." });
    }

    const removed = await repository.remove(id, scope);
    if (!removed) return reply.status(404).send({ message: "Registro nao encontrado." });
    return reply.status(204).send();
  });
};

export default savedAnalysesRoutes;
