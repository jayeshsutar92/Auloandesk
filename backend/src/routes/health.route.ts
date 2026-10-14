import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";

const router = Router();

router.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime() * 100) / 100,
      environment: env.NODE_ENV
    }
  });
});

export default router;
