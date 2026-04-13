import type { CandidatePreferencesRow } from "../domain/types.js";

export interface CandidatePreferencesRepository {
  upsert(input: CandidatePreferencesRow): Promise<CandidatePreferencesRow>;
  findByProfile(candidateProfileId: string): Promise<CandidatePreferencesRow | null>;
}
