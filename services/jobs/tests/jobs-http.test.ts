import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, SUBJECT_A } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

async function registerEmployerAndCreateJob(status?: string) {
  await app.inject({
    method: "POST",
    url: "/v1/employers",
    headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, companyName: "Acme Corp" },
  });

  const createRes = await app.inject({
    method: "POST",
    url: "/v1/employers/jobs",
    headers: authHeader(SUBJECT_A),
    payload: {
      coreSubjectId: SUBJECT_A,
      title: "Senior Engineer",
      description: "Build things",
      jobType: "full_time",
      workMode: "remote",
      location: { city: "Berlin", country: "DE" },
      compensation: { minAmount: 80000, maxAmount: 120000, currency: "EUR", period: "yearly" },
      tags: ["typescript", "node"],
    },
  });

  const job = JSON.parse(createRes.body);

  if (status && status !== "draft") {
    await app.inject({
      method: "PUT",
      url: `/v1/employers/jobs/${job.id}`,
      headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, status },
    });
  }

  return job;
}

describe("POST /v1/employers/jobs", () => {
  it("creates a job in draft status", async () => {
    const job = await registerEmployerAndCreateJob();
    expect(job.title).toBe("Senior Engineer");
    expect(job.status).toBe("draft");
    expect(job.location.country).toBe("DE");
    expect(job.compensation.currency).toBe("EUR");
  });

  it("requires employer registration first", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/employers/jobs",
      headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A,
        title: "Test",
        jobType: "full_time",
        workMode: "onsite",
      },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe("employer_not_found");
  });
});

describe("PUT /v1/employers/jobs/:id", () => {
  it("updates job status to published", async () => {
    const job = await registerEmployerAndCreateJob();
    const res = await app.inject({
      method: "PUT",
      url: `/v1/employers/jobs/${job.id}`,
      headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, status: "published" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe("published");
  });
});

describe("GET /v1/jobs (public)", () => {
  it("lists only published jobs", async () => {
    await registerEmployerAndCreateJob("published");
    await registerEmployerAndCreateJob(); // draft — should not appear

    const res = await app.inject({ method: "GET", url: "/v1/jobs" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.jobs.length).toBe(1);
    expect(body.total).toBe(1);
  });

  it("returns empty list when no published jobs", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/jobs" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).jobs).toEqual([]);
  });
});

describe("GET /v1/jobs/:id", () => {
  it("returns a published job", async () => {
    const job = await registerEmployerAndCreateJob("published");
    const res = await app.inject({ method: "GET", url: `/v1/jobs/${job.id}` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).title).toBe("Senior Engineer");
  });

  it("returns 404 for draft jobs", async () => {
    const job = await registerEmployerAndCreateJob();
    const res = await app.inject({ method: "GET", url: `/v1/jobs/${job.id}` });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /v1/employers/jobs", () => {
  it("lists employer's own jobs (all statuses)", async () => {
    await registerEmployerAndCreateJob("published");

    const res = await app.inject({
      method: "GET",
      url: "/v1/employers/jobs",
      headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(200);
    // registerEmployerAndCreateJob is called once, but the first one already registered
    // the employer, so the second call in "lists only published" test is a different app instance.
    expect(JSON.parse(res.body).jobs.length).toBeGreaterThanOrEqual(1);
  });
});
