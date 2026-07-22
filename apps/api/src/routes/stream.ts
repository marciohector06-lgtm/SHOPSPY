import { Router } from "express";
import Redis from "ioredis";
import { STATUS_CHANNEL } from "@shopspy/queue";

/**
 * GET /api/v1/stream — repassa o canal Redis do statusPublisher via SSE.
 * `retry: 3000` no evento inicial instrui o EventSource do navegador a
 * reconectar automaticamente após 3s se a conexão cair, sem lógica extra
 * no cliente. Cada conexão ganha sua própria conexão Redis dedicada porque
 * modo subscriber bloqueia o cliente ioredis para outros comandos.
 */
export function createStreamRouter(): Router {
  const router = Router();

  router.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write("retry: 3000\n\n");

    const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
    subscriber.on("error", () => {
      // conexão de observabilidade: não derruba a requisição por si só
    });

    void subscriber.subscribe(STATUS_CHANNEL);
    subscriber.on("message", (_channel, message) => {
      res.write(`data: ${message}\n\n`);
    });

    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      subscriber.disconnect();
    });
  });

  return router;
}
