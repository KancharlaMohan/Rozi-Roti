import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, adminAuthHeader, SUBJECT_A, ADMIN_SUBJECT } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("Ad placements (Wave 6a)", () => {
  it("admin creates and lists placements", async () => {
    const createRes = await app.inject({
      method: "POST", url: "/v1/admin/ad-placements", headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, placementType: "banner", name: "Top Banner", description: "Homepage top" },
    });
    expect(createRes.statusCode).toBe(201);
    expect(JSON.parse(createRes.body).placementType).toBe("banner");

    const listRes = await app.inject({
      method: "GET", url: "/v1/admin/ad-placements", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    expect(listRes.statusCode).toBe(200);
    expect(JSON.parse(listRes.body).placements.length).toBe(1);
  });
});

describe("Ad campaigns (Wave 6a)", () => {
  it("employer creates and lists campaigns", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme" },
    });

    const createRes = await app.inject({
      method: "POST", url: "/v1/employers/ad-campaigns", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, name: "Q2 Hiring Push", budget: 5000, currency: "USD" },
    });
    expect(createRes.statusCode).toBe(201);
    expect(JSON.parse(createRes.body).name).toBe("Q2 Hiring Push");

    const listRes = await app.inject({
      method: "GET", url: "/v1/employers/ad-campaigns", headers: authHeader(SUBJECT_A),
    });
    expect(listRes.statusCode).toBe(200);
    expect(JSON.parse(listRes.body).campaigns.length).toBe(1);
  });
});

describe("Ad serving (Wave 6a)", () => {
  it("serves null when no active ads", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/ads/serve?placement=banner" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).creative).toBeNull();
  });

  it("records ad clicks", async () => {
    const res = await app.inject({
      method: "POST", url: "/v1/ads/some-creative-id/click",
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });
});

describe("Campaign analytics (Wave 6d)", () => {
  it("returns analytics for own campaign", async () => {
    await app.inject({
      method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme" },
    });
    const campaignRes = await app.inject({
      method: "POST", url: "/v1/employers/ad-campaigns", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, name: "Test Campaign" },
    });
    const campaignId = JSON.parse(campaignRes.body).id;

    const analyticsRes = await app.inject({
      method: "GET", url: `/v1/employers/ad-campaigns/${campaignId}/analytics`, headers: authHeader(SUBJECT_A),
    });
    expect(analyticsRes.statusCode).toBe(200);
    const body = JSON.parse(analyticsRes.body);
    expect(body.totalImpressions).toBe(0);
    expect(body.totalClicks).toBe(0);
    expect(body.ctr).toBe(0);
  });
});
