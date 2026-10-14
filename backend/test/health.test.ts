import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /health", () => {
  it("returns 200 with status ok and expected payload structure", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body.data).toMatchObject({
      status: "ok",
      environment: expect.any(String)
    });
    expect(typeof response.body.data.uptime).toBe("number");
    expect(typeof response.body.data.timestamp).toBe("string");
  });

  it("returns 404 for an unregistered route with consistent error structure", async () => {
    const response = await request(app).get("/api/v1/unknown-endpoint");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route GET /api/v1/unknown-endpoint not found"
      }
    });
  });
});
