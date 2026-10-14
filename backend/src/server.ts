import type { Server } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";

let server: Server | null = null;

function startServer(): void {
  try {
    server = app.listen(env.PORT, () => {
      console.log(
        `[AuLoanDesk Backend] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`
      );
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      console.error("[AuLoanDesk Backend] Server startup failure:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("[AuLoanDesk Backend] Fatal startup error:", error);
    process.exit(1);
  }
}

function handleShutdown(signal: string): void {
  console.log(`[AuLoanDesk Backend] Received ${signal}. Closing HTTP server gracefully...`);
  if (server) {
    server.close((err) => {
      if (err) {
        console.error("[AuLoanDesk Backend] Error closing server:", err);
        process.exit(1);
      }
      console.log("[AuLoanDesk Backend] Server successfully closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Process signal listeners for graceful termination
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

// Global asynchronous error listeners
process.on("unhandledRejection", (reason: unknown) => {
  console.error("[AuLoanDesk Backend] Unhandled Rejection detected:", reason);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (error: Error) => {
  console.error("[AuLoanDesk Backend] Uncaught Exception detected:", error.message, error.stack);
  process.exit(1);
});

startServer();
