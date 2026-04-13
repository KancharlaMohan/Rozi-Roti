import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, adminAuthHeader, SUBJECT_A, SUBJECT_B, ADMIN_SUBJECT } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("Employer analytics (Wave 5a)", () => {
  it("returns empty analytics for new employer", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme" },
    });
    const res = await app.inject({
      method: "GET", url: "/v1/employers/analytics/jobs", headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalViews).toBe(0);
    expect(body.totalApplications).toBe(0);
  });
});

describe("Candidate analytics (Wave 5a)", () => {
  it("returns analytics for candidate with profile", async () => {
    await app.inject({
      method: "POST", url: "/v1/candidates/profile", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, displayName: "Jane" },
    });
    const res = await app.inject({
      method: "GET", url: "/v1/candidates/analytics", headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.profileViews).toBe(0);
    expect(body.applicationsSent).toBe(0);
    expect(body.successRate).toBe(0);
  });
});

describe("Admin tools (Wave 5b)", () => {
  it("admin suspends an employer", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Bad Corp" },
    });
    const employerRes = await app.inject({
      method: "GET", url: "/v1/employers/me", headers: authHeader(SUBJECT_A),
    });
    const employerId = JSON.parse(employerRes.body).id;

    const res = await app.inject({
      method: "PUT", url: `/v1/admin/employers/${employerId}/suspend`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, reason: "Fraud" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).actionType).toBe("suspend");
  });

  it("admin views audit log", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/admin/audit-log", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).total).toBeGreaterThanOrEqual(0);
  });

  it("non-admin cannot access admin endpoints", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/admin/audit-log", headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("Company reviews (Wave 5c)", () => {
  it("submits a company review", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme Corp" },
    });
    const employerRes = await app.inject({
      method: "GET", url: "/v1/employers/me", headers: authHeader(SUBJECT_A),
    });
    const employerId = JSON.parse(employerRes.body).id;

    const res = await app.inject({
      method: "POST", url: `/v1/employers/${employerId}/reviews`, headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, overallRating: 4, title: "Great company", pros: "Good culture", cons: "Long hours" },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).overallRating).toBe(4);
    expect(JSON.parse(res.body).status).toBe("pending_review");
  });

  it("lists public reviews (only approved)", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme Corp" },
    });
    const employerRes = await app.inject({
      method: "GET", url: "/v1/employers/me", headers: authHeader(SUBJECT_A),
    });
    const employerId = JSON.parse(employerRes.body).id;

    // Submit a review (pending_review, not approved — shouldn't show)
    await app.inject({
      method: "POST", url: `/v1/employers/${employerId}/reviews`, headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, overallRating: 5, title: "Amazing" },
    });

    const res = await app.inject({ method: "GET", url: `/v1/employers/${employerId}/reviews` });
    expect(res.statusCode).toBe(200);
    // Review is pending_review, not approved, so it shouldn't appear in public list
    expect(JSON.parse(res.body).reviews.length).toBe(0);
  });
});
