import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, SUBJECT_A, SUBJECT_B } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

async function setupEmployerWithPublishedJob() {
  await app.inject({
    method: "POST",
    url: "/v1/employers",
    headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, companyName: "Acme" },
  });
  const jobRes = await app.inject({
    method: "POST",
    url: "/v1/employers/jobs",
    headers: authHeader(SUBJECT_A),
    payload: {
      coreSubjectId: SUBJECT_A,
      title: "Engineer",
      jobType: "full_time",
      workMode: "remote",
    },
  });
  const job = JSON.parse(jobRes.body);
  await app.inject({
    method: "PUT",
    url: `/v1/employers/jobs/${job.id}`,
    headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, status: "published" },
  });
  return job;
}

async function setupCandidateProfile() {
  await app.inject({
    method: "POST",
    url: "/v1/candidates/profile",
    headers: authHeader(SUBJECT_B),
    payload: { coreSubjectId: SUBJECT_B, displayName: "Jane Doe" },
  });
}

describe("POST /v1/jobs/:id/apply", () => {
  it("applies to a published job", async () => {
    const job = await setupEmployerWithPublishedJob();
    await setupCandidateProfile();

    const res = await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/apply`,
      headers: authHeader(SUBJECT_B),
      payload: {
        coreSubjectId: SUBJECT_B,
        coverLetter: "I am interested in this role.",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("submitted");
    expect(body.jobId).toBe(job.id);
  });

  it("rejects duplicate application", async () => {
    const job = await setupEmployerWithPublishedJob();
    await setupCandidateProfile();

    await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/apply`,
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B },
    });
    const res = await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/apply`,
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B },
    });
    expect(res.statusCode).toBe(409);
  });

  it("requires candidate profile first", async () => {
    const job = await setupEmployerWithPublishedJob();

    const res = await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/apply`,
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe("profile_required");
  });
});

describe("GET /v1/candidates/applications", () => {
  it("lists candidate applications", async () => {
    const job = await setupEmployerWithPublishedJob();
    await setupCandidateProfile();
    await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/apply`,
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B },
    });

    const res = await app.inject({
      method: "GET",
      url: "/v1/candidates/applications",
      headers: authHeader(SUBJECT_B),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.applications.length).toBe(1);
    expect(body.total).toBe(1);
  });
});

describe("PUT /v1/employers/jobs/:jobId/applications/:appId/status", () => {
  it("employer updates application status", async () => {
    const job = await setupEmployerWithPublishedJob();
    await setupCandidateProfile();
    const applyRes = await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/apply`,
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B },
    });
    const application = JSON.parse(applyRes.body);

    const res = await app.inject({
      method: "PUT",
      url: `/v1/employers/jobs/${job.id}/applications/${application.id}/status`,
      headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, status: "reviewing" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe("reviewing");
  });
});

describe("Saved jobs", () => {
  it("saves and lists saved jobs", async () => {
    const job = await setupEmployerWithPublishedJob();
    await setupCandidateProfile();

    // Save the job
    const saveRes = await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/save`,
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B },
    });
    expect(saveRes.statusCode).toBe(200);

    // List saved jobs
    const listRes = await app.inject({
      method: "GET",
      url: "/v1/candidates/saved-jobs",
      headers: authHeader(SUBJECT_B),
    });
    expect(listRes.statusCode).toBe(200);
    const body = JSON.parse(listRes.body);
    expect(body.savedJobs.length).toBe(1);
    expect(body.savedJobs[0].jobId).toBe(job.id);
  });

  it("unsaves a job", async () => {
    const job = await setupEmployerWithPublishedJob();
    await setupCandidateProfile();

    await app.inject({
      method: "POST",
      url: `/v1/jobs/${job.id}/save`,
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B },
    });

    const unsaveRes = await app.inject({
      method: "DELETE",
      url: `/v1/jobs/${job.id}/save`,
      headers: authHeader(SUBJECT_B),
    });
    expect(unsaveRes.statusCode).toBe(200);

    const listRes = await app.inject({
      method: "GET",
      url: "/v1/candidates/saved-jobs",
      headers: authHeader(SUBJECT_B),
    });
    expect(JSON.parse(listRes.body).savedJobs.length).toBe(0);
  });
});
