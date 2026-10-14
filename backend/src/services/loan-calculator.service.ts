import {
  loanQuoteInputSchema,
  type SupportedKarat
} from "../validators/loan-calculator.validator.js";

export const MOCK_RATE_24K_PER_GRAM = 7000;
export const MAX_REGULATORY_LTV = 0.75;

export interface LoanQuoteResult {
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: SupportedKarat;
  rate24kPerGram: number;
  pureGoldGrams: number;
  goldValue: number;
  effectiveLtv: number;
  eligibleLoan: number;
}

/**
 * Calculates gold loan quote using the official assignment formulas:
 * 1. pureGoldGrams = netWeightGrams × (karat / 24)
 * 2. goldValue = pureGoldGrams × rate24kPerGram
 * 3. eligibleLoan = floor(goldValue × min(plan.maxLtv, 0.75))
 */
export function calculateLoanQuote(rawInput: unknown): LoanQuoteResult {
  const validated = loanQuoteInputSchema.parse(rawInput);

  const { grossWeightGrams, netWeightGrams, karat, maxLtv, rate24kPerGram } = validated;

  // 1. pureGoldGrams = netWeightGrams × (karat / 24)
  // Round to 4 decimal places to prevent floating-point representation drift
  const pureGoldGrams =
    Math.round(((netWeightGrams * karat) / 24 + Number.EPSILON) * 10000) / 10000;

  // 2. goldValue = pureGoldGrams × rate24kPerGram
  // Rounded to standard 2 decimal places
  const goldValue =
    Math.round((pureGoldGrams * rate24kPerGram + Number.EPSILON) * 100) / 100;

  // Enforce regulatory cap: min(plan.maxLtv, 0.75)
  const effectiveLtv = Math.min(maxLtv, MAX_REGULATORY_LTV);

  // 3. eligibleLoan = floor(goldValue × min(plan.maxLtv, 0.75))
  const eligibleLoan = Math.floor(
    Math.round((goldValue * effectiveLtv + Number.EPSILON) * 100) / 100
  );

  return {
    grossWeightGrams,
    netWeightGrams,
    karat,
    rate24kPerGram,
    pureGoldGrams,
    goldValue,
    effectiveLtv,
    eligibleLoan
  };
}
