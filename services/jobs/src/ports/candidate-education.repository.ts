import type { CandidateEducationRow } from "../domain/types.js";

export interface CandidateEducationRepository {
  add(input: Omit<CandidateEducationRow, "createdAt" | "updatedAt">): Promise<CandidateEducationRow>;
  update(id: string, candidateProfileId: string, input: Partial<Omit<CandidateEducationRow, "id" | "candidateProfileId" | "subjectId" | "createdAt" | "updatedAt">>): Promise<CandidateEducationRow | null>;
  remove(id: string, candidateProfileId: string): Promise<boolean>;
  listByProfile(candidateProfileId: string): Promise<CandidateEducationRow[]>;
}
