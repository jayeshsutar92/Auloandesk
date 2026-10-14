import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public override readonly message: string,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly details: unknown = null
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DuplicateApplicationError extends AppError {
  constructor(
    public readonly existingApplicationId: string,
    message: string = "An application with this mobile number already exists within the last 7 days."
  ) {
    super(409, message, "DUPLICATE_APPLICATION", { existingApplicationId });
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof DuplicateApplicationError) {
    res.status(409).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        existingApplicationId: err.existingApplicationId,
        details: err.details
      }
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join(".") || "body";
      if (!fields[field]) {
        fields[field] = [];
      }
      fields[field].push(issue.message);
    }

    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Input validation failed",
        fields,
        details: err.issues
      }
    });
    return;
  }

  const isProduction = env.NODE_ENV === "production";
  const errorMessage = err instanceof Error ? err.message : "Internal server error";

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isProduction ? "An unexpected error occurred" : errorMessage
    }
  });
}
