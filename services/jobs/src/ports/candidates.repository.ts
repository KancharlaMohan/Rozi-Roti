import type { CandidateProfileRow } from "../domain/types.js";

export interface CandidatesRepository {
  upsert(input: Omit<CandidateProfileRow, "createdAt" | "updatedAt">): Promise<CandidateProfileRow>;
  findBySubjectId(subjectId: string): Promise<CandidateProfileRow | null>;
  findById(id: string): Promise<CandidateProfileRow | null>;
}
