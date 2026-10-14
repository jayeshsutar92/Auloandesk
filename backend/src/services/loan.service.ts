import { prisma } from "../config/db.js";
import { AppError, DuplicateApplicationError } from "../middleware/error.middleware.js";
import {
  calculateLoanQuote,
  MOCK_RATE_24K_PER_GRAM
} from "./loan-calculator.service.js";
import { getCurrentRate24k } from "./gold-rate.service.js";
import { maskMobileNumber } from "../utils/mask.util.js";
import type {
  CreateQuoteInput,
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadStatusInput
} from "../validators/loan.validator.js";
import type { ApplicationStatus } from "@prisma/client";

export const ALLOWED_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: []
};

export function validateStatusTransition(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus
): void {
  if (currentStatus === nextStatus) {
    throw new AppError(
      400,
      `Application is already in status ${currentStatus}.`,
      "SAME_STATUS_TRANSITION"
    );
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      400,
      `Cannot transition application from ${currentStatus} to ${nextStatus}. Allowed transitions: ${
        allowed.length > 0 ? allowed.join(", ") : "None (Terminal State)"
      }.`,
      "INVALID_STATUS_TRANSITION"
    );
  }
}

export async function getActiveLoanSchemes() {
  const schemes = await prisma.loanScheme.findMany({
    where: { isActive: true },
    orderBy: { annualInterestRate: "asc" }
  });

  return schemes.map((scheme) => ({
    id: scheme.id,
    code: scheme.code,
    name: scheme.name,
    description: scheme.description,
    annualInterestRate: scheme.annualInterestRate.toNumber(),
    tenureMonths: scheme.tenureMonths,
    maxLtv: scheme.maxLtv.toNumber()
  }));
}

export async function calculateQuotesForSchemes(input: CreateQuoteInput) {
  const schemes = await prisma.loanScheme.findMany({
    where: { isActive: true },
    orderBy: { annualInterestRate: "asc" }
  });

  if (schemes.length === 0) {
    throw new AppError(404, "No active loan schemes available", "SCHEMES_UNAVAILABLE");
  }

  const rate24k = getCurrentRate24k() || MOCK_RATE_24K_PER_GRAM;

  // Calculate base pure gold weight and value once
  const baseCalc = calculateLoanQuote({
    grossWeightGrams: input.grossWeightGrams,
    netWeightGrams: input.netWeightGrams,
    karat: input.karat,
    maxLtv: 0.75,
    rate24kPerGram: rate24k
  });

  const schemeQuotes = schemes.map((scheme) => {
    const schemeCalc = calculateLoanQuote({
      grossWeightGrams: input.grossWeightGrams,
      netWeightGrams: input.netWeightGrams,
      karat: input.karat,
      maxLtv: scheme.maxLtv.toNumber(),
      rate24kPerGram: rate24k
    });

    return {
      schemeId: scheme.id,
      code: scheme.code,
      name: scheme.name,
      annualInterestRate: scheme.annualInterestRate.toNumber(),
      tenureMonths: scheme.tenureMonths,
      maxLtv: scheme.maxLtv.toNumber(),
      effectiveLtv: schemeCalc.effectiveLtv,
      eligibleLoan: schemeCalc.eligibleLoan
    };
  });

  return {
    grossWeightGrams: input.grossWeightGrams,
    netWeightGrams: input.netWeightGrams,
    karat: input.karat,
    rate24kPerGram: rate24k,
    pureGoldGrams: baseCalc.pureGoldGrams,
    goldValue: baseCalc.goldValue,
    schemes: schemeQuotes
  };
}

export async function createLead(input: CreateLeadInput) {
  // Use interactive database transaction with PostgreSQL advisory locking to guarantee concurrency safety
  return await prisma.$transaction(async (tx) => {
    // 1. Acquire transaction advisory lock on applicant mobile number to serialize concurrent submissions
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'lead_mobile:' + input.mobileNumber}))`;

    // 2. Verify selected loan scheme exists and is active
    const scheme = await tx.loanScheme.findFirst({
      where: {
        OR: [{ id: input.schemeId }, { code: input.schemeId }],
        isActive: true
      }
    });

    if (!scheme) {
      throw new AppError(404, "Selected loan scheme not found or inactive", "SCHEME_NOT_FOUND");
    }

    // 3. Concurrency-safe check: Reject duplicate applications within previous 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existingLead = await tx.loanApplication.findFirst({
      where: {
        mobileNumber: input.mobileNumber,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: "desc" }
    });

    if (existingLead) {
      throw new DuplicateApplicationError(
        existingLead.id,
        "An application with this mobile number already exists within the last 7 days."
      );
    }

    // 4. Authoritative server-side recalculation of financial figures using authoritative rate
    const rate24k = getCurrentRate24k() || MOCK_RATE_24K_PER_GRAM;
    const calculation = calculateLoanQuote({
      grossWeightGrams: input.grossWeightGrams,
      netWeightGrams: input.netWeightGrams,
      karat: input.karat,
      maxLtv: scheme.maxLtv.toNumber(),
      rate24kPerGram: rate24k
    });

    // 5. Mask mobile number
    const maskedMobileNumber = maskMobileNumber(input.mobileNumber);

    // 6. Generate application number and persist
    const applicationNumber = `ALD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const application = await tx.loanApplication.create({
      data: {
        applicationNumber,
        fullName: input.fullName.trim(),
        mobileNumber: input.mobileNumber,
        maskedMobileNumber,
        email: input.email ?? null,
        grossWeightGrams: input.grossWeightGrams,
        netWeightGrams: input.netWeightGrams,
        goldKarat: input.karat,
        rate24kPerGram: calculation.rate24kPerGram,
        pureGoldGrams: calculation.pureGoldGrams,
        goldValue: calculation.goldValue,
        eligibleLoan: calculation.eligibleLoan,
        appliedLoanAmount: input.appliedLoanAmount ?? calculation.eligibleLoan,
        schemeId: scheme.id,
        status: "SUBMITTED"
      },
      include: {
        scheme: true
      }
    });

    return {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      fullName: application.fullName,
      maskedMobileNumber: application.maskedMobileNumber,
      pureGoldGrams: calculation.pureGoldGrams,
      goldValue: calculation.goldValue,
      eligibleLoan: calculation.eligibleLoan,
      appliedLoanAmount: application.appliedLoanAmount?.toNumber() ?? calculation.eligibleLoan,
      scheme: {
        id: scheme.id,
        code: scheme.code,
        name: scheme.name,
        annualInterestRate: scheme.annualInterestRate.toNumber(),
        tenureMonths: scheme.tenureMonths,
        maxLtv: scheme.maxLtv.toNumber()
      },
      createdAt: application.createdAt
    };
  });
}

