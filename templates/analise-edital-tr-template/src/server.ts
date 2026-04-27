import dotenv from "dotenv";
import Fastify from "fastify";
import { resolve } from "node:path";
import aiAnalysisRoutes from "./routes/ai-analysis-routes.js";
import savedAnalysesRoutes from "./routes/saved-analyses-routes.js";
import { FileSavedAnalysisRepository } from "./repositories/file-saved-analysis-repository.js";

dotenv.config();

async function bootstrap() {
  const app = Fastify({
    logger: true,
    bodyLimit: 30 * 1024 * 1024
  });

  const port = Number(process.env.PORT ?? 3333);
  const dataDir = resolve(process.cwd(), process.env.DATA_DIR ?? "./data");
  const repository = new FileSavedAnalysisRepository(resolve(dataDir, "saved-analyses.json"));
  await repository.init();

  app.get("/", async () => {
    return {
      name: "analise-edital-tr-template",
      status: "ok",
      endpoints: [
        "POST /api/ai-analysis/edital",
        "POST /api/ai-analysis/tr",
        "GET /api/analyses/saved",
        "GET /api/analyses/saved/:id",
        "POST /api/analyses/saved",
        "DELETE /api/analyses/saved/:id"
      ]
    };
  });

  app.get("/health", async () => {
    return {
      ok: true,
      timestamp: new Date().toISOString()
    };
  });

  await app.register(aiAnalysisRoutes);
  await app.register(savedAnalysesRoutes, { repository });

  await app.listen({
    port,
    host: "0.0.0.0"
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
