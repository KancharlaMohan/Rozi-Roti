import type { ApplicationRow } from "../../domain/types.js";
import type {
  ApplicationsRepository,
  ListCandidateAppsFilter,
  ListJobAppsFilter,
} from "../../ports/applications.repository.js";

export function createInMemoryApplicationsStore(): ApplicationsRepository {
  const rows = new Map<string, ApplicationRow>();

  return {
    async create(input) {
      const now = new Date().toISOString();
      const row: ApplicationRow = { ...input, createdAt: now, updatedAt: now };
      rows.set(row.id, row);
      return row;
    },

    async findById(id) {
      return rows.get(id) ?? null;
    },

    async findByJobAndCandidate(jobId, candidateProfileId) {
      for (const row of rows.values()) {
        if (row.jobId === jobId && row.candidateProfileId === candidateProfileId) {
          return row;
        }
      }
      return null;
    },

    async updateStatus(id, status) {
      const existing = rows.get(id);
      if (!existing) return null;
      const updated: ApplicationRow = {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
      };
      rows.set(id, updated);
      return updated;
    },

    async listByCandidate(filter: ListCandidateAppsFilter) {
      const results = [...rows.values()]
        .filter((r) => r.candidateProfileId === filter.candidateProfileId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      const total = results.length;
      const paged = results.slice(filter.offset, filter.offset + filter.limit);
      return { rows: paged, total };
    },

    async listByJob(filter: ListJobAppsFilter) {
      const results = [...rows.values()]
        .filter((r) => r.jobId === filter.jobId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      const total = results.length;
      const paged = results.slice(filter.offset, filter.offset + filter.limit);
      return { rows: paged, total };
    },
  };
}
