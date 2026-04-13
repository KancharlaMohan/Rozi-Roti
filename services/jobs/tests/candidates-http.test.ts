import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, SUBJECT_A, SUBJECT_B } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("POST /v1/candidates/profile", () => {
  it("creates a candidate profile", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/candidates/profile",
      headers: authHeader(SUBJECT_B),
      payload: {
        coreSubjectId: SUBJECT_B,
        displayName: "Jane Doe",
        headline: "Full-stack developer",
        summary: "5 years experience with TypeScript",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.displayName).toBe("Jane Doe");
    expect(body.coreSubjectId).toBe(SUBJECT_B);
  });

  it("upserts on subsequent calls", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/candidates/profile",
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, displayName: "Jane" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/candidates/profile",
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, displayName: "Jane Updated" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).displayName).toBe("Jane Updated");
  });
});

describe("GET /v1/candidates/profile", () => {
  it("returns 404 if no profile", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/candidates/profile",
      headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns profile after creation", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/candidates/profile",
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, displayName: "Jane" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/v1/candidates/profile",
      headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).displayName).toBe("Jane");
  });
});
