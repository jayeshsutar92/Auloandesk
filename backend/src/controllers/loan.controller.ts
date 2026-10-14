import type { Request, Response, NextFunction } from "express";
import {
  getActiveLoanSchemes,
  calculateQuotesForSchemes,
  createLead,
  listLeads,
  updateLeadStatus,
  getLeadAudits
} from "../services/loan.service.js";
import { executeIdempotentRequest } from "../services/idempotency.service.js";
import { getGoldRateInfo } from "../services/gold-rate.service.js";
import type {
  CreateQuoteInput,
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadStatusInput
} from "../validators/loan.validator.js";

export async function getLoanSchemesController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const schemes = await getActiveLoanSchemes();
    res.status(200).json({
      success: true,
      data: schemes
    });
  } catch (error) {
    next(error);
  }
}

export async function createQuoteController(
  req: Request<unknown, unknown, CreateQuoteInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const quotes = await calculateQuotesForSchemes(req.body);
    res.status(200).json({
      success: true,
      data: quotes
    });
  } catch (error) {
    next(error);
  }
}

export async function createLeadController(
  req: Request<unknown, unknown, CreateLeadInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawIdempotencyKey = req.headers["idempotency-key"];
    if (typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0) {
      const result = await executeIdempotentRequest(
        rawIdempotencyKey,
        req.originalUrl || req.path,
        req.method,
        req.body,
        async () => {
          const lead = await createLead(req.body);
          return {
            status: 201,
            body: {
              success: true,
              data: lead
            }
          };
        }
      );

      res.status(result.status).json(result.body);
      return;
    }

    const lead = await createLead(req.body);
    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
}

export async function listLeadsController(
  req: Request<unknown, unknown, unknown, ListLeadsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const leads = await listLeads(req.query);
    res.status(200).json({
      success: true,
      data: leads
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadStatusController(
  req: Request<{ id: string }, unknown, UpdateLeadStatusInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await updateLeadStatus(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getLeadAuditsController(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const audits = await getLeadAudits(req.params.id);
    res.status(200).json({
      success: true,
      data: audits
    });
  } catch (error) {
    next(error);
  }
}

export async function getGoldRateController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rateInfo = getGoldRateInfo();
    res.status(200).json({
      success: true,
      data: rateInfo
    });
  } catch (error) {
    next(error);
  }
}

