import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { resetGoldRateCache } from "../src/services/gold-rate.service.js";

describe("B1: Backend Hardening Integration Tests", () => {
  let schemeId = "";
  const TEST_PREFIX = "989911";
  const MOBILE_1 = `${TEST_PREFIX}0001`; // 9899110001
  const MOBILE_2 = `${TEST_PREFIX}0002`; // 9899110002
  const MOBILE_3 = `${TEST_PREFIX}0003`; // 9899110003
  const MOBILE_4 = `${TEST_PREFIX}0004`; // 9899110004
  const MOBILE_5 = `${TEST_PREFIX}0005`; // 9899110005
  const MOBILE_CONCURRENT = `${TEST_PREFIX}0006`; // 9899110006

  async function cleanupTestData() {
    // Delete test applications and audits
    const testApps = await prisma.loanApplication.findMany({
      where: {
        mobileNumber: {
          startsWith: TEST_PREFIX
        }
      },
      select: { id: true }
    });

    const testAppIds = testApps.map((a) => a.id);
    if (testAppIds.length > 0) {
      await prisma.applicationStatusAudit.deleteMany({
        where: {
          applicationId: { in: testAppIds }
        }
      });
      await prisma.loanApplication.deleteMany({
        where: {
          id: { in: testAppIds }
        }
      });
    }

    // Delete test idempotency records
    await prisma.idempotencyRecord.deleteMany({
      where: {
        key: {
          startsWith: "test-"
        }
      }
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    const scheme = await prisma.loanScheme.findFirst({
      where: { code: "PLAN_BULLET_01", isActive: true }
    });
    if (!scheme) {
      throw new Error("PLAN_BULLET_01 scheme not found in database. Please run seed.");
    }
    schemeId = scheme.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // =========================================================================
  // 1. IDEMPOTENCY
  // =========================================================================
  describe("1. Idempotency Support on POST /api/v1/leads", () => {
    const key = `test-idemp-${Date.now()}`;
    const payload = {
      fullName: "Vikram Rathore",
      mobileNumber: MOBILE_1,
      grossWeightGrams: 40,
      netWeightGrams: 35,
      karat: 22,
      schemeId: ""
    };

    beforeAll(() => {
      payload.schemeId = schemeId;
    });

    it("creates lead on initial request with Idempotency-Key header", async () => {
      const res = await request(app)
        .post("/api/v1/leads")
        .set("Idempotency-Key", key)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("applicationId");
      expect(res.body.data).toHaveProperty("applicationNumber");
      expect(res.body.data.fullName).toBe("Vikram Rathore");

      // Verify stored in DB
      const dbRecord = await prisma.idempotencyRecord.findUnique({
        where: { key }
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.responseStatus).toBe(201);
    });

    it("returns identical cached response without creating duplicate application on replay", async () => {
      const countBefore = await prisma.loanApplication.count({
        where: { mobileNumber: MOBILE_1 }
      });

      const res = await request(app)
        .post("/api/v1/leads")
        .set("Idempotency-Key", key)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe("Vikram Rathore");

      const countAfter = await prisma.loanApplication.count({
        where: { mobileNumber: MOBILE_1 }
      });

      // No new row created in database
      expect(countAfter).toBe(countBefore);
      expect(countAfter).toBe(1);
    });

    it("rejects reuse of same Idempotency-Key with different payload with 400 IDEMPOTENCY_PAYLOAD_MISMATCH", async () => {
      const modifiedPayload = {
        ...payload,
        netWeightGrams: 30 // Changed weight
      };

      const res = await request(app)
        .post("/api/v1/leads")
        .set("Idempotency-Key", key)
        .send(modifiedPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("IDEMPOTENCY_PAYLOAD_MISMATCH");
    });

    it("rejects invalid/too short Idempotency-Key", async () => {
      const res = await request(app)
        .post("/api/v1/leads")
        .set("Idempotency-Key", "ab")
        .send({
          ...payload,
          mobileNumber: MOBILE_2
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_IDEMPOTENCY_KEY");
    });

    it("safely handles concurrent requests using the identical key without duplicates", async () => {
      const concurrentKey = `test-concurrent-key-${Date.now()}`;
      const concurrentPayload = {
        fullName: "Concurrent Key Applicant",
        mobileNumber: MOBILE_2,
        grossWeightGrams: 30,
        netWeightGrams: 28,
        karat: 22,
        schemeId
      };

      // Fire 2 simultaneous requests with the exact same Idempotency-Key
      const [resA, resB] = await Promise.all([
        request(app)
          .post("/api/v1/leads")
          .set("Idempotency-Key", concurrentKey)
          .send(concurrentPayload),
        request(app)
          .post("/api/v1/leads")
          .set("Idempotency-Key", concurrentKey)
          .send(concurrentPayload)
      ]);

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
      // Both return the exact same application ID
      expect(resA.body.data.applicationId).toBe(resB.body.data.applicationId);
      expect(resA.body.data.applicationNumber).toBe(resB.body.data.applicationNumber);

      // Verify only 1 application row in database
      const count = await prisma.loanApplication.count({
        where: { mobileNumber: MOBILE_2 }
      });
      expect(count).toBe(1);
    });
  });

  // =========================================================================
  // 2. CONCURRENCY-SAFE DUPLICATE DETECTION
  // =========================================================================
  describe("2. Concurrency-Safe Duplicate Mobile Detection", () => {
    it("simultaneous requests for same mobile number yield 1 success and 1 conflict with existingApplicationId", async () => {
      const payloadA = {
        fullName: "Rohan Sharma A",
        mobileNumber: MOBILE_CONCURRENT,
        grossWeightGrams: 25,
        netWeightGrams: 20,
        karat: 22,
        schemeId
      };

      const payloadB = {
        fullName: "Rohan Sharma B",
        mobileNumber: MOBILE_CONCURRENT,
        grossWeightGrams: 25,
        netWeightGrams: 20,
        karat: 22,
        schemeId
      };

      // Launch both at the exact same millisecond with distinct idempotency keys
      const [res1, res2] = await Promise.all([
        request(app)
          .post("/api/v1/leads")
          .set("Idempotency-Key", `test-dup-race-1-${Date.now()}`)
          .send(payloadA),
        request(app)
          .post("/api/v1/leads")
          .set("Idempotency-Key", `test-dup-race-2-${Date.now()}`)
          .send(payloadB)
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const successRes = res1.status === 201 ? res1 : res2;
      const conflictRes = res1.status === 409 ? res1 : res2;

      expect(successRes.body.success).toBe(true);
      expect(successRes.body.data.applicationId).toBeDefined();

      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error.code).toBe("DUPLICATE_APPLICATION");
      expect(conflictRes.body.error.existingApplicationId).toBe(successRes.body.data.applicationId);

      // Verify only 1 application in DB
      const count = await prisma.loanApplication.count({
        where: { mobileNumber: MOBILE_CONCURRENT }
      });
      expect(count).toBe(1);
    });
  });

  // =========================================================================
  // 3. APPLICATION STATUS WORKFLOW
  // =========================================================================
  describe("3. Application Status Workflow (Transitions & Admin Updates)", () => {
    let testLeadId = "";

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/v1/leads")
        .send({
          fullName: "Status Workflow Applicant",
          mobileNumber: MOBILE_3,
          grossWeightGrams: 30,
          netWeightGrams: 28,
          karat: 24,
          schemeId
        });
      testLeadId = res.body?.data?.applicationId;
    });

    it("initial status of new lead is SUBMITTED", async () => {
      const lead = await prisma.loanApplication.findUnique({
        where: { id: testLeadId }
      });
      expect(lead?.status).toBe("SUBMITTED");
    });

    it("rejects direct jump from SUBMITTED to APPROVED (must be reviewed first)", async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/status`)
        .send({
          status: "APPROVED",
          actor: "Underwriter John"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("allows valid transition SUBMITTED -> UNDER_REVIEW", async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/status`)
        .send({
          status: "UNDER_REVIEW",
          actor: "Loan Officer Amit",
          notes: "Verification in progress"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.status).toBe("UNDER_REVIEW");
      expect(res.body.data.audit.previousStatus).toBe("SUBMITTED");
      expect(res.body.data.audit.newStatus).toBe("UNDER_REVIEW");
      expect(res.body.data.audit.actor).toBe("Loan Officer Amit");
    });

    it("rejects transition to the SAME status (UNDER_REVIEW -> UNDER_REVIEW)", async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/status`)
        .send({
          status: "UNDER_REVIEW",
          actor: "Loan Officer Amit"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SAME_STATUS_TRANSITION");
    });

    it("allows valid transition UNDER_REVIEW -> APPROVED", async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/status`)
        .send({
          status: "APPROVED",
          actor: "Credit Manager Priya",
          notes: "Gold purity verified, KYC clear"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.status).toBe("APPROVED");
      expect(res.body.data.audit.previousStatus).toBe("UNDER_REVIEW");
      expect(res.body.data.audit.newStatus).toBe("APPROVED");
    });

    it("rejects transition from terminal APPROVED state to REJECTED", async () => {
      const res = await request(app)
        .patch(`/api/v1/leads/${testLeadId}/status`)
        .send({
          status: "REJECTED",
          actor: "Credit Manager Priya"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("allows SUBMITTED -> REJECTED directly", async () => {
      const createRes = await request(app)
        .post("/api/v1/leads")
        .send({
          fullName: "Fast Reject Applicant",
          mobileNumber: MOBILE_4,
          grossWeightGrams: 20,
          netWeightGrams: 18,
          karat: 18,
          schemeId
        });

      const fastRejectId = createRes.body.data.applicationId;

      const patchRes = await request(app)
        .patch(`/api/v1/leads/${fastRejectId}/status`)
        .send({
          status: "REJECTED",
          actor: "Risk System",
          notes: "Fraud risk detected"
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.application.status).toBe("REJECTED");
    });
  });

  // =========================================================================
  // 4. AUDIT LOG PERSISTENCE
  // =========================================================================
  describe("4. Audit Log Persistence", () => {
    let auditLeadId = "";

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/v1/leads")
        .send({
          fullName: "Audited Applicant",
          mobileNumber: MOBILE_5,
          grossWeightGrams: 25,
          netWeightGrams: 22,
          karat: 22,
          schemeId
        });
      auditLeadId = res.body?.data?.applicationId;

      // Make 2 transitions: SUBMITTED -> UNDER_REVIEW -> APPROVED
      await request(app)
        .patch(`/api/v1/leads/${auditLeadId}/status`)
        .send({
          status: "UNDER_REVIEW",
          actor: "Reviewer 1",
          notes: "Initial check"
        });

      await request(app)
        .patch(`/api/v1/leads/${auditLeadId}/status`)
        .send({
          status: "APPROVED",
          actor: "Approver 2",
          notes: "Final approval granted"
        });
    });

    it("persists audit entries in PostgreSQL and retrieves via GET /api/v1/leads/:id/audits", async () => {
      const res = await request(app).get(`/api/v1/leads/${auditLeadId}/audits`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const [audit1, audit2] = res.body.data;

      expect(audit1.previousStatus).toBe("SUBMITTED");
      expect(audit1.newStatus).toBe("UNDER_REVIEW");
      expect(audit1.actor).toBe("Reviewer 1");
      expect(audit1.notes).toBe("Initial check");
      expect(audit1.createdAt).toBeDefined();

      expect(audit2.previousStatus).toBe("UNDER_REVIEW");
      expect(audit2.newStatus).toBe("APPROVED");
      expect(audit2.actor).toBe("Approver 2");
      expect(audit2.notes).toBe("Final approval granted");

      // Verify in DB directly
      const dbAudits = await prisma.applicationStatusAudit.findMany({
        where: { applicationId: auditLeadId },
        orderBy: { createdAt: "asc" }
      });
      expect(dbAudits.length).toBe(2);
      expect(dbAudits[0].newStatus).toBe("UNDER_REVIEW");
      expect(dbAudits[1].newStatus).toBe("APPROVED");
    });

    it("returns 404 for non-existent lead audit query", async () => {
      const res = await request(app).get("/api/v1/leads/00000000-0000-0000-0000-000000000000/audits");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("LEAD_NOT_FOUND");
    });
  });

  // =========================================================================
  // 5. CACHED GOLD RATE ENDPOINT
  // =========================================================================
  describe("5. Cached Gold Rate Endpoint (GET /api/v1/gold-rate)", () => {
    beforeAll(() => {
      resetGoldRateCache();
    });

    it("returns authoritative gold rate of ₹7,000/g with cache metadata", async () => {
      const res1 = await request(app).get("/api/v1/gold-rate");

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.rate24kPerGram).toBe(7000);
      expect(res1.body.data.currency).toBe("INR");
      expect(res1.body.data.fromCache).toBe(false);
      expect(res1.body.data.notes).toBeDefined();

      // Subsequent call hits cache
      const res2 = await request(app).get("/api/v1/gold-rate");
      expect(res2.status).toBe(200);
      expect(res2.body.data.rate24kPerGram).toBe(7000);
      expect(res2.body.data.fromCache).toBe(true);
    });

    it("quotes calculation uses the authoritative cached rate", async () => {
      const res = await request(app)
        .post("/api/v1/quotes")
        .send({
          grossWeightGrams: 50,
          netWeightGrams: 45,
          karat: 22
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rate24kPerGram).toBe(7000);
      expect(res.body.data.goldValue).toBe(288750);
    });
  });
});
