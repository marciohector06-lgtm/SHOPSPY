import "dotenv/config";
import Redis from "ioredis";
import { createScraperQueue, RedisJobLock } from "@shopspy/queue";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

const queue = createScraperQueue(connection);
const redisForLock = new Redis(connection.url, { maxRetriesPerRequest: 1, lazyConnect: true });
const lock = new RedisJobLock(redisForLock);

const app = createApp({ internalRouterDeps: { queue, lock } });

app.listen(port, () => {
  console.log(`ShopSpy API listening on :${port}`);
});
