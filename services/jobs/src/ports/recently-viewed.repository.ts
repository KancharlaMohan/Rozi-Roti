import type { RecentlyViewedRow, JobRow } from "../domain/types.js";

export type RecentlyViewedWithJob = RecentlyViewedRow & { job: JobRow };

export interface RecentlyViewedRepository {
  record(subjectId: string, jobId: string): Promise<void>;
  listBySubject(subjectId: string, limit: number, offset: number): Promise<{ rows: RecentlyViewedWithJob[]; total: number }>;
}
