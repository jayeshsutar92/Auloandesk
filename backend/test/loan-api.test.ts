import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";

describe("AuLoanDesk Backend APIs (Phase 3)", () => {
  let bulletSchemeId = "";
  let emiSchemeId = "";

  const TEST_MOBILE_PREFIX = "9876500";
  const TEST_MOBILE_1 = `${TEST_MOBILE_PREFIX}001`; // 9876500001
  const TEST_MOBILE_2 = `${TEST_MOBILE_PREFIX}002`; // 9876500002
  const TEST_MOBILE_DUP = `${TEST_MOBILE_PREFIX}003`; // 9876500003

  async function cleanupTestData() {
    await prisma.loanApplication.deleteMany({
      where: {
        mobileNumber: {
          startsWith: TEST_MOBILE_PREFIX
        }
      }
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    // Query active seeded schemes
    const schemes = await prisma.loanScheme.findMany({
      where: { isActive: true }
    });

    const bullet = schemes.find((s) => s.code === "PLAN_BULLET_01");
    const emi = schemes.find((s) => s.code === "PLAN_EMI_01");

    if (bullet) bulletSchemeId = bullet.id;
    if (emi) emiSchemeId = emi.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ==========================================
  // A. GET /api/v1/loan-schemes
  // ==========================================
  describe("GET /api/v1/loan-schemes", () => {
    it("returns 200 with list of active loan schemes from database", async () => {
      const res = await request(app).get("/api/v1/loan-schemes");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const bullet = res.body.data.find(
        (s: { code: string }) => s.code === "PLAN_BULLET_01"
      );
      const emi = res.body.data.find(
        (s: { code: string }) => s.code === "PLAN_EMI_01"
      );

      expect(bullet).toBeDefined();
      expect(bullet.name).toBe("Bullet Repayment");
      expect(bullet.annualInterestRate).toBe(12);
      expect(bullet.tenureMonths).toBe(12);
      expect(bullet.maxLtv).toBe(0.7);

      expect(emi).toBeDefined();
      expect(emi.name).toBe("Monthly EMI");
      expect(emi.annualInterestRate).toBe(10.5);
      expect(emi.tenureMonths).toBe(12);
      expect(emi.maxLtv).toBe(0.75);
    });
  });

  // ==========================================
  // B. POST /api/v1/quotes
  // ==========================================
  describe("POST /api/v1/quotes", () => {
    it("Case 1: 45g net, 22K -> calculates ₹2,88,750 value, ₹2,16,562 EMI loan, ₹2,02,125 Bullet loan", async () => {
      const res = await request(app).post("/api/v1/quotes").send({
        grossWeightGrams: 50,
        netWeightGrams: 45,
        karat: 22
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pureGoldGrams).toBe(41.25);
      expect(res.body.data.goldValue).toBe(288750);

      const emiQuote = res.body.data.schemes.find(
        (s: { code: string }) => s.code === "PLAN_EMI_01"
      );
      const bulletQuote = res.body.data.schemes.find(
        (s: { code: string }) => s.code === "PLAN_BULLET_01"
      );

      expect(emiQuote.eligibleLoan).toBe(216562);
      expect(bulletQuote.eligibleLoan).toBe(202125);
    });

    it("Case 3: 10g net, 18K -> calculates 7.5g pure gold, ₹52,500 value, ₹39,375 EMI loan", async () => {
      const res = await request(app).post("/api/v1/quotes").send({
        grossWeightGrams: 10,
        netWeightGrams: 10,
        karat: 18
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pureGoldGrams).toBe(7.5);
      expect(res.body.data.goldValue).toBe(52500);

      const emiQuote = res.body.data.schemes.find(
        (s: { code: string }) => s.code === "PLAN_EMI_01"
      );
      expect(emiQuote.eligibleLoan).toBe(39375);
    });

    it("fails with 400 if net weight exceeds gross weight", async () => {
      const res = await request(app).post("/api/v1/quotes").send({
        grossWeightGrams: 40,
        netWeightGrams: 45,
        karat: 22
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toHaveProperty("netWeightGrams");
    });

    it("fails with 400 for unsupported gold karats (e.g., 20K)", async () => {
      const res = await request(app).post("/api/v1/quotes").send({
        grossWeightGrams: 10,
        netWeightGrams: 10,
        karat: 20
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("fails with 400 for zero or excessive weights", async () => {
      const zeroRes = await request(app).post("/api/v1/quotes").send({
        grossWeightGrams: 0,
        netWeightGrams: 0,
        karat: 22
      });
      expect(zeroRes.status).toBe(400);

      const excessiveRes = await request(app).post("/api/v1/quotes").send({
        grossWeightGrams: 1005,
        netWeightGrams: 1005,
        karat: 22
      });
      expect(excessiveRes.status).toBe(400);
    });
  });

  // ==========================================
  // C. POST /api/v1/leads
  // ==========================================
  describe("POST /api/v1/leads", () => {
    it("creates a lead successfully with HTTP 201 and masked mobile", async () => {
      const res = await request(app).post("/api/v1/leads").send({
        fullName: "Aarav Sharma",
        mobileNumber: TEST_MOBILE_1,
        grossWeightGrams: 50,
        netWeightGrams: 45,
        karat: 22,
        schemeId: emiSchemeId
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("applicationId");
      expect(res.body.data).toHaveProperty("applicationNumber");
      expect(res.body.data.status).toBe("SUBMITTED");
      expect(res.body.data.fullName).toBe("Aarav Sharma");
      expect(res.body.data.maskedMobileNumber).toBe("9876XXXX01");
      expect(res.body.data.pureGoldGrams).toBe(41.25);
      expect(res.body.data.goldValue).toBe(288750);
      expect(res.body.data.eligibleLoan).toBe(216562);
    });

    it("recalculates financial values on server even if client submits manipulated numbers", async () => {
      const res = await request(app).post("/api/v1/leads").send({
        fullName: "Pooja Verma",
        mobileNumber: TEST_MOBILE_2,
        grossWeightGrams: 10,
        netWeightGrams: 10,
        karat: 18,
        schemeId: emiSchemeId,
        // Client attempts to tamper with loan amounts
        pureGoldGrams: 999999,
        goldValue: 99999999,
        eligibleLoan: 99999999
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Server recalculated values
      expect(res.body.data.pureGoldGrams).toBe(7.5);
      expect(res.body.data.goldValue).toBe(52500);
      expect(res.body.data.eligibleLoan).toBe(39375);
    });

    it("rejects duplicate application within 7 days with HTTP 409 and existing application ID", async () => {
      // 1. Submit initial application
      const firstRes = await request(app).post("/api/v1/leads").send({
        fullName: "Rahul Gupta",
        mobileNumber: TEST_MOBILE_DUP,
        grossWeightGrams: 45,
        netWeightGrams: 45,
        karat: 22,
        schemeId: bulletSchemeId
      });

      expect(firstRes.status).toBe(201);
      const initialApplicationId = firstRes.body.data.applicationId;
      expect(initialApplicationId).toBeDefined();

      // 2. Submit second application immediately with same mobile
      const duplicateRes = await request(app).post("/api/v1/leads").send({
        fullName: "Rahul Gupta",
        mobileNumber: TEST_MOBILE_DUP,
        grossWeightGrams: 30,
        netWeightGrams: 30,
        karat: 22,
        schemeId: bulletSchemeId
      });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe("DUPLICATE_APPLICATION");
      expect(duplicateRes.body.error.existingApplicationId).toBe(initialApplicationId);
    });

    it("permits application if previous application with same mobile is older than 7 days", async () => {
      const MOBILE_OLD = `${TEST_MOBILE_PREFIX}009`;

      // 1. Create an application
      const firstRes = await request(app).post("/api/v1/leads").send({
        fullName: "Suresh Patil",
        mobileNumber: MOBILE_OLD,
        grossWeightGrams: 20,
        netWeightGrams: 20,
        karat: 22,
        schemeId: bulletSchemeId
      });

      expect(firstRes.status).toBe(201);
      const appId = firstRes.body.data.applicationId;

      // 2. Age the application to 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      await prisma.loanApplication.update({
        where: { id: appId },
        data: { createdAt: eightDaysAgo }
      });

      // 3. Re-submit with same mobile
      const secondRes = await request(app).post("/api/v1/leads").send({
        fullName: "Suresh Patil",
        mobileNumber: MOBILE_OLD,
        grossWeightGrams: 25,
        netWeightGrams: 25,
        karat: 22,
        schemeId: bulletSchemeId
      });

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.success).toBe(true);
    });

    it("fails with 404 if selected scheme ID does not exist", async () => {
      const res = await request(app).post("/api/v1/leads").send({
        fullName: "Vikram Malhotra",
        mobileNumber: "9876543219",
        grossWeightGrams: 20,
        netWeightGrams: 20,
        karat: 22,
        schemeId: "00000000-0000-0000-0000-000000000000"
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SCHEME_NOT_FOUND");
    });

    it("fails with 400 for invalid mobile numbers", async () => {
      // Must be 10 digits starting with 6-9
      const invalidRes1 = await request(app).post("/api/v1/leads").send({
        fullName: "Anil Kumar",
        mobileNumber: "5123456789", // starts with 5
        grossWeightGrams: 20,
        netWeightGrams: 20,
        karat: 22,
        schemeId: bulletSchemeId
      });
      expect(invalidRes1.status).toBe(400);

      const invalidRes2 = await request(app).post("/api/v1/leads").send({
        fullName: "Anil Kumar",
        mobileNumber: "98765432", // short length
        grossWeightGrams: 20,
        netWeightGrams: 20,
        karat: 22,
        schemeId: bulletSchemeId
      });
      expect(invalidRes2.status).toBe(400);
    });

    it("fails with 400 for names outside permitted character and length rules", async () => {
      // Name with numbers
      const numRes = await request(app).post("/api/v1/leads").send({
        fullName: "Anil123",
        mobileNumber: "9876543218",
        grossWeightGrams: 20,
        netWeightGrams: 20,
        karat: 22,
        schemeId: bulletSchemeId
      });
      expect(numRes.status).toBe(400);

      // Name too short (1 char)
      const shortRes = await request(app).post("/api/v1/leads").send({
        fullName: "A",
        mobileNumber: "9876543218",
        grossWeightGrams: 20,
        netWeightGrams: 20,
        karat: 22,
        schemeId: bulletSchemeId
      });
      expect(shortRes.status).toBe(400);

      // Name too long (> 60 chars)
      const longRes = await request(app).post("/api/v1/leads").send({
        fullName: "A".repeat(65),
        mobileNumber: "9876543218",
        grossWeightGrams: 20,
        netWeightGrams: 20,
        karat: 22,
        schemeId: bulletSchemeId
      });
      expect(longRes.status).toBe(400);
    });
  });

  // ==========================================
  // D. GET /api/v1/leads
  // ==========================================
  describe("GET /api/v1/leads", () => {
    it("returns applications in newest-first order with masked mobile numbers (9876XXXX10 format)", async () => {
      const res = await request(app).get("/api/v1/leads");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify newest-first ordering
      for (let i = 0; i < res.body.data.length - 1; i++) {
        const current = new Date(res.body.data[i].createdAt).getTime();
        const next = new Date(res.body.data[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }

      // Verify masked mobile format: 4 digits + 4 Xs + 2 digits (e.g., 9876XXXX01)
      for (const lead of res.body.data) {
        expect(lead.maskedMobileNumber).toMatch(/^\d{4}XXXX\d{2}$/);
        expect(lead).toHaveProperty("id");
        expect(lead).toHaveProperty("applicationNumber");
        expect(lead).toHaveProperty("fullName");
        expect(lead).toHaveProperty("netWeightGrams");
        expect(lead).toHaveProperty("eligibleLoan");
        expect(lead).toHaveProperty("status");
        expect(lead).toHaveProperty("scheme");
      }
    });

    it("filters leads by schemeId when provided", async () => {
      const res = await request(app).get(`/api/v1/leads?schemeId=${emiSchemeId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const lead of res.body.data) {
        expect(lead.scheme.id).toBe(emiSchemeId);
      }
    });
  });
});
