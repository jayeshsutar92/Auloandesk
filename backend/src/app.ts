import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import healthRouter from "./routes/health.route.js";
import loanRouter from "./routes/loan.route.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );

  // Body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Health route
  app.use(healthRouter);
  app.use("/api/v1", healthRouter);

  // Business API v1 routes
  app.use("/api/v1", loanRouter);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
