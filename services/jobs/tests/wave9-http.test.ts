import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, adminAuthHeader, authHeader, ADMIN_SUBJECT, SUBJECT_A } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("AI Agent infrastructure (Wave 9a)", () => {
  it("admin lists all seeded agents", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/admin/agents", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.agents.length).toBe(12);

    // Verify key agent types are present
    const types = body.agents.map((a: { agentType: string }) => a.agentType);
    expect(types).toContain("job_matcher");
    expect(types).toContain("health_monitor");
    expect(types).toContain("moderation");
    expect(types).toContain("candidate_ranker");
    expect(types).toContain("fraud_detector");
  });

  it("non-admin cannot list agents", async () => {
    const res = await app.inject({
      method: "GET", url: "/v1/admin/agents", headers: authHeader(SUBJECT_A),
    });
    expect(res.statusCode).toBe(403);
  });

  it("admin manually triggers an agent run", async () => {
    // Get the job_matcher agent ID
    const listRes = await app.inject({
      method: "GET", url: "/v1/admin/agents", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    const agents = JSON.parse(listRes.body).agents;
    const matcher = agents.find((a: { agentType: string }) => a.agentType === "job_matcher");

    const runRes = await app.inject({
      method: "POST", url: `/v1/admin/agents/${matcher.id}/run`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    expect(runRes.statusCode).toBe(201);
    const run = JSON.parse(runRes.body);
    expect(run.status).toBe("completed");
    expect(run.agentId).toBe(matcher.id);
  });

  it("admin updates agent config", async () => {
    const listRes = await app.inject({
      method: "GET", url: "/v1/admin/agents", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    const agents = JSON.parse(listRes.body).agents;
    const healthMonitor = agents.find((a: { agentType: string }) => a.agentType === "health_monitor");

    const updateRes = await app.inject({
      method: "PUT", url: `/v1/admin/agents/${healthMonitor.id}`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, config: { timeoutMs: 5000 }, scheduleCron: "*/2 * * * *" },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body);
    expect(updated.config.timeoutMs).toBe(5000);
    expect(updated.scheduleCron).toBe("*/2 * * * *");
  });

  it("admin disables an agent", async () => {
    const listRes = await app.inject({
      method: "GET", url: "/v1/admin/agents", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    const agents = JSON.parse(listRes.body).agents;
    const agent = agents[0];

    const updateRes = await app.inject({
      method: "PUT", url: `/v1/admin/agents/${agent.id}`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
      payload: { coreSubjectId: ADMIN_SUBJECT, status: "disabled" },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(JSON.parse(updateRes.body).status).toBe("disabled");
  });

  it("admin views agent run history", async () => {
    const listRes = await app.inject({
      method: "GET", url: "/v1/admin/agents", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    const agentId = JSON.parse(listRes.body).agents[0].id;

    // Trigger a run first
    await app.inject({
      method: "POST", url: `/v1/admin/agents/${agentId}/run`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
    });

    const runsRes = await app.inject({
      method: "GET", url: `/v1/admin/agents/${agentId}/runs`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    expect(runsRes.statusCode).toBe(200);
    expect(JSON.parse(runsRes.body).runs.length).toBeGreaterThanOrEqual(1);
  });

  it("admin views actions from a run", async () => {
    const listRes = await app.inject({
      method: "GET", url: "/v1/admin/agents", headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    const agentId = JSON.parse(listRes.body).agents[0].id;

    const runRes = await app.inject({
      method: "POST", url: `/v1/admin/agents/${agentId}/run`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    const runId = JSON.parse(runRes.body).id;

    const actionsRes = await app.inject({
      method: "GET", url: `/v1/admin/agents/${agentId}/runs/${runId}/actions`,
      headers: adminAuthHeader(ADMIN_SUBJECT),
    });
    expect(actionsRes.statusCode).toBe(200);
    expect(JSON.parse(actionsRes.body).actions).toEqual([]); // No actions from no-op run
  });
});
