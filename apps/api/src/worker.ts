import "dotenv/config";
import Redis from "ioredis";
import { createScraperQueue, createScraperWorker, RedisJobLock, registerSchedules } from "@shopspy/queue";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const redis = new Redis(connection.url);

const queue = createScraperQueue(connection);
const lock = new RedisJobLock(redis);
const worker = createScraperWorker(connection, redis);
const scheduledTasks = registerSchedules(queue, lock);

console.log(`ShopSpy worker rodando — ${scheduledTasks.length} agendamentos ativos`);

async function shutdown(): Promise<void> {
  for (const task of scheduledTasks) task.stop();
  await worker.close();
  await queue.close();
  redis.disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
