import type { CandidateSkillRow } from "../../domain/types.js";
import type { CandidateSkillsRepository } from "../../ports/candidate-skills.repository.js";

export function createInMemoryCandidateSkillsStore(): CandidateSkillsRepository {
  const rows = new Map<string, CandidateSkillRow>();

  return {
    async add(input) {
      const row: CandidateSkillRow = { ...input, createdAt: new Date().toISOString() };
      rows.set(row.id, row);
      return row;
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
