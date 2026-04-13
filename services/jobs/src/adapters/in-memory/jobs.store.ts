import type { JobRow } from "../../domain/types.js";
import type {
  JobsRepository,
  ListByEmployerFilter,
  ListJobsFilter,
} from "../../ports/jobs.repository.js";

export type InMemoryJobsStore = JobsRepository & {
  /** Expose internal map for cross-adapter reads (e.g. saved-jobs adapter in dev mode). */
  _rows: Map<string, JobRow>;
};

export function createInMemoryJobsStore(): InMemoryJobsStore {
  const rows = new Map<string, JobRow>();

  return {
    _rows: rows,
    async create(input) {
      const now = new Date().toISOString();
      const row: JobRow = { ...input, createdAt: now, updatedAt: now };
      rows.set(row.id, row);
      return row;
    },

    async update(id, input) {
      const existing = rows.get(id);
      if (!existing) return null;
      const updated: JobRow = {
        ...existing,
        ...input,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      rows.set(id, updated);
      return updated;
    },

    async findById(id) {
      return rows.get(id) ?? null;
    },

    async listPublished(filter: ListJobsFilter) {
      let results = [...rows.values()].filter((r) => r.status === "published");

      if (filter.jobType) {
        results = results.filter((r) => r.jobType === filter.jobType);
      }
      if (filter.workMode) {
        results = results.filter((r) => r.workMode === filter.workMode);
      }
      if (filter.country) {
        results = results.filter((r) => r.locationCountry === filter.country);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        results = results.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q),
        );
      }

      results.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const total = results.length;
      const paged = results.slice(filter.offset, filter.offset + filter.limit);
      return { rows: paged, total };
    },

    async listByEmployer(filter: ListByEmployerFilter) {
      const results = [...rows.values()]
        .filter((r) => r.employerId === filter.employerId)
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
