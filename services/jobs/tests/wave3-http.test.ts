import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, adminAuthHeader, SUBJECT_A, SUBJECT_B, ADMIN_SUBJECT } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("Privacy settings (Wave 3a)", () => {
  it("gets default privacy settings", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/candidates/privacy", headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.profileVisibility).toBe("employers_only");
    expect(body.resumeVisible).toBe(true);
  });

  it("updates privacy settings", async () => {
    const res = await app.inject({
      method: "PUT", url: "/v1/candidates/privacy", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, profileVisibility: "hidden", resumeVisible: false },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.profileVisibility).toBe("hidden");
    expect(body.resumeVisible).toBe(false);
    expect(body.showFullName).toBe(true); // default preserved
  });
});

describe("Blocked employers (Wave 3a)", () => {
  it("blocks and lists blocked employers", async () => {
    // Need a real employer to block
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Bad Corp" },
    });
    const employerRes = await app.inject({
      method: "GET", url: "/v1/employers/me", headers: authHeader(SUBJECT_A),
    });
    const employerId = JSON.parse(employerRes.body).id;

    const blockRes = await app.inject({
      method: "POST", url: "/v1/candidates/blocked-employers", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, employerId },
    });
    expect(blockRes.statusCode).toBe(201);

    const listRes = await app.inject({
      method: "GET", url: "/v1/candidates/blocked-employers", headers: authHeader(SUBJECT_B),
    });
    expect(JSON.parse(listRes.body).blockedEmployers.length).toBe(1);
  });

  it("unblocks an employer", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Bad Corp" },
    });
    const employerRes = await app.inject({
      method: "GET", url: "/v1/employers/me", headers: authHeader(SUBJECT_A),
    });
    const employerId = JSON.parse(employerRes.body).id;

    await app.inject({
      method: "POST", url: "/v1/candidates/blocked-employers", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, employerId },
    });
    await app.inject({
      method: "DELETE", url: `/v1/candidates/blocked-employers/${employerId}`, headers: authHeader(SUBJECT_B),
    });
    const listRes = await app.inject({
      method: "GET", url: "/v1/candidates/blocked-employers", headers: authHeader(SUBJECT_B),
    });
    expect(JSON.parse(listRes.body).blockedEmployers.length).toBe(0);
  });
});

describe("Flagging (Wave 3b)", () => {
  it("flags a job posting", async () => {
    const res = await app.inject({
      method: "POST", url: "/v1/flags", headers: authHeader(SUBJECT_B),
      payload: {
        coreSubjectId: SUBJECT_B,
        entityType: "job_posting",
        entityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        flagReason: "scam",
        description: "Asks for upfront payment",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).flagReason).toBe("scam");
  });
});

describe("Admin moderation queue (Wave 3b)", () => {
  it("rejects non-admin access", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/admin/moderation/queue", headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBe("forbidden");
  });

  it("admin lists moderation queue", async () => {
    // Create a flag to populate the queue
    await app.inject({
      method: "POST", url: "/v1/flags", headers: authHeader(SUBJECT_B),
      payload: {
        coreSubjectId: SUBJECT_B, entityType: "employer",
        entityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", flagReason: "spam",
      },
    });

    const res = await app.inject({
      method: "GET", url: "/v1/admin/moderation/queue", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("admin takes action on queue item", async () => {
    await app.inject({
      method: "POST", url: "/v1/flags", headers: authHeader(SUBJECT_B),
      payload: {
        coreSubjectId: SUBJECT_B, entityType: "job_posting",
        entityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", flagReason: "inappropriate",
      },
    });

    const queueRes = await app.inject({
      method: "GET", url: "/v1/admin/moderation/queue", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    const queueItemId = JSON.parse(queueRes.body).items[0].id;

    const actionRes = await app.inject({
      method: "POST", url: `/v1/admin/moderation/${queueItemId}/action`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, action: "reject", notes: "Confirmed inappropriate" },
    });
    expect(actionRes.statusCode).toBe(200);
    expect(JSON.parse(actionRes.body).action).toBe("reject");
  });
});

describe("Employer verification (Wave 3c)", () => {
  it("employer requests verification", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Legit Corp" },
    });

    const res = await app.inject({
      method: "POST", url: "/v1/employers/verification-request", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).status).toBe("pending");
  });

  it("employer checks verification status", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Legit Corp" },
    });
    await app.inject({
      method: "POST", url: "/v1/employers/verification-request", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A },
    });

    const res = await app.inject({
      method: "GET", url: "/v1/employers/verification-status", headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe("pending");
  });

  it("admin verifies employer", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Legit Corp" },
    });
    const employerRes = await app.inject({
      method: "GET", url: "/v1/employers/me", headers: authHeader(SUBJECT_A),
    });
    const employerId = JSON.parse(employerRes.body).id;

    await app.inject({
      method: "POST", url: "/v1/employers/verification-request", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A },
    });

    const verifyRes = await app.inject({
      method: "POST", url: `/v1/admin/employers/${employerId}/verify`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, status: "verified", notes: "Documents confirmed" },
    });
    expect(verifyRes.statusCode).toBe(200);
    expect(JSON.parse(verifyRes.body).status).toBe("verified");
  });
});
