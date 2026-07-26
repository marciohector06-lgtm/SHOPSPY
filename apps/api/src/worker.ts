import "dotenv/config";
import http from "node:http";
import Redis from "ioredis";
import { createScraperQueue, createScraperWorker, RedisJobLock, registerSchedules } from "@shopspy/queue";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const redis = new Redis(connection.url);

const queue = createScraperQueue(connection);
const lock = new RedisJobLock(redis);
const worker = createScraperWorker(connection, redis);
const scheduledTasks = registerSchedules(queue, lock);

console.log(`ShopSpy worker rodando — ${scheduledTasks.length} agendamentos ativos`);

/**
 * O worker não tem rota HTTP de verdade — este servidor existe só pro
 * healthcheck do Railway (railway.json aponta /api/v1/health pra todo
 * serviço do repo, e não há como sobrepor isso por serviço: nem
 * startCommand nem railwayConfigFile setados via API pegam em deploys
 * via Dockerfile, ficam salvos mas o deploy real ignora). Sempre 200 —
 * a saúde real do worker é "processa a fila", não uma rota HTTP.
 */
const port = Number(process.env.PORT ?? 4000);
const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});
healthServer.listen(port, () => {
  console.log(`Healthcheck do worker respondendo em :${port} (só pro Railway, sem rota real)`);
});

async function shutdown(): Promise<void> {
  for (const task of scheduledTasks) task.stop();
  await worker.close();
  await queue.close();
  redis.disconnect();
  healthServer.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
