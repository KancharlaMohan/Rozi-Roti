import type { CandidateSkillRow } from "../domain/types.js";

export interface CandidateSkillsRepository {
  add(input: Omit<CandidateSkillRow, "createdAt">): Promise<CandidateSkillRow>;
  remove(id: string, candidateProfileId: string): Promise<boolean>;
  listByProfile(candidateProfileId: string): Promise<CandidateSkillRow[]>;
}
