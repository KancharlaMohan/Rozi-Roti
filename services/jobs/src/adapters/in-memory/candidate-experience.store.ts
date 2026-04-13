import type { CandidateExperienceRow } from "../../domain/types.js";
import type { CandidateExperienceRepository } from "../../ports/candidate-experience.repository.js";

export function createInMemoryCandidateExperienceStore(): CandidateExperienceRepository {
  const rows = new Map<string, CandidateExperienceRow>();

  return {
    async add(input) {
      const now = new Date().toISOString();
      const row: CandidateExperienceRow = { ...input, createdAt: now, updatedAt: now };
      rows.set(row.id, row);
      return row;
    },
    async update(id, candidateProfileId, input) {
      const existing = rows.get(id);
      if (!existing || existing.candidateProfileId !== candidateProfileId) return null;
      const updated: CandidateExperienceRow = {
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
      return [...rows.values()]
        .filter((r) => r.candidateProfileId === candidateProfileId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate));
    },
  };
}
