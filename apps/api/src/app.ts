import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { healthRouter } from "./routes/health";
import { createStreamRouter } from "./routes/stream";
import { createProductsRouter } from "./routes/products";
import { createDashboardRouter } from "./routes/dashboard";
import { createAuthRouter } from "./routes/auth";
import { createAlertsRouter } from "./routes/alerts";
import { createOpportunitiesRouter } from "./routes/opportunities";
import { createInternalRouter, type InternalRouterDeps } from "./routes/internal";
import { authMiddleware, requirePlan } from "./lib/authMiddleware";

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
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(compression({ filter: (req, res) => !STREAMING_PATH_PATTERN.test(req.path) && compression.filter(req, res) }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/stream", createStreamRouter());
  // /products e /dashboard expõem dados de oportunidade completos e em
  // tempo real — isso é PRO. FREE usa /api/v1/opportunities/top (limitado
  // a 3 + 48h de atraso), que não passa por requirePlan.
  app.use("/api/v1/products", authMiddleware, requirePlan("PRO"), createProductsRouter());
  app.use("/api/v1/dashboard", authMiddleware, requirePlan("PRO"), createDashboardRouter());
  app.use("/api/v1/opportunities", createOpportunitiesRouter());
  app.use("/api/v1/alerts", createAlertsRouter());
  app.use("/auth", createAuthRouter());
  app.use("/internal/jobs", createInternalRouter(deps.internalRouterDeps));

  return app;
}
