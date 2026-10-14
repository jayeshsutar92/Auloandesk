import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery<T extends Record<string, unknown>>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      // In Express 5, req.query has only a getter; update properties in place
      const queryObj = req.query as Record<string, unknown>;
      for (const key of Object.keys(queryObj)) {
        if (!(key in parsed)) {
          delete queryObj[key];
        }
      }
      Object.assign(queryObj, parsed);
      next();
    } catch (error) {
      next(error);
    }
  };
}
