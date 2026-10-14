import { z } from "zod";

export const SUPPORTED_KARATS = [18, 22, 24] as const;
export type SupportedKarat = (typeof SUPPORTED_KARATS)[number];

export const loanQuoteInputSchema = z
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
      ),
    maxLtv: z
      .number({ message: "Maximum LTV must be a number" })
      .gt(0, "Maximum LTV must be greater than 0")
      .lte(1, "Maximum LTV ratio cannot exceed 1.0 (100%)"),
    rate24kPerGram: z
      .number({ message: "Gold rate must be a number" })
      .gt(0, "Gold rate must be greater than 0")
      .default(7000)
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: "Net weight cannot exceed gross weight",
    path: ["netWeightGrams"]
  });

export type LoanQuoteInput = z.infer<typeof loanQuoteInputSchema>;
