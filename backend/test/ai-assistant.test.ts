import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { executeTool, chatWithAssistant } from "../src/services/ai-assistant.service.js";

export const mockGroqChatCreate = vi.fn();

// Mock Groq SDK so tests do not require a live network call or API key
vi.mock("groq-sdk", () => {
  return {
    Groq: class {
      chat = {
        completions: {
          create: (...args: unknown[]) => mockGroqChatCreate(...args)
        }
      };
    }
  };
});

describe("Phase 5: AI Loan Assistant Services and Tool Calling", () => {
  const TEST_AI_MOBILE_PREFIX = "9876600";
  const TEST_MOBILE_HAPPY = `${TEST_AI_MOBILE_PREFIX}001`; // 9876600001
  const TEST_MOBILE_DUP = `${TEST_AI_MOBILE_PREFIX}002`; // 9876600002

  let bulletSchemeId = "";

  async function cleanupTestData() {
    await prisma.loanApplication.deleteMany({
      where: {
        mobileNumber: {
          startsWith: TEST_AI_MOBILE_PREFIX
        }
      }
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    const schemes = await prisma.loanScheme.findMany({
      where: { isActive: true }
    });
    const bullet = schemes.find((s) => s.code === "PLAN_BULLET_01");
    if (bullet) {
      bulletSchemeId = bullet.id;
    }
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    mockGroqChatCreate.mockReset();
  });

  // ==========================================
  // 1. Tool Unit Execution Tests
  // ==========================================
  describe("AI Tool Implementations", () => {
    it("Tool 1: get_loan_schemes returns active schemes from database", async () => {
      const result = (await executeTool("get_loan_schemes", {})) as {
        success: boolean;
        count: number;
        schemes: Array<{ code: string; maxLtv: number }>;
      };

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(2);
      expect(result.schemes.some((s) => s.code === "PLAN_BULLET_01")).toBe(true);
      expect(result.schemes.some((s) => s.code === "PLAN_EMI_01")).toBe(true);
    });

    it("Tool 2: calculate_quote computes authoritative financial figures", async () => {
      const result = (await executeTool("calculate_quote", {
        grossWeightGrams: 50,
        netWeightGrams: 45,
        karat: 22
      })) as {
        success: boolean;
        quote: {
          pureGoldGrams: number;
          goldValue: number;
          schemes: Array<{ code: string; eligibleLoan: number }>;
        };
      };

      expect(result.success).toBe(true);
      expect(result.quote.pureGoldGrams).toBeCloseTo(41.25, 2);
      expect(result.quote.goldValue).toBe(288750);
      expect(result.quote.schemes.length).toBeGreaterThanOrEqual(2);
    });

    it("Scenario 5: calculate_quote rejects when net weight > gross weight", async () => {
      const result = (await executeTool("calculate_quote", {
        grossWeightGrams: 40,
        netWeightGrams: 45,
        karat: 22
      })) as { success: boolean; error: string; message: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe("INVALID_WEIGHT_RELATION");
      expect(result.message).toContain("cannot exceed gross weight");
    });

    it("Tool 2: calculate_quote rejects invalid karat or out-of-range weights", async () => {
      const invalidKarat = (await executeTool("calculate_quote", {
        grossWeightGrams: 50,
        netWeightGrams: 45,
        karat: 14 // Unsupported karat
      })) as { success: boolean; error: string };

      expect(invalidKarat.success).toBe(false);
      expect(invalidKarat.error).toBe("INVALID_KARAT");

      const invalidWeight = (await executeTool("calculate_quote", {
        grossWeightGrams: 1500, // > 1000g
        netWeightGrams: 45,
        karat: 22
      })) as { success: boolean; error: string };

      expect(invalidWeight.success).toBe(false);
      expect(invalidWeight.error).toBe("INVALID_GROSS_WEIGHT");
    });

    it("Confirmation Guardrail: submit_application rejects without explicit user confirmation", async () => {
      const result = (await executeTool("submit_application", {
        fullName: "Rohan Varma",
        mobileNumber: TEST_MOBILE_HAPPY,
        grossWeightGrams: 50,
        netWeightGrams: 45,
        karat: 22,
        schemeId: bulletSchemeId || "PLAN_BULLET_01",
        userConfirmed: false // Must be rejected
      })) as { success: boolean; error: string; message: string };

      expect(result.success).toBe(false);
      expect(result.error).toBe("CONFIRMATION_REQUIRED");
      expect(result.message).toContain("Application submission was aborted");
    });

    it("Scenario 1 (Happy Path): submit_application succeeds with explicit userConfirmed: true", async () => {
      const result = (await executeTool("submit_application", {
        fullName: "Rohan Varma",
        mobileNumber: TEST_MOBILE_HAPPY,
        grossWeightGrams: 50,
        netWeightGrams: 45,
        karat: 22,
        schemeId: bulletSchemeId || "PLAN_BULLET_01",
        userConfirmed: true // Confirmed
      })) as {
        success: boolean;
        application: {
          applicationId: string;
          applicationNumber: string;
          maskedMobileNumber: string;
          eligibleLoan: number;
        };
      };

      expect(result.success).toBe(true);
      expect(result.application).toBeDefined();
      expect(result.application.applicationNumber).toMatch(/^ALD-/);
      expect(result.application.maskedMobileNumber).toBe("9876XXXX01");
      expect(result.application.eligibleLoan).toBe(202125);
    });

    it("Scenario 3: submit_application detects duplicate mobile within 7 days", async () => {
      // Create initial application
      const firstSubmission = (await executeTool("submit_application", {
        fullName: "Sunil Grover",
        mobileNumber: TEST_MOBILE_DUP,
        grossWeightGrams: 30,
        netWeightGrams: 28,
        karat: 24,
        schemeId: bulletSchemeId || "PLAN_BULLET_01",
        userConfirmed: true
      })) as { success: boolean; application: { applicationId: string } };

      expect(firstSubmission.success).toBe(true);
      const originalId = firstSubmission.application.applicationId;

      // Duplicate attempt within 7 days
      const duplicateSubmission = (await executeTool("submit_application", {
        fullName: "Sunil Grover Duplicate",
        mobileNumber: TEST_MOBILE_DUP,
        grossWeightGrams: 30,
        netWeightGrams: 28,
        karat: 24,
        schemeId: bulletSchemeId || "PLAN_BULLET_01",
        userConfirmed: true
      })) as {
        success: boolean;
        error: string;
        existingApplicationId: string;
        message: string;
      };

      expect(duplicateSubmission.success).toBe(false);
      expect(duplicateSubmission.error).toBe("DUPLICATE_APPLICATION");
      expect(duplicateSubmission.existingApplicationId).toBe(originalId);
      expect(duplicateSubmission.message).toContain("already submitted within the last 7 days");
    });
  });

  // ==========================================
  // 2. Five Required Conversation Scenarios
  // ==========================================
  describe("Five Required Conversation Scenarios", () => {
    it("Scenario 1: Happy path through confirmed submission", async () => {
      // Turn 1: Model calls calculate_quote
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_quote_1",
                  type: "function",
                  function: {
                    name: "calculate_quote",
                    arguments: JSON.stringify({
                      grossWeightGrams: 50,
                      netWeightGrams: 45,
                      karat: 22
                    })
                  }
                }
              ]
            }
          }
        ]
      });

      // Turn 2: Model returns quote summary and asks for applicant confirmation
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "Your 45g (22K) gold is assessed at ₹2,88,750. Eligible loan under Bullet Repayment is ₹2,02,125 at 12% p.a.\n\nPlease confirm: Do you wish to submit your gold loan application with these exact details? (Yes/No)"
            }
          }
        ]
      });

      const response = await chatWithAssistant([
        {
          role: "user",
          content: "I want to apply for a loan against 50g gross (45g net) 22K gold."
        }
      ]);

      expect(response.toolExecutions.length).toBe(1);
      expect(response.toolExecutions[0].toolName).toBe("calculate_quote");
      expect(response.message).toContain("₹2,02,125");
      expect(response.message).toContain("Do you wish to submit");
    });

    it("Scenario 2: Missing information and follow-up questions", async () => {
      // Model detects missing gold purity and weights, asks follow-up without invoking tools
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "I would be glad to help you get a gold loan quote. To calculate your valuation accurately, could you please provide:\n1. Gross physical weight (in grams)\n2. Net gold weight excluding stones (in grams)\n3. Gold purity (18K, 22K, or 24K)?"
            }
          }
        ]
      });

      const response = await chatWithAssistant([
        {
          role: "user",
          content: "Hi, I have some gold jewelry at home and need cash. How much can I get?"
        }
      ]);

      expect(response.toolExecutions.length).toBe(0); // No tools called because info is missing
      expect(response.message).toContain("Gross physical weight");
      expect(response.message).toContain("Gold purity");
    });

    it("Scenario 3: Duplicate mobile number within seven days handled politely without retrying", async () => {
      // Turn 1: Model calls submit_application with duplicate mobile
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_sub_dup",
                  type: "function",
                  function: {
                    name: "submit_application",
                    arguments: JSON.stringify({
                      fullName: "Sunil Grover",
                      mobileNumber: TEST_MOBILE_DUP,
                      grossWeightGrams: 30,
                      netWeightGrams: 28,
                      karat: 24,
                      schemeId: bulletSchemeId || "PLAN_BULLET_01",
                      userConfirmed: true
                    })
                  }
                }
              ]
            }
          }
        ]
      });

      // Turn 2: Model receives DUPLICATE_APPLICATION error and explains policy
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "An active application already exists for mobile number 9876XXXX02 within the last 7 days. Under RBI compliance rules, duplicate applications within 7 days are restricted. Please check your existing application status in the dashboard."
            }
          }
        ]
      });

      const response = await chatWithAssistant([
        {
          role: "user",
          content: "Yes, I confirm. Please submit the application for Sunil Grover."
        }
      ]);

      expect(response.toolExecutions.length).toBe(1);
      expect(response.toolExecutions[0].toolName).toBe("submit_application");
      expect(response.message).toContain("already exists");
      expect(response.message).toContain("7 days");
    });

    it("Scenario 4: Off-topic request is politely declined", async () => {
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "I am AuLoanDesk's specialized Gold Loan Assistant. I can only assist you with gold loan inquiries, valuations, and applications. How can I help you with your gold loan today?"
            }
          }
        ]
      });

      const response = await chatWithAssistant([
        {
          role: "user",
          content: "What is the best cryptocurrency or stock to buy right now for quick profit?"
        }
      ]);

      expect(response.toolExecutions.length).toBe(0);
      expect(response.message).toContain("specialized Gold Loan Assistant");
      expect(response.message).not.toContain("Bitcoin");
    });

    it("Scenario 5: Net weight greater than gross weight triggers validation error and prompt for correction", async () => {
      // Turn 1: Model attempts to calculate quote with net > gross
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_invalid_weight",
                  type: "function",
                  function: {
                    name: "calculate_quote",
                    arguments: JSON.stringify({
                      grossWeightGrams: 40,
                      netWeightGrams: 45,
                      karat: 22
                    })
                  }
                }
              ]
            }
          }
        ]
      });

      // Turn 2: Model receives INVALID_WEIGHT_RELATION and asks user to correct
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "There was an issue with your weights: Net gold weight (45g) cannot exceed gross physical weight (40g). Please provide the correct weights where net gold weight is less than or equal to gross weight."
            }
          }
        ]
      });

      const response = await chatWithAssistant([
        {
          role: "user",
          content: "Calculate my quote: gross weight is 40g and net weight is 45g with 22 karat."
        }
      ]);

      expect(response.toolExecutions.length).toBe(1);
      expect(response.toolExecutions[0].toolName).toBe("calculate_quote");
      expect(response.message).toContain("cannot exceed gross physical weight");
    });
  });

  // ==========================================
  // 3. API Endpoint /api/v1/assistant/chat Tests
  // ==========================================
  describe("POST /api/v1/assistant/chat API route", () => {
    it("returns 200 with assistant response for valid message array", async () => {
      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Hello! I am Goldie, your AuLoanDesk assistant. How can I help you today?"
            }
          }
        ]
      });

      const res = await request(app)
        .post("/api/v1/assistant/chat")
        .send({
          messages: [{ role: "user", content: "Hello" }]
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("message");
      expect(res.body.data.message).toContain("Goldie");
    });

    it("returns 400 for empty or invalid message payload", async () => {
      const res = await request(app)
        .post("/api/v1/assistant/chat")
        .send({
          messages: []
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });

    it("returns structured applicationSummary data in API response when model outputs application summary block", async () => {
      const summaryJson = JSON.stringify({
        fullName: "Vikram Malhotra",
        maskedMobileNumber: "9876XXXX88",
        grossWeightGrams: 60,
        netWeightGrams: 55,
        karat: 22,
        schemeName: "Monthly EMI",
        annualInterestRate: 10.5,
        tenureMonths: 12,
        eligibleLoan: 264687
      });

      mockGroqChatCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: `Please review your loan application details:\n\`\`\`application-summary\n${summaryJson}\n\`\`\`\nDo you confirm and authorize this gold loan application? (Yes/No)`
            }
          }
        ]
      });

      const res = await request(app)
        .post("/api/v1/assistant/chat")
        .send({
          messages: [{ role: "user", content: "I want to apply" }]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationSummary).toBeDefined();
      expect(res.body.data.applicationSummary.fullName).toBe("Vikram Malhotra");
      expect(res.body.data.applicationSummary.maskedMobileNumber).toBe("9876XXXX88");
      expect(res.body.data.applicationSummary.eligibleLoan).toBe(264687);
      expect(res.body.data.applicationSummary.schemeName).toBe("Monthly EMI");
      // Verify raw JSON block was stripped from conversational message text
      expect(res.body.data.message).not.toContain("```application-summary");
      expect(res.body.data.message).toContain("Do you confirm");
    });
  });
});
