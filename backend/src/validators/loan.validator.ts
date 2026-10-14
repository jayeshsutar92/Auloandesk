import { z } from "zod";
import {
  SUPPORTED_KARATS,
  type SupportedKarat
} from "./loan-calculator.validator.js";

// Validation for POST /api/v1/quotes
export const createQuoteSchema = z
  .object({
    grossWeightGrams: z
      .number({ message: "Gross weight must be a number" })
      .gt(0, "Gross weight must be greater than 0")
      .lte(1000, "Gross weight cannot exceed 1000 grams"),
    netWeightGrams: z
      .number({ message: "Net weight must be a number" })
      .gt(0, "Net weight must be greater than 0")
      .lte(1000, "Net weight cannot exceed 1000 grams"),
    karat: z
      .number({ message: "Karat must be a number" })
      .int("Karat must be an integer")
      .refine(
        (val): val is SupportedKarat => SUPPORTED_KARATS.includes(val as SupportedKarat),
        {
          message: "Karat must be 18, 22, or 24"
        }
      )
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: "Net weight cannot exceed gross weight",
    path: ["netWeightGrams"]
  });

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

// Validation for POST /api/v1/leads
export const createLeadSchema = z
  .object({
    fullName: z
      .string({ message: "Full name is required" })
      .trim()
      .min(2, "Full name must be at least 2 characters long")
      .max(60, "Full name cannot exceed 60 characters")
      .regex(/^[A-Za-z\s]+$/, "Name must contain only letters and spaces"),
    mobileNumber: z
      .string({ message: "Mobile number is required" })
      .trim()
      .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number. Must be 10 digits starting with 6-9"),
    email: z.string().email("Invalid email address").optional().nullable(),
    grossWeightGrams: z
      .number({ message: "Gross weight must be a number" })
      .gt(0, "Gross weight must be greater than 0")
      .lte(1000, "Gross weight cannot exceed 1000 grams"),
    netWeightGrams: z
      .number({ message: "Net weight must be a number" })
      .gt(0, "Net weight must be greater than 0")
      .lte(1000, "Net weight cannot exceed 1000 grams"),
    karat: z
      .number({ message: "Karat must be a number" })
      .int("Karat must be an integer")
      .refine(
        (val): val is SupportedKarat => SUPPORTED_KARATS.includes(val as SupportedKarat),
        {
          message: "Karat must be 18, 22, or 24"
        }
      ),
    schemeId: z
      .string({ message: "Scheme ID is required" })
      .trim()
      .min(1, "Scheme ID cannot be empty"),
    appliedLoanAmount: z
      .number({ message: "Applied loan amount must be a number" })
      .gt(0, "Applied loan amount must be greater than 0")
      .optional()
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: "Net weight cannot exceed gross weight",
    path: ["netWeightGrams"]
  });

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const listLeadsQuerySchema = z.object({
  schemeId: z.string().optional(),
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional()
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

// Validation for PATCH /api/v1/leads/:id/status
export const updateLeadStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED"], {
    message: "Status must be UNDER_REVIEW, APPROVED, or REJECTED"
  }),
  actor: z
    .string()
    .trim()
    .min(2, "Actor name must be at least 2 characters")
    .max(60, "Actor name cannot exceed 60 characters")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

