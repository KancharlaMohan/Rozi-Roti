import { z } from "zod";

export const AgentStatusSchema = z.enum(["idle", "running", "error", "disabled"]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentRunStatusSchema = z.enum(["running", "completed", "failed", "cancelled"]);
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

export const AgentPublicSchema = z.object({
  id: z.string().uuid(),
  agentType: z.string(),
  name: z.string(),
  status: AgentStatusSchema,
  scheduleCron: z.string().nullable(),
  lastRunAt: z.string().datetime().nullable(),
  config: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AgentPublic = z.infer<typeof AgentPublicSchema>;

export const AgentRunPublicSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  status: AgentRunStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  result: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
  metrics: z.record(z.unknown()),
});
export type AgentRunPublic = z.infer<typeof AgentRunPublicSchema>;

export const AgentActionPublicSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  actionType: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().nullable(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});
export type AgentActionPublic = z.infer<typeof AgentActionPublicSchema>;

export const UpdateAgentRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    scheduleCron: z.string().max(100).optional(),
    config: z.record(z.unknown()).optional(),
    status: AgentStatusSchema.optional(),
  })
  .strict();
export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;

export const ListAgentsResponseSchema = z.object({
  agents: z.array(AgentPublicSchema),
});
export type ListAgentsResponse = z.infer<typeof ListAgentsResponseSchema>;

export const ListAgentRunsResponseSchema = z.object({
  runs: z.array(AgentRunPublicSchema),
});
export type ListAgentRunsResponse = z.infer<typeof ListAgentRunsResponseSchema>;

export const ListAgentActionsResponseSchema = z.object({
  actions: z.array(AgentActionPublicSchema),
});
export type ListAgentActionsResponse = z.infer<typeof ListAgentActionsResponseSchema>;
