import type { CandidateProfileRow } from "../../domain/types.js";
import type { CandidatesRepository } from "../../ports/candidates.repository.js";

export function createInMemoryCandidatesStore(): CandidatesRepository {
  const rows = new Map<string, CandidateProfileRow>();

  return {
    async upsert(input) {
      const now = new Date().toISOString();
      const existing = [...rows.values()].find((r) => r.subjectId === input.subjectId);
      if (existing) {
        const updated: CandidateProfileRow = {
          ...existing,
          ...input,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now,
        };
        rows.set(updated.id, updated);
        return updated;
      }
      const row: CandidateProfileRow = { ...input, createdAt: now, updatedAt: now };
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
