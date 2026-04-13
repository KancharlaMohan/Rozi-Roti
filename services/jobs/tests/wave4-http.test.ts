import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, SUBJECT_A, SUBJECT_B } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

async function setupApplicationScenario() {
  // Register employer
  await app.inject({
    method: "POST", url: "/v1/employers", headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, companyName: "Acme" },
  });
  // Create + publish job
  const jobRes = await app.inject({
    method: "POST", url: "/v1/employers/jobs", headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, title: "Engineer", jobType: "full_time", workMode: "remote" },
  });
  const job = JSON.parse(jobRes.body);
  await app.inject({
    method: "PUT", url: `/v1/employers/jobs/${job.id}`, headers: authHeader(SUBJECT_A),
    payload: { coreSubjectId: SUBJECT_A, status: "published" },
  });
  // Create candidate + apply
  await app.inject({
    method: "POST", url: "/v1/candidates/profile", headers: authHeader(SUBJECT_B),
    payload: { coreSubjectId: SUBJECT_B, displayName: "Jane" },
  });
  const applyRes = await app.inject({
    method: "POST", url: `/v1/jobs/${job.id}/apply`, headers: authHeader(SUBJECT_B),
    payload: { coreSubjectId: SUBJECT_B },
  });
  return { job, application: JSON.parse(applyRes.body) };
}

describe("Messaging (Wave 4a)", () => {
  it("candidate sends a message on an application", async () => {
    const { application } = await setupApplicationScenario();
    const res = await app.inject({
      method: "POST", url: "/v1/messages", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, applicationId: application.id, content: "Hello, interested in this role!" },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).content).toBe("Hello, interested in this role!");
  });

  it("employer sends a message on an application", async () => {
    const { application } = await setupApplicationScenario();
    const res = await app.inject({
      method: "POST", url: "/v1/messages", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, applicationId: application.id, content: "Thanks for applying!" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("retrieves messages in a thread", async () => {
    const { application } = await setupApplicationScenario();
    await app.inject({
      method: "POST", url: "/v1/messages", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, applicationId: application.id, content: "Hello!" },
    });
    await app.inject({
      method: "POST", url: "/v1/messages", headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, applicationId: application.id, content: "Hi there!" },
    });

    // Get threads for candidate
    const threadsRes = await app.inject({
      method: "GET", url: "/v1/messages/threads", headers: authHeader(SUBJECT_B),
    });
    expect(threadsRes.statusCode).toBe(200);
    const threads = JSON.parse(threadsRes.body).threads;
    expect(threads.length).toBe(1);

    // Get messages
    const msgsRes = await app.inject({
      method: "GET", url: `/v1/messages/threads/${threads[0].id}`, headers: authHeader(SUBJECT_B),
    });
    expect(msgsRes.statusCode).toBe(200);
    expect(JSON.parse(msgsRes.body).messages.length).toBe(2);
  });

  it("marks a message as read", async () => {
    const { application } = await setupApplicationScenario();
    const sendRes = await app.inject({
      method: "POST", url: "/v1/messages", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, applicationId: application.id, content: "Hello!" },
    });
    const messageId = JSON.parse(sendRes.body).id;

    const readRes = await app.inject({
      method: "PUT", url: `/v1/messages/${messageId}/read`, headers: authHeader(SUBJECT_A),
    });
    expect(readRes.statusCode).toBe(200);
    expect(JSON.parse(readRes.body).readAt).not.toBeNull();
  });
});

describe("Interviews (Wave 4b)", () => {
  it("proposes an interview", async () => {
    const { application } = await setupApplicationScenario();
    const res = await app.inject({
      method: "POST", url: "/v1/interviews", headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A, applicationId: application.id,
        scheduledAt: "2026-05-01T10:00:00Z", durationMinutes: 45,
        location: "Office", notes: "Technical interview",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("proposed");
    expect(body.durationMinutes).toBe(45);
  });

  it("confirms an interview", async () => {
    const { application } = await setupApplicationScenario();
    const proposeRes = await app.inject({
      method: "POST", url: "/v1/interviews", headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A, applicationId: application.id,
        scheduledAt: "2026-05-01T10:00:00Z",
      },
    });
    const interviewId = JSON.parse(proposeRes.body).id;

    const confirmRes = await app.inject({
      method: "PUT", url: `/v1/interviews/${interviewId}`, headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, status: "confirmed" },
    });
    expect(confirmRes.statusCode).toBe(200);
    expect(JSON.parse(confirmRes.body).status).toBe("confirmed");
  });

  it("adds feedback to an interview", async () => {
    const { application } = await setupApplicationScenario();
    const proposeRes = await app.inject({
      method: "POST", url: "/v1/interviews", headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A, applicationId: application.id,
        scheduledAt: "2026-05-01T10:00:00Z",
      },
    });
    const interviewId = JSON.parse(proposeRes.body).id;

    const feedbackRes = await app.inject({
      method: "POST", url: `/v1/interviews/${interviewId}/feedback`, headers: authHeader(SUBJECT_A),
      payload: { coreSubjectId: SUBJECT_A, rating: 4, notes: "Strong technical skills" },
    });
    expect(feedbackRes.statusCode).toBe(201);
    expect(JSON.parse(feedbackRes.body).rating).toBe(4);
  });

  it("lists interviews for an application", async () => {
    const { application } = await setupApplicationScenario();
    await app.inject({
      method: "POST", url: "/v1/interviews", headers: authHeader(SUBJECT_A),
      payload: {
        coreSubjectId: SUBJECT_A, applicationId: application.id,
        scheduledAt: "2026-05-01T10:00:00Z",
      },
    });

    const res = await app.inject({
      method: "GET", url: `/v1/applications/${application.id}/interviews`, headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).interviews.length).toBe(1);
  });
});
