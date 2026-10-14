export type SupportedKarat = 18 | 22 | 24;

export interface LoanScheme {
  id: string;
  code: string;
  name: string;
  description: string | null;
  annualInterestRate: number;
  tenureMonths: number;
  maxLtv: number;
}

export interface SchemeQuote {
  schemeId: string;
  code: string;
  name: string;
  annualInterestRate: number;
  tenureMonths: number;
  maxLtv: number;
  effectiveLtv: number;
  eligibleLoan: number;
}

export interface QuotesResponseData {
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: SupportedKarat;
  rate24kPerGram: number;
  pureGoldGrams: number;
  goldValue: number;
  schemes: SchemeQuote[];
}

export interface CreateLeadPayload {
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: SupportedKarat;
  schemeId: string;
  appliedLoanAmount?: number;
}

export interface CreateLeadResponseData {
  applicationId: string;
  applicationNumber: string;
  status: string;
  fullName: string;
  maskedMobileNumber: string;
  pureGoldGrams: number;
  goldValue: number;
  eligibleLoan: number;
  appliedLoanAmount: number;
  scheme: {
    id: string;
    code: string;
    name: string;
    annualInterestRate: number;
    tenureMonths: number;
    maxLtv: number;
  };
  createdAt: string;
}

export interface LeadItem {
  id: string;
  applicationNumber: string;
  fullName: string;
  maskedMobileNumber: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  goldKarat: number;
  pureGoldGrams: number;
  goldValue: number;
  eligibleLoan: number;
  appliedLoanAmount: number;
  status: string;
  scheme: {
    id: string;
    code: string;
    name: string;
    annualInterestRate: number;
    tenureMonths: number;
    maxLtv: number;
  };
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  existingApplicationId?: string;
  fields?: Record<string, string[]>;
  details?: unknown;
}
