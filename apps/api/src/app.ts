import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { healthRouter } from "./routes/health";
import { createStreamRouter } from "./routes/stream";
import { createProductsRouter } from "./routes/products";
import { createDashboardRouter } from "./routes/dashboard";
import { createInternalRouter, type InternalRouterDeps } from "./routes/internal";

export interface CreateAppDeps {
  internalRouterDeps: InternalRouterDeps;
}

// Rotas de streaming (SSE e o roteiro do Gemini) não podem passar pelo
// buffering do gzip — cada chunk precisa chegar ao cliente na hora.
const STREAMING_PATH_PATTERN = /\/api\/v1\/stream|\/script$/;

export function createApp(deps: CreateAppDeps) {
  const app = express();
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(compression({ filter: (req, res) => !STREAMING_PATH_PATTERN.test(req.path) && compression.filter(req, res) }));
  app.use(express.json());

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/stream", createStreamRouter());
  app.use("/api/v1/products", createProductsRouter());
  app.use("/api/v1/dashboard", createDashboardRouter());
  app.use("/internal/jobs", createInternalRouter(deps.internalRouterDeps));

  return app;
}
