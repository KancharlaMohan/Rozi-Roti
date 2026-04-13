import type { JobRow, SavedJobRow } from "../../domain/types.js";
import type {
  ListSavedJobsFilter,
  SavedJobWithJob,
  SavedJobsRepository,
} from "../../ports/saved-jobs.repository.js";

export function createInMemorySavedJobsStore(
  jobsGetter: () => Map<string, JobRow>,
): SavedJobsRepository {
  const saved = new Map<string, SavedJobRow>(); // key = `${candidateProfileId}:${jobId}`

  function key(candidateProfileId: string, jobId: string): string {
    return `${candidateProfileId}:${jobId}`;
  }

  return {
    async save(candidateProfileId, jobId) {
      const k = key(candidateProfileId, jobId);
      const existing = saved.get(k);
      if (existing) return existing;
      const row: SavedJobRow = {
        candidateProfileId,
        jobId,
        savedAt: new Date().toISOString(),
      };
      saved.set(k, row);
      return row;
    },

    async unsave(candidateProfileId, jobId) {
      return saved.delete(key(candidateProfileId, jobId));
    },

    async isSaved(candidateProfileId, jobId) {
      return saved.has(key(candidateProfileId, jobId));
    },

    async listByCandidate(filter: ListSavedJobsFilter) {
      const jobs = jobsGetter();
      const results: SavedJobWithJob[] = [];
      for (const row of saved.values()) {
        if (row.candidateProfileId !== filter.candidateProfileId) continue;
        const job = jobs.get(row.jobId);
        if (!job) continue;
        results.push({ ...row, job });
      }
      results.sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
      const total = results.length;
      const paged = results.slice(filter.offset, filter.offset + filter.limit);
      return { rows: paged, total };
    },
  };
}
