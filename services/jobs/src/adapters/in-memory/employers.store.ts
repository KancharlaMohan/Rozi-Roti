import type { EmployerRow } from "../../domain/types.js";
import type { EmployersRepository } from "../../ports/employers.repository.js";

export function createInMemoryEmployersStore(): EmployersRepository {
  const rows = new Map<string, EmployerRow>();

  return {
    async create(input) {
      const now = new Date().toISOString();
      const row: EmployerRow = { ...input, createdAt: now, updatedAt: now };
      rows.set(row.id, row);
      return row;
    },
    async findBySubjectId(subjectId) {
      for (const row of rows.values()) {
        if (row.subjectId === subjectId) return row;
      }
      return null;
    },
    async findById(id) {
      return rows.get(id) ?? null;
    },
  };
}
