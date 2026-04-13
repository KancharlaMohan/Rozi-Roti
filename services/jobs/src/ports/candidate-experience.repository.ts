import type { CandidateExperienceRow } from "../domain/types.js";

export interface CandidateExperienceRepository {
  add(input: Omit<CandidateExperienceRow, "createdAt" | "updatedAt">): Promise<CandidateExperienceRow>;
  update(id: string, candidateProfileId: string, input: Partial<Omit<CandidateExperienceRow, "id" | "candidateProfileId" | "subjectId" | "createdAt" | "updatedAt">>): Promise<CandidateExperienceRow | null>;
  remove(id: string, candidateProfileId: string): Promise<boolean>;
  listByProfile(candidateProfileId: string): Promise<CandidateExperienceRow[]>;
}
