import { prisma } from "../config/db.js";
import { AppError, DuplicateApplicationError } from "../middleware/error.middleware.js";
import {
  calculateLoanQuote,
  MOCK_RATE_24K_PER_GRAM
} from "./loan-calculator.service.js";
import { maskMobileNumber } from "../utils/mask.util.js";
import type {
  CreateQuoteInput,
  CreateLeadInput,
  ListLeadsQuery
} from "../validators/loan.validator.js";

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

  // Calculate base pure gold weight and value once
  const baseCalc = calculateLoanQuote({
    grossWeightGrams: input.grossWeightGrams,
    netWeightGrams: input.netWeightGrams,
    karat: input.karat,
    maxLtv: 0.75,
    rate24kPerGram: MOCK_RATE_24K_PER_GRAM
  });

  const schemeQuotes = schemes.map((scheme) => {
    const schemeCalc = calculateLoanQuote({
      grossWeightGrams: input.grossWeightGrams,
      netWeightGrams: input.netWeightGrams,
      karat: input.karat,
      maxLtv: scheme.maxLtv.toNumber(),
      rate24kPerGram: MOCK_RATE_24K_PER_GRAM
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
    rate24kPerGram: MOCK_RATE_24K_PER_GRAM,
    pureGoldGrams: baseCalc.pureGoldGrams,
    goldValue: baseCalc.goldValue,
    schemes: schemeQuotes
  };
}

export async function createLead(input: CreateLeadInput) {
  // 1. Verify selected loan scheme exists and is active
  const scheme = await prisma.loanScheme.findFirst({
    where: {
      OR: [{ id: input.schemeId }, { code: input.schemeId }],
      isActive: true
    }
  });

  if (!scheme) {
    throw new AppError(404, "Selected loan scheme not found or inactive", "SCHEME_NOT_FOUND");
  }

  // 2. Reject duplicate applications within previous 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const existingLead = await prisma.loanApplication.findFirst({
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

  // 3. Authoritative server-side recalculation of financial figures
  const calculation = calculateLoanQuote({
    grossWeightGrams: input.grossWeightGrams,
    netWeightGrams: input.netWeightGrams,
    karat: input.karat,
    maxLtv: scheme.maxLtv.toNumber(),
    rate24kPerGram: MOCK_RATE_24K_PER_GRAM
  });

  // 4. Mask mobile number
  const maskedMobileNumber = maskMobileNumber(input.mobileNumber);

  // 5. Generate application number and persist
  const applicationNumber = `ALD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const application = await prisma.loanApplication.create({
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
