import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, SUBJECT_A, SUBJECT_B } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

async function registerEmployer() {
  await app.inject({
    method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, companyName: "Acme Corp" },
  });
}

async function createPublishedJob() {
  await registerEmployer();
  const jobRes = await app.inject({
    method: "POST", url: "/v1/employers/jobs", headers: authHeader(SUBJECT_A),
    payload: {
      coreSubjectId: SUBJECT_A, title: "Engineer", jobType: "full_time", workMode: "remote",
      requiredSkills: ["TypeScript", "Node.js"], industry: "Technology", experienceLevel: "mid",
    },
  });
  const job = JSON.parse(jobRes.body);
  await app.inject({
    method: "PUT", url: `/v1/employers/jobs/${job.id}`, headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, status: "published" },
  });
  return job;
}

describe("Enhanced job search (Wave 2a)", () => {
  it("returns enriched job fields", async () => {
    const job = await createPublishedJob();
    const res = await app.inject({ method: "GET", url: "/v1/jobs" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.jobs.length).toBe(1);
    expect(body.jobs[0].requiredSkills).toEqual(["TypeScript", "Node.js"]);
    expect(body.jobs[0].industry).toBe("Technology");
    expect(body.jobs[0].experienceLevel).toBe("mid");
    expect(body.jobs[0].expiresAt).toBeNull();
  });
});

describe("Job lifecycle (Wave 2c)", () => {
  it("reposts a closed job as a new draft", async () => {
    const job = await createPublishedJob();
    // Close the job
    await app.inject({
      method: "PUT", url: `/v1/employers/jobs/${job.id}`, headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, status: "closed" },
    });
    // Repost
    const repostRes = await app.inject({
      method: "POST", url: `/v1/employers/jobs/${job.id}/repost`, headers: authHeader(SUBJECT_A),
    });
    expect(repostRes.statusCode).toBe(201);
    const reposted = JSON.parse(repostRes.body);
    expect(reposted.id).not.toBe(job.id); // new ID
    expect(reposted.title).toBe("Engineer");
    expect(reposted.status).toBe("draft");
  });

  it("rejects repost of a published job", async () => {
    const job = await createPublishedJob();
    const res = await app.inject({
      method: "POST", url: `/v1/employers/jobs/${job.id}/repost`, headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe("invalid_status");
  });
});

describe("Job templates (Wave 2d)", () => {
  it("creates and lists templates", async () => {
    await registerEmployer();
    const createRes = await app.inject({
      method: "POST", url: "/v1/employers/templates", headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A, name: "Standard Engineer", title: "Software Engineer",
        jobType: "full_time", workMode: "remote", requiredSkills: ["TypeScript"],
      },
    });
    expect(createRes.statusCode).toBe(201);
    expect(JSON.parse(createRes.body).name).toBe("Standard Engineer");

    const listRes = await app.inject({
      method: "GET", url: "/v1/employers/templates", headers: authHeader(SUBJECT_A),
    });
    expect(listRes.statusCode).toBe(200);
    expect(JSON.parse(listRes.body).templates.length).toBe(1);
  });

  it("deletes a template", async () => {
    await registerEmployer();
    const createRes = await app.inject({
      method: "POST", url: "/v1/employers/templates", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, name: "Temp", title: "Temp Job" },
    });
    const id = JSON.parse(createRes.body).id;
    await app.inject({ method: "DELETE", url: `/v1/employers/templates/${id}`, headers: authHeader(SUBJECT_A) });
    const listRes = await app.inject({ method: "GET", url: "/v1/employers/templates", headers: authHeader(SUBJECT_A) });
    expect(JSON.parse(listRes.body).templates.length).toBe(0);
  });
});

describe("Recently viewed (Wave 2e)", () => {
  it("returns empty list when nothing viewed", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/candidates/recently-viewed", headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).total).toBe(0);
  });
});

describe("Screening questions (Wave 2f)", () => {
  it("creates a job with screening questions", async () => {
    await registerEmployer();
    const jobRes = await app.inject({
      method: "POST", url: "/v1/employers/jobs", headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A, title: "Designer", jobType: "contract", workMode: "onsite",
        screeningQuestions: [
          { questionText: "Why do you want this role?", required: true },
          { questionText: "Portfolio link?", required: false },
        ],
      },
    });
    expect(jobRes.statusCode).toBe(201);
    // The job is created — screening questions stored separately
  });
});
