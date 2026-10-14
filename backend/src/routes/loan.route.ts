import { Router } from "express";
import {
  getLoanSchemesController,
  createQuoteController,
  createLeadController,
  listLeadsController,
  updateLeadStatusController,
  getLeadAuditsController,
  getGoldRateController
} from "../controllers/loan.controller.js";
import {
  validateBody,
  validateQuery
} from "../middleware/validation.middleware.js";
import {
  createQuoteSchema,
  createLeadSchema,
  listLeadsQuerySchema,
  updateLeadStatusSchema
} from "../validators/loan.validator.js";

const router = Router();

// Bonus / Cache: GET /api/v1/gold-rate
router.get("/gold-rate", getGoldRateController);

// A. GET /api/v1/loan-schemes
router.get("/loan-schemes", getLoanSchemesController);

// B. POST /api/v1/quotes
router.post("/quotes", validateBody(createQuoteSchema), createQuoteController);

// C. POST /api/v1/leads
router.post("/leads", validateBody(createLeadSchema), createLeadController);

// D. GET /api/v1/leads
router.get("/leads", validateQuery(listLeadsQuerySchema), listLeadsController);

// Status Workflow: PATCH /api/v1/leads/:id/status
router.patch(
  "/leads/:id/status",
  validateBody(updateLeadStatusSchema),
  updateLeadStatusController
);

// Audit Trail: GET /api/v1/leads/:id/audits
router.get("/leads/:id/audits", getLeadAuditsController);

export default router;

