import { randomUUID } from "crypto";
import type { JobRow, RecentlyViewedRow } from "../../domain/types.js";
import type { RecentlyViewedRepository, RecentlyViewedWithJob } from "../../ports/recently-viewed.repository.js";

export function createInMemoryRecentlyViewedStore(
  jobsGetter: () => Map<string, JobRow>,
): RecentlyViewedRepository {
  const rows = new Map<string, RecentlyViewedRow>(); // key = `${subjectId}:${jobId}`

  return {
    async record(subjectId, jobId) {
      const key = `${subjectId}:${jobId}`;
      rows.set(key, { id: randomUUID(), subjectId, jobId, viewedAt: new Date().toISOString() });
    },
    async listBySubject(subjectId, limit, offset) {
      const jobs = jobsGetter();
      const results: RecentlyViewedWithJob[] = [];
      for (const row of rows.values()) {
        if (row.subjectId !== subjectId) continue;
        const job = jobs.get(row.jobId);
        if (!job) continue;
        results.push({ ...row, job });
      }
      results.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
      return { rows: results.slice(offset, offset + limit), total: results.length };
    },
  };
}
