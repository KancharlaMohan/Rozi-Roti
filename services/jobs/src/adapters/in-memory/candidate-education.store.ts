import type { CandidateEducationRow } from "../../domain/types.js";
import type { CandidateEducationRepository } from "../../ports/candidate-education.repository.js";

export function createInMemoryCandidateEducationStore(): CandidateEducationRepository {
  const rows = new Map<string, CandidateEducationRow>();

  return {
    async add(input) {
      const now = new Date().toISOString();
      const row: CandidateEducationRow = { ...input, createdAt: now, updatedAt: now };
      rows.set(row.id, row);
      return row;
    },
    async update(id, candidateProfileId, input) {
      const existing = rows.get(id);
      if (!existing || existing.candidateProfileId !== candidateProfileId) return null;
      const updated: CandidateEducationRow = {
        ...existing, ...input,
        id: existing.id, candidateProfileId: existing.candidateProfileId,
        subjectId: existing.subjectId, createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      rows.set(id, updated);
      return updated;
    },
    async remove(id, candidateProfileId) {
      const row = rows.get(id);
      if (!row || row.candidateProfileId !== candidateProfileId) return false;
      return rows.delete(id);
    },
    async listByProfile(candidateProfileId) {
      return [...rows.values()].filter((r) => r.candidateProfileId === candidateProfileId);
    },
  };
}
