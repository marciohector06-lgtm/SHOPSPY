import { Router } from "express";
import type { Queue } from "bullmq";
import { enqueueScraper, isKnownSource, type JobLock } from "@shopspy/queue";
import { validate } from "../lib/validate";
import { sourceParamSchema } from "../schemas";

export interface InternalRouterDeps {
  queue: Queue;
  lock: JobLock;
}

/**
 * POST /internal/jobs/:source/trigger — dispara um scraper manualmente,
 * fora do horário do cron. Útil pra testar em produção sem esperar.
 * Respeita o mesmo lock de job duplicado do cron: se a fonte já está
 * rodando, responde 409 em vez de enfileirar de novo. Nunca deve ser
 * exposto publicamente — exige X-Internal-Token == INTERNAL_TOKEN.
 */
export function createInternalRouter(deps: InternalRouterDeps): Router {
  const router = Router();

  router.use((req, res, next) => {
    const token = req.header("x-internal-token");
    const expected = process.env.INTERNAL_TOKEN;
    if (!expected || token !== expected) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  });

  router.post("/:source/trigger", validate(sourceParamSchema, "params"), async (req, res) => {
    const { source } = req.params as unknown as { source: string };

    if (!isKnownSource(source)) {
      res.status(404).json({ error: `fonte desconhecida: ${source}` });
      return;
    }

    const jobId = await enqueueScraper(deps.queue, deps.lock, source);

    if (jobId === null) {
      res.status(409).json({ error: `${source} já está rodando`, source });
      return;
    }

    res.status(202).json({ jobId, source });
  });

  return router;
}
