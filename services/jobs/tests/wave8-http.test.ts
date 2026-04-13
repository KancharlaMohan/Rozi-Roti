import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, adminAuthHeader, SUBJECT_A, ADMIN_SUBJECT } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("Subscription tiers (Wave 8)", () => {
  it("lists empty tiers initially", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/subscription-tiers" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).tiers).toEqual([]);
  });

  it("admin creates a tier", async () => {
    const res = await app.inject({
      method: "POST", url: "/v1/admin/subscription-tiers", headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: {
        coreSubjectId: ADMIN_SUBJECT, name: "Employer Pro",
        tierType: "employer", features: { maxPostings: 50, candidateSearch: true },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).name).toBe("Employer Pro");
    expect(JSON.parse(res.body).tierType).toBe("employer");
  });

  it("admin grants subscription", async () => {
    // Create tier
    const tierRes = await app.inject({
      method: "POST", url: "/v1/admin/subscription-tiers", headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, name: "Premium", tierType: "candidate" },
    });
    const tierId = JSON.parse(tierRes.body).id;

    // Grant subscription
    const grantRes = await app.inject({
      method: "POST", url: "/v1/admin/subscriptions", headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: {
        coreSubjectId: ADMIN_SUBJECT, subjectId: SUBJECT_A, tierId,
        startsAt: "2026-01-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z",
      },
    });
    expect(grantRes.statusCode).toBe(201);
    expect(JSON.parse(grantRes.body).status).toBe("active");
  });

  it("user gets own subscription", async () => {
    // Create tier + grant
    const tierRes = await app.inject({
      method: "POST", url: "/v1/admin/subscription-tiers", headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, name: "Pro", tierType: "employer" },
    });
    const tierId = JSON.parse(tierRes.body).id;
    await app.inject({
      method: "POST", url: "/v1/admin/subscriptions", headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, subjectId: SUBJECT_A, tierId, startsAt: "2026-01-01T00:00:00Z" },
    });

    const res = await app.inject({
      method: "GET", url: "/v1/subscriptions/me", headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).tierName).toBe("Pro");
  });

  it("returns 404 when no subscription", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/subscriptions/me", headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(404);
  });
});
