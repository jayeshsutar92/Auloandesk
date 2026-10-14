import { Router } from "express";
import {
  getLoanSchemesController,
  createQuoteController,
  createLeadController,
  listLeadsController
} from "../controllers/loan.controller.js";
import {
  validateBody,
  validateQuery
} from "../middleware/validation.middleware.js";
import {
  createQuoteSchema,
  createLeadSchema,
  listLeadsQuerySchema
} from "../validators/loan.validator.js";

const router = Router();

// A. GET /api/v1/loan-schemes
router.get("/loan-schemes", getLoanSchemesController);

// B. POST /api/v1/quotes
router.post("/quotes", validateBody(createQuoteSchema), createQuoteController);

// C. POST /api/v1/leads
router.post("/leads", validateBody(createLeadSchema), createLeadController);

// D. GET /api/v1/leads
router.get("/leads", validateQuery(listLeadsQuerySchema), listLeadsController);

export default router;
