import type { JobTemplateRow } from "../../domain/types.js";
import type { JobTemplatesRepository } from "../../ports/job-templates.repository.js";

export function createInMemoryJobTemplatesStore(): JobTemplatesRepository {
  const rows = new Map<string, JobTemplateRow>();

  return {
    async create(input) {
      const now = new Date().toISOString();
      const row: JobTemplateRow = { ...input, createdAt: now, updatedAt: now };
      rows.set(row.id, row);
      return row;
    },
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async listByEmployer(employerId) {
      return [...rows.values()].filter((r) => r.employerId === employerId);
    },
    async remove(id, employerId) {
      const row = rows.get(id);
      if (!row || row.employerId !== employerId) return false;
      return rows.delete(id);
    },
  };
}
