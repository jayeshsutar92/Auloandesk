import type { Request, Response, NextFunction } from "express";
import {
  getActiveLoanSchemes,
  calculateQuotesForSchemes,
  createLead,
  listLeads
} from "../services/loan.service.js";
import type {
  CreateQuoteInput,
  CreateLeadInput,
  ListLeadsQuery
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
