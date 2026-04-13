import { randomUUID } from "crypto";
import type { AgentRow } from "./types.js";

/**
 * Seed data for the 12 AI agents defined in the platform plan.
 * Per AI_CONSTITUTION.md, each agent follows ports/adapters pattern
 * and is extractable to a standalone microservice.
 */
export const AGENT_SEEDS: Omit<AgentRow, "createdAt" | "updatedAt">[] = [
  // Candidate-facing agents
  {
    id: "10000000-0000-0000-0000-000000000001",
    agentType: "job_matcher",
    name: "Job Matcher",
    status: "idle",
    scheduleCron: "*/15 * * * *",
    lastRunAt: null,
    lastResult: null,
    config: { minScore: 0.6 },
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    agentType: "resume_coach",
    name: "Resume Coach",
    status: "idle",
    scheduleCron: null, // event-triggered
    lastRunAt: null,
    lastResult: null,
    config: {},
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    agentType: "career_advisor",
    name: "Career Advisor",
    status: "idle",
    scheduleCron: null, // on-demand
    lastRunAt: null,
    lastResult: null,
    config: {},
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    agentType: "alert",
    name: "Job Alert Sender",
    status: "idle",
    scheduleCron: "*/10 * * * *",
    lastRunAt: null,
    lastResult: null,
    config: {},
  },

  // Employer-facing agents
  {
    id: "10000000-0000-0000-0000-000000000005",
    agentType: "candidate_ranker",
    name: "Application Ranker",
    status: "idle",
    scheduleCron: null, // event-triggered on new application
    lastRunAt: null,
    lastResult: null,
    config: {},
  },
  {
    id: "10000000-0000-0000-0000-000000000006",
    agentType: "job_optimizer",
    name: "Job Optimizer",
    status: "idle",
    scheduleCron: "0 8 * * *", // daily 8am
    lastRunAt: null,
    lastResult: null,
    config: {},
  },
  {
    id: "10000000-0000-0000-0000-000000000007",
    agentType: "outreach",
    name: "Outreach Agent",
    status: "idle",
    scheduleCron: null, // triggered by employer or periodic
    lastRunAt: null,
    lastResult: null,
    config: {},
  },

  // Platform operations agents
  {
    id: "10000000-0000-0000-0000-000000000008",
    agentType: "moderation",
    name: "Content Moderator",
    status: "idle",
    scheduleCron: null, // event-triggered
    lastRunAt: null,
    lastResult: null,
    config: { autoApproveThreshold: 0.9, autoRejectThreshold: 0.1 },
  },
  {
    id: "10000000-0000-0000-0000-000000000009",
    agentType: "fraud_detector",
    name: "Fraud Detector",
    status: "idle",
    scheduleCron: "0 * * * *", // hourly
    lastRunAt: null,
    lastResult: null,
    config: {},
  },
  {
    id: "10000000-0000-0000-0000-00000000000a",
    agentType: "content_quality",
    name: "Content Quality",
    status: "idle",
    scheduleCron: null, // event-triggered
    lastRunAt: null,
    lastResult: null,
    config: {},
  },
  {
    id: "10000000-0000-0000-0000-00000000000b",
    agentType: "analytics_engine",
    name: "Analytics Aggregator",
    status: "idle",
    scheduleCron: "0 2 * * *", // daily 2am
    lastRunAt: null,
    lastResult: null,
    config: {},
  },

  // DevOps agents
  {
    id: "10000000-0000-0000-0000-00000000000c",
    agentType: "health_monitor",
    name: "Health Monitor",
    status: "idle",
    scheduleCron: "*/5 * * * *",
    lastRunAt: null,
    lastResult: null,
    config: { timeoutMs: 3000 },
  },
];
