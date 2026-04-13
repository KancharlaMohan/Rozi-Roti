import type { AgentRow, AgentRunRow, AgentActionRow } from "../domain/types.js";

export interface AgentsRepository {
  listAgents(): Promise<AgentRow[]>;
  findAgent(id: string): Promise<AgentRow | null>;
  updateAgent(id: string, input: Partial<Pick<AgentRow, "status" | "scheduleCron" | "config" | "lastRunAt" | "lastResult">>): Promise<AgentRow | null>;
  createRun(input: Omit<AgentRunRow, "completedAt">): Promise<AgentRunRow>;
  completeRun(id: string, status: string, result?: Record<string, unknown>, error?: string, metrics?: Record<string, unknown>): Promise<AgentRunRow | null>;
  listRuns(agentId: string, limit: number, offset: number): Promise<AgentRunRow[]>;
  createAction(input: Omit<AgentActionRow, "createdAt">): Promise<AgentActionRow>;
  listActionsByRun(runId: string): Promise<AgentActionRow[]>;
  seedAgents(agents: Omit<AgentRow, "createdAt" | "updatedAt">[]): Promise<void>;
}
