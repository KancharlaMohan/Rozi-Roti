import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, SUBJECT_A, SUBJECT_B } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("POST /v1/employers", () => {
  it("registers a new employer", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/employers",
      headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A,
        companyName: "Acme Corp",
        description: "Global company",
        website: "https://acme.example.com",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.companyName).toBe("Acme Corp");
    expect(body.coreSubjectId).toBe(SUBJECT_A);
  });

  it("rejects duplicate employer registration", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/employers",
      headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/employers",
      headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme Again" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("rejects subject mismatch", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/employers",
      headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_B, companyName: "Evil" },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("GET /v1/employers/me", () => {
  it("returns 404 if not registered", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/employers/me",
      headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns employer profile after registration", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/employers",
      headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, companyName: "Acme" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/v1/employers/me",
      headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).companyName).toBe("Acme");
  });
});
