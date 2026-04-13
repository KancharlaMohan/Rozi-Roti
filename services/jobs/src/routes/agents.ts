import {
  AgentPublicSchema,
  AgentRunPublicSchema,
  AgentActionPublicSchema,
  ListAgentsResponseSchema,
  ListAgentRunsResponseSchema,
  ListAgentActionsResponseSchema,
  UpdateAgentRequestSchema,
} from "@jobs/contracts";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  if (!req.principal?.scopes?.includes("admin")) {
    errorReply(reply, 403, "forbidden", "Admin access required.", req.id);
    return false;
  }
  return true;
}

export function registerAgentRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  /* --- List all agents --- */
  app.get("/v1/admin/agents", { preHandler: requirePrincipal }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const agents = await input.agents.listAgents();
    return reply.send(ListAgentsResponseSchema.parse({
      agents: agents.map((a) => AgentPublicSchema.parse(a)),
    }));
  });

  /* --- Manually trigger an agent run --- */
  app.post("/v1/admin/agents/:id/run", { preHandler: requirePrincipal }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const agent = await input.agents.findAgent(id);
    if (!agent) return errorReply(reply, 404, "not_found", "Agent not found.", req.id);

    const run = await input.agents.createRun({
      id: randomUUID(),
      agentId: id,
      status: "running",
      startedAt: new Date().toISOString(),
      result: null,
      error: null,
      metrics: {},
    });

    // Mark agent as running
    await input.agents.updateAgent(id, { status: "running", lastRunAt: run.startedAt });

    // In a real system, this would trigger the actual agent execution asynchronously.
    // For now, immediately complete the run as a no-op per AI_CONSTITUTION.md guidelines.
    const completed = await input.agents.completeRun(
      run.id, "completed", { message: "Manual trigger — no-op in standalone mode" }, undefined, { durationMs: 0 },
    );

    await input.agents.updateAgent(id, { status: "idle", lastResult: completed?.result ?? null });

    return reply.code(201).send(AgentRunPublicSchema.parse(completed ?? run));
  });

  /* --- Update agent config/schedule/status --- */
  app.put("/v1/admin/agents/:id", { preHandler: requirePrincipal }, async (req, reply) => {
    try {
      if (!requireAdmin(req, reply)) return;
      const { id } = req.params as { id: string };
      const parsed = UpdateAgentRequestSchema.parse(req.body);
      const agent = await input.agents.findAgent(id);
      if (!agent) return errorReply(reply, 404, "not_found", "Agent not found.", req.id);

      const updated = await input.agents.updateAgent(id, {
        scheduleCron: parsed.scheduleCron,
        config: parsed.config,
        status: parsed.status,
      });
      if (!updated) return errorReply(reply, 404, "not_found", "Agent not found.", req.id);

      return reply.send(AgentPublicSchema.parse(updated));
    } catch (e) {
      if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
      throw e;
    }
  });

  /* --- List agent run history --- */
  app.get("/v1/admin/agents/:id/runs", { preHandler: requirePrincipal }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const limit = Number((req.query as Record<string, string>).limit ?? "25");
    const offset = Number((req.query as Record<string, string>).offset ?? "0");
    const runs = await input.agents.listRuns(id, limit, offset);
    return reply.send(ListAgentRunsResponseSchema.parse({
      runs: runs.map((r) => AgentRunPublicSchema.parse(r)),
    }));
  });

  /* --- List actions from a specific run --- */
  app.get("/v1/admin/agents/:id/runs/:runId/actions", { preHandler: requirePrincipal }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { runId } = req.params as { id: string; runId: string };
    const actions = await input.agents.listActionsByRun(runId);
    return reply.send(ListAgentActionsResponseSchema.parse({
      actions: actions.map((a) => AgentActionPublicSchema.parse(a)),
    }));
  });
}
