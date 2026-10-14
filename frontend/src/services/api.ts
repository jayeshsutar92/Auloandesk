import type {
  LoanScheme,
  QuotesResponseData,
  CreateLeadPayload,
  CreateLeadResponseData,
  LeadItem,
  ApiError,
  SupportedKarat
} from "../types/loan.types.js";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000/api/v1";

export class ApiServiceError extends Error implements ApiError {
  public code: string;
  public override message: string;
  public existingApplicationId?: string;
  public fields?: Record<string, string[]>;
  public details?: unknown;

  constructor(errorData: {
    code?: string;
    message?: string;
    existingApplicationId?: string;
    fields?: Record<string, string[]>;
    details?: unknown;
  }) {
    super(errorData.message || "An unexpected error occurred");
    this.name = "ApiServiceError";
    this.code = errorData.code || "UNKNOWN_ERROR";
    this.message = errorData.message || "An unexpected error occurred";
    this.existingApplicationId = errorData.existingApplicationId;
    this.fields = errorData.fields;
    this.details = errorData.details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  let json: { success?: boolean; data?: T; error?: Record<string, unknown> };
  try {
    json = await res.json();
  } catch {
    throw new ApiServiceError({
      code: "NETWORK_ERROR",
      message: `HTTP ${res.status}: Failed to parse server response`
    });
  }

  if (!res.ok || json.success === false) {
    const errorObj = json.error || {};
    throw new ApiServiceError({
      code: (errorObj.code as string) || `HTTP_${res.status}`,
      message: (errorObj.message as string) || res.statusText || "Request failed",
      existingApplicationId: errorObj.existingApplicationId as string | undefined,
      fields: errorObj.fields as Record<string, string[]> | undefined,
      details: errorObj.details
    });
  }

  return json.data as T;
}

export async function fetchLoanSchemes(): Promise<LoanScheme[]> {
  const res = await fetch(`${API_BASE_URL}/loan-schemes`, {
    headers: { Accept: "application/json" }
  });
  return handleResponse<LoanScheme[]>(res);
}

export async function fetchQuotes(params: {
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: SupportedKarat;
}): Promise<QuotesResponseData> {
  const res = await fetch(`${API_BASE_URL}/quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(params)
  });
  return handleResponse<QuotesResponseData>(res);
}

export async function submitLead(
  payload: CreateLeadPayload
): Promise<CreateLeadResponseData> {
  const res = await fetch(`${API_BASE_URL}/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<CreateLeadResponseData>(res);
}

export async function fetchLeads(filters?: {
  schemeId?: string;
  status?: string;
}): Promise<LeadItem[]> {
  const params = new URLSearchParams();
  if (filters?.schemeId) {
    params.set("schemeId", filters.schemeId);
  }
  if (filters?.status) {
    params.set("status", filters.status);
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/leads${queryString}`, {
    headers: { Accept: "application/json" }
  });
  return handleResponse<LeadItem[]>(res);
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolExecutionRecord {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ApplicationSummaryData {
  fullName: string;
  maskedMobileNumber: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: number;
  schemeName: string;
  annualInterestRate: number;
  tenureMonths: number;
  eligibleLoan: number;
}

export interface AssistantChatResponse {
  message: string;
  toolExecutions: ToolExecutionRecord[];
  applicationSummary?: ApplicationSummaryData | null;
}

export async function sendAssistantChat(
  messages: ChatMessage[]
): Promise<AssistantChatResponse> {
  const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ messages })
  });
  return handleResponse<AssistantChatResponse>(res);
}

