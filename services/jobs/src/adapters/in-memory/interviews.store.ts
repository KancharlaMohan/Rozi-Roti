import type { InterviewRow, InterviewFeedbackRow } from "../../domain/types.js";
import type { InterviewsRepository } from "../../ports/interviews.repository.js";

export function createInMemoryInterviewsStore(): InterviewsRepository {
  const interviews = new Map<string, InterviewRow>();
  const feedbacks = new Map<string, InterviewFeedbackRow>();

  return {
    async create(input) {
      const now = new Date().toISOString();
      const row: InterviewRow = { ...input, createdAt: now, updatedAt: now };
      interviews.set(row.id, row);
      return row;
    },
    async findById(id) {
      return interviews.get(id) ?? null;
    },
    async update(id, input) {
      const existing = interviews.get(id);
      if (!existing) return null;
      // Only apply defined fields — undefined values must not overwrite existing
      const patch: Partial<InterviewRow> = {};
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
      }
      const updated: InterviewRow = {
        ...existing, ...patch,
        id: existing.id, applicationId: existing.applicationId,
        proposedBySubjectId: existing.proposedBySubjectId, createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      interviews.set(id, updated);
      return updated;
    },
    async listByApplication(applicationId) {
      return [...interviews.values()]
        .filter((i) => i.applicationId === applicationId)
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    },
    async addFeedback(input) {
      const row: InterviewFeedbackRow = { ...input, createdAt: new Date().toISOString() };
      feedbacks.set(row.id, row);
      return row;
    },
  };
}
