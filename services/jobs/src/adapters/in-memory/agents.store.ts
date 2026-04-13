import type { AgentRow, AgentRunRow, AgentActionRow } from "../../domain/types.js";
import type { AgentsRepository } from "../../ports/agents.repository.js";

export function createInMemoryAgentsStore(): AgentsRepository {
  const agents = new Map<string, AgentRow>();
  const runs = new Map<string, AgentRunRow>();
  const actions = new Map<string, AgentActionRow>();

  return {
    async listAgents() {
      return [...agents.values()];
    },
    async findAgent(id) {
      return agents.get(id) ?? null;
    },
    async updateAgent(id, input) {
      const existing = agents.get(id);
      if (!existing) return null;
      const patch: Partial<AgentRow> = {};
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
      }
      const updated: AgentRow = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      agents.set(id, updated);
      return updated;
    },
    async createRun(input) {
      const row: AgentRunRow = { ...input, completedAt: null };
      runs.set(row.id, row);
      return row;
    },
    async completeRun(id, status, result, error, metrics) {
      const existing = runs.get(id);
      if (!existing) return null;
      const updated: AgentRunRow = {
        ...existing, status, completedAt: new Date().toISOString(),
        result: result ?? null, error: error ?? null, metrics: metrics ?? existing.metrics,
      };
      runs.set(id, updated);
      return updated;
    },
    async listRuns(agentId, limit, offset) {
      return [...runs.values()]
        .filter((r) => r.agentId === agentId)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(offset, offset + limit);
    },
    async createAction(input) {
      const row: AgentActionRow = { ...input, createdAt: new Date().toISOString() };
      actions.set(row.id, row);
      return row;
    },
    async listActionsByRun(runId) {
      return [...actions.values()].filter((a) => a.runId === runId);
    },
    async seedAgents(seeds) {
      const now = new Date().toISOString();
      for (const seed of seeds) {
        if (!agents.has(seed.id)) {
          agents.set(seed.id, { ...seed, createdAt: now, updatedAt: now });
        }
      }
    },
  };
}
