import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { healthRouter } from "./routes/health";
import { createInternalRouter, type InternalRouterDeps } from "./routes/internal";

export interface CreateAppDeps {
  internalRouterDeps: InternalRouterDeps;
}

export function createApp(deps: CreateAppDeps) {
  const app = express();
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(compression());
  app.use(express.json());

  app.use("/api/v1/health", healthRouter);
  app.use("/internal/jobs", createInternalRouter(deps.internalRouterDeps));

  return app;
}
