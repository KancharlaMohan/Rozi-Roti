import type { JobRow, SavedJobRow } from "../domain/types.js";

export type ListSavedJobsFilter = {
  candidateProfileId: string;
  limit: number;
  offset: number;
};

export type SavedJobWithJob = SavedJobRow & { job: JobRow };

export interface SavedJobsRepository {
  save(candidateProfileId: string, jobId: string): Promise<SavedJobRow>;
  unsave(candidateProfileId: string, jobId: string): Promise<boolean>;
  isSaved(candidateProfileId: string, jobId: string): Promise<boolean>;
  listByCandidate(filter: ListSavedJobsFilter): Promise<{ rows: SavedJobWithJob[]; total: number }>;
}
