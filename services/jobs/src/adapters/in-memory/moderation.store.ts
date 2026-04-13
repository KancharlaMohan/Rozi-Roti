import type {
  ModerationQueueItemRow,
  ModerationActionRow,
  FlagRow,
  EmployerVerificationRow,
} from "../../domain/types.js";
import type { ModerationRepository } from "../../ports/moderation.repository.js";

export function createInMemoryModerationStore(): ModerationRepository {
  const flags = new Map<string, FlagRow>();
  const queue = new Map<string, ModerationQueueItemRow>();
  const actions = new Map<string, ModerationActionRow>();
  const verifications = new Map<string, EmployerVerificationRow>();

  return {
    async createFlag(input) {
      const row: FlagRow = { ...input, createdAt: new Date().toISOString() };
      flags.set(row.id, row);
      return row;
    },
    async createQueueItem(input) {
      const now = new Date().toISOString();
      const row: ModerationQueueItemRow = { ...input, createdAt: now, updatedAt: now };
      queue.set(row.id, row);
      return row;
    },
    async listQueue(status, limit, offset) {
      let items = [...queue.values()];
      if (status) items = items.filter((i) => i.status === status);
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { rows: items.slice(offset, offset + limit), total: items.length };
    },
    async findQueueItem(id) {
      return queue.get(id) ?? null;
    },
    async updateQueueItemStatus(id, status) {
      const item = queue.get(id);
      if (!item) return null;
      const updated = { ...item, status, updatedAt: new Date().toISOString() };
      queue.set(id, updated);
      return updated;
    },
    async createAction(input) {
      const row: ModerationActionRow = { ...input, createdAt: new Date().toISOString() };
      actions.set(row.id, row);
      return row;
    },
    async listActionsByQueueItem(queueItemId) {
      return [...actions.values()].filter((a) => a.queueItemId === queueItemId);
    },
    async createVerification(input) {
      const now = new Date().toISOString();
      const row: EmployerVerificationRow = { ...input, createdAt: now, updatedAt: now };
      verifications.set(row.id, row);
      return row;
    },
    async findVerificationByEmployer(employerId) {
      for (const v of verifications.values()) {
        if (v.employerId === employerId) return v;
      }
      return null;
    },
    async updateVerification(id, status, reviewedBySubjectId, notes) {
      const v = verifications.get(id);
      if (!v) return null;
      const updated = { ...v, status, reviewedBySubjectId, notes: notes ?? null, updatedAt: new Date().toISOString() };
      verifications.set(id, updated);
      return updated;
    },
  };
}
