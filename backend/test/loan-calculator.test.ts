import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  calculateLoanQuote,
  MOCK_RATE_24K_PER_GRAM,
  MAX_REGULATORY_LTV
} from "../src/services/loan-calculator.service.js";

describe("Financial Calculation Service (AuLoanDesk)", () => {
  // Case 1: 45g net, 22K, EMI: pure gold 41.25g, value ₹2,88,750, loan ₹2,16,562.
  it("Case 1: calculates 45g net, 22K, EMI plan (75% LTV) correctly", () => {
    const result = calculateLoanQuote({
      grossWeightGrams: 50,
      netWeightGrams: 45,
      karat: 22,
      maxLtv: 0.75,
      rate24kPerGram: MOCK_RATE_24K_PER_GRAM
    });

    expect(result.pureGoldGrams).toBe(41.25);
    expect(result.goldValue).toBe(288750);
    expect(result.effectiveLtv).toBe(0.75);
    expect(result.eligibleLoan).toBe(216562);
  });

  // Case 2: 45g net, 22K, Bullet: value ₹2,88,750, loan ₹2,02,125.
  it("Case 2: calculates 45g net, 22K, Bullet plan (70% LTV) correctly", () => {
    const result = calculateLoanQuote({
      grossWeightGrams: 45,
      netWeightGrams: 45,
      karat: 22,
      maxLtv: 0.70,
      rate24kPerGram: MOCK_RATE_24K_PER_GRAM
    });

    expect(result.pureGoldGrams).toBe(41.25);
    expect(result.goldValue).toBe(288750);
    expect(result.effectiveLtv).toBe(0.70);
    expect(result.eligibleLoan).toBe(202125);
  });

  // Case 3: 10g net, 18K, EMI: pure gold 7.5g, value ₹52,500, loan ₹39,375.
  it("Case 3: calculates 10g net, 18K, EMI plan (75% LTV) correctly", () => {
    const result = calculateLoanQuote({
      grossWeightGrams: 10,
      netWeightGrams: 10,
      karat: 18,
      maxLtv: 0.75,
      rate24kPerGram: MOCK_RATE_24K_PER_GRAM
    });

    expect(result.pureGoldGrams).toBe(7.5);
    expect(result.goldValue).toBe(52500);
    expect(result.effectiveLtv).toBe(0.75);
    expect(result.eligibleLoan).toBe(39375);
  });

  // Case 4: Net weight greater than gross weight must fail validation with a field-specific error.
  it("Case 4: fails validation with field-specific error when net weight exceeds gross weight", () => {
    expect.assertions(3);

    try {
      calculateLoanQuote({
        grossWeightGrams: 40,
        netWeightGrams: 45,
        karat: 22,
        maxLtv: 0.75,
        rate24kPerGram: MOCK_RATE_24K_PER_GRAM
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      const netWeightIssue = zodError.issues.find((issue) =>
        issue.path.includes("netWeightGrams")
      );
      expect(netWeightIssue).toBeDefined();
      expect(netWeightIssue?.message).toBe("Net weight cannot exceed gross weight");
    }
  });

  // Additional boundary & edge case validations
  it("enforces maximum regulatory LTV cap of 75% when scheme LTV exceeds it", () => {
    const result = calculateLoanQuote({
      grossWeightGrams: 10,
      netWeightGrams: 10,
      karat: 24,
      maxLtv: 0.90, // Attempting 90% LTV
      rate24kPerGram: 7000
    });

    expect(result.effectiveLtv).toBe(MAX_REGULATORY_LTV);
    expect(result.pureGoldGrams).toBe(10);
    expect(result.goldValue).toBe(70000);
    // floor(70000 * 0.75) = 52500
    expect(result.eligibleLoan).toBe(52500);
  });

  it("fails validation for unsupported gold karats (e.g., 14K)", () => {
    expect(() =>
      calculateLoanQuote({
        grossWeightGrams: 10,
        netWeightGrams: 10,
        karat: 14,
        maxLtv: 0.75
      })
    ).toThrow(ZodError);
  });

  it("fails validation for zero or negative weights", () => {
    expect(() =>
      calculateLoanQuote({
        grossWeightGrams: 0,
        netWeightGrams: 0,
        karat: 22,
        maxLtv: 0.75
      })
    ).toThrow(ZodError);
  });

  it("fails validation for weights exceeding 1000 grams", () => {
    expect(() =>
      calculateLoanQuote({
        grossWeightGrams: 1050,
        netWeightGrams: 1050,
        karat: 22,
        maxLtv: 0.75
      })
    ).toThrow(ZodError);
  });
});