export async function updateLeadStatus(
  leadId: string,
  input: UpdateLeadStatusInput
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current lead
    const lead = await tx.loanApplication.findUnique({
      where: { id: leadId },
      include: { scheme: true }
    });

    if (!lead) {
      throw new AppError(404, `Loan application with ID ${leadId} not found.`, "LEAD_NOT_FOUND");
    }

    // 2. Validate state transition
    validateStatusTransition(lead.status, input.status);

    // 3. Update application status
    const updated = await tx.loanApplication.update({
      where: { id: leadId },
      data: { status: input.status },
      include: { scheme: true }
    });

    // 4. Create immutable audit record
    const audit = await tx.applicationStatusAudit.create({
      data: {
        applicationId: leadId,
        previousStatus: lead.status,
        newStatus: input.status,
        actor: input.actor || "SYSTEM_ADMIN",
        notes: input.notes || null
      }
    });

    return {
      application: {
        id: updated.id,
        applicationNumber: updated.applicationNumber,
        fullName: updated.fullName,
        maskedMobileNumber: updated.maskedMobileNumber,
        status: updated.status,
        eligibleLoan: updated.eligibleLoan.toNumber(),
        appliedLoanAmount: updated.appliedLoanAmount?.toNumber() ?? updated.eligibleLoan.toNumber(),
        scheme: {
          id: updated.scheme.id,
          code: updated.scheme.code,
          name: updated.scheme.name
        },
        updatedAt: updated.updatedAt
      },
      audit: {
        id: audit.id,
        applicationId: audit.applicationId,
        previousStatus: audit.previousStatus,
        newStatus: audit.newStatus,
        actor: audit.actor,
        notes: audit.notes,
        createdAt: audit.createdAt
      }
    };
  });
}

export async function getLeadAudits(leadId: string) {
  const lead = await prisma.loanApplication.findUnique({
    where: { id: leadId }
  });

  if (!lead) {
    throw new AppError(404, `Loan application with ID ${leadId} not found.`, "LEAD_NOT_FOUND");
  }

  const audits = await prisma.applicationStatusAudit.findMany({
    where: { applicationId: leadId },
    orderBy: { createdAt: "asc" }
  });

  return audits.map((a) => ({
    id: a.id,
    applicationId: a.applicationId,
    previousStatus: a.previousStatus,
    newStatus: a.newStatus,
    actor: a.actor,
    notes: a.notes,
    createdAt: a.createdAt
  }));
}

export async function listLeads(filter?: ListLeadsQuery) {
  const whereClause: { schemeId?: string; status?: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" } = {};

  if (filter?.schemeId) {
    whereClause.schemeId = filter.schemeId;
  }
  if (filter?.status) {
    whereClause.status = filter.status;
  }

  const applications = await prisma.loanApplication.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      scheme: true
    }
  });

  return applications.map((app) => ({
    id: app.id,
    applicationNumber: app.applicationNumber,
    fullName: app.fullName,
    maskedMobileNumber: maskMobileNumber(app.mobileNumber),
    grossWeightGrams: app.grossWeightGrams.toNumber(),
    netWeightGrams: app.netWeightGrams.toNumber(),
    goldKarat: app.goldKarat,
    pureGoldGrams: app.pureGoldGrams.toNumber(),
    goldValue: app.goldValue.toNumber(),
    eligibleLoan: app.eligibleLoan.toNumber(),
    appliedLoanAmount: app.appliedLoanAmount?.toNumber() ?? app.eligibleLoan.toNumber(),
    status: app.status,
    scheme: {
      id: app.scheme.id,
      code: app.scheme.code,
      name: app.scheme.name,
      annualInterestRate: app.scheme.annualInterestRate.toNumber(),
      tenureMonths: app.scheme.tenureMonths,
      maxLtv: app.scheme.maxLtv.toNumber()
    },
    createdAt: app.createdAt
  }));
}
