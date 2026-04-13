import type { AdminActionRow, EmployerRow, JobRow } from "../../domain/types.js";
import type { AdminRepository } from "../../ports/admin.repository.js";
import type { EmployersRepository } from "../../ports/employers.repository.js";
import type { JobsRepository } from "../../ports/jobs.repository.js";

export function createInMemoryAdminStore(
  employersRepo: EmployersRepository,
  jobsRepo: JobsRepository,
): AdminRepository {
  const actions: AdminActionRow[] = [];

  return {
    async createAction(input) {
      const row: AdminActionRow = { ...input, createdAt: new Date().toISOString() };
      actions.push(row);
      return row;
    },
    async listActions(limit, offset) {
      const sorted = [...actions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { rows: sorted.slice(offset, offset + limit), total: sorted.length };
    },
    async listAllEmployers(limit, offset) {
      // Simplified — in-memory admin store delegates to employer repo for listing
      // In production PG adapter, this would be a direct query with filters
      const all = await employersRepo.findBySubjectId(""); // can't list all from current interface
      return { rows: [], total: 0 }; // STUB — PG adapter will implement properly
    },
    async listAllJobs(limit, offset) {
      return { rows: [], total: 0 }; // STUB — PG adapter will implement properly
    },
  };
}
