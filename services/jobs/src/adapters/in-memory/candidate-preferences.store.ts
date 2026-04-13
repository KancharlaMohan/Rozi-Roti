import type { CandidatePreferencesRow } from "../../domain/types.js";
import type { CandidatePreferencesRepository } from "../../ports/candidate-preferences.repository.js";

export function createInMemoryCandidatePreferencesStore(): CandidatePreferencesRepository {
  const rows = new Map<string, CandidatePreferencesRow>();

  return {
    async upsert(input) {
      const row: CandidatePreferencesRow = { ...input, updatedAt: new Date().toISOString() };
      rows.set(row.candidateProfileId, row);
      return row;
    },
    async findByProfile(candidateProfileId) {
      return rows.get(candidateProfileId) ?? null;
    },
  };
}
