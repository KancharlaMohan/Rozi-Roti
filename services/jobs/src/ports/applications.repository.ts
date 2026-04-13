import type { ApplicationRow } from "../domain/types.js";

export type ListCandidateAppsFilter = {
  candidateProfileId: string;
  limit: number;
  offset: number;
};

export type ListJobAppsFilter = {
  jobId: string;
  limit: number;
  offset: number;
};

export interface ApplicationsRepository {
  create(input: Omit<ApplicationRow, "createdAt" | "updatedAt">): Promise<ApplicationRow>;
  findById(id: string): Promise<ApplicationRow | null>;
  findByJobAndCandidate(jobId: string, candidateProfileId: string): Promise<ApplicationRow | null>;
  updateStatus(id: string, status: string): Promise<ApplicationRow | null>;
  listByCandidate(filter: ListCandidateAppsFilter): Promise<{ rows: ApplicationRow[]; total: number }>;
  listByJob(filter: ListJobAppsFilter): Promise<{ rows: ApplicationRow[]; total: number }>;
}
