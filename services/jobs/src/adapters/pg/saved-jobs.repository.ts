import { randomUUID } from "crypto";
import type { Pool } from "@jobs/db";
import type { JobRow, SavedJobRow } from "../../domain/types.js";
import type {
  ListSavedJobsFilter,
  SavedJobWithJob,
  SavedJobsRepository,
} from "../../ports/saved-jobs.repository.js";

function mapJobRow(row: Record<string, unknown>): JobRow {
  return {
    id: String(row.id),
    employerId: String(row.employer_id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    jobType: String(row.job_type),
    workMode: String(row.work_mode),
    locationCity: row.location_city != null ? String(row.location_city) : null,
    locationRegion: row.location_region != null ? String(row.location_region) : null,
    locationCountry: row.location_country != null ? String(row.location_country) : null,
    compMinAmount: row.comp_min_amount != null ? Number(row.comp_min_amount) : null,
    compMaxAmount: row.comp_max_amount != null ? Number(row.comp_max_amount) : null,
    compCurrency: row.comp_currency != null ? String(row.comp_currency) : null,
    compPeriod: row.comp_period != null ? String(row.comp_period) : null,
    status: String(row.status),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    mediaAssetIds: [],
    createdAt: new Date(String(row.job_created_at ?? row.created_at)).toISOString(),
    updatedAt: new Date(String(row.job_updated_at ?? row.updated_at)).toISOString(),
  };
}

export function createPgSavedJobsRepository(pool: Pool): SavedJobsRepository {
  return {
    async save(candidateProfileId, jobId) {
      const r = await pool.query(
        `INSERT INTO jobs_saved (candidate_profile_id, job_id, saved_at)
         VALUES ($1, $2, now())
         ON CONFLICT (candidate_profile_id, job_id) DO NOTHING
         RETURNING *`,
        [candidateProfileId, jobId],
      );
      if (r.rows.length === 0) {
        // Already saved — fetch existing
        const existing = await pool.query(
          `SELECT * FROM jobs_saved WHERE candidate_profile_id = $1 AND job_id = $2`,
          [candidateProfileId, jobId],
        );
        const row = existing.rows[0] as Record<string, unknown>;
        return {
          candidateProfileId: String(row.candidate_profile_id),
          jobId: String(row.job_id),
          savedAt: new Date(String(row.saved_at)).toISOString(),
        };
      }
      const row = r.rows[0] as Record<string, unknown>;
      return {
        candidateProfileId: String(row.candidate_profile_id),
        jobId: String(row.job_id),
        savedAt: new Date(String(row.saved_at)).toISOString(),
      };
    },

    async unsave(candidateProfileId, jobId) {
      const r = await pool.query(
        `DELETE FROM jobs_saved WHERE candidate_profile_id = $1 AND job_id = $2`,
        [candidateProfileId, jobId],
      );
      return (r.rowCount ?? 0) > 0;
    },

    async isSaved(candidateProfileId, jobId) {
      const r = await pool.query(
        `SELECT 1 FROM jobs_saved WHERE candidate_profile_id = $1 AND job_id = $2`,
        [candidateProfileId, jobId],
      );
      return r.rows.length > 0;
    },

    async listByCandidate(filter: ListSavedJobsFilter) {
      const countR = await pool.query(
        `SELECT count(*)::int AS total FROM jobs_saved WHERE candidate_profile_id = $1`,
        [filter.candidateProfileId],
      );
      const total = (countR.rows[0] as { total: number }).total;

      const r = await pool.query(
        `SELECT s.candidate_profile_id, s.job_id, s.saved_at,
                j.id, j.employer_id, j.title, j.description, j.job_type, j.work_mode,
                j.location_city, j.location_region, j.location_country,
                j.comp_min_amount, j.comp_max_amount, j.comp_currency, j.comp_period,
                j.status, j.tags,
                j.created_at AS job_created_at, j.updated_at AS job_updated_at
         FROM jobs_saved s
         JOIN jobs_postings j ON j.id = s.job_id
         WHERE s.candidate_profile_id = $1
         ORDER BY s.saved_at DESC
         LIMIT $2 OFFSET $3`,
        [filter.candidateProfileId, filter.limit, filter.offset],
      );

      const rows: SavedJobWithJob[] = r.rows.map((row: Record<string, unknown>) => ({
        candidateProfileId: String(row.candidate_profile_id),
        jobId: String(row.job_id),
        savedAt: new Date(String(row.saved_at)).toISOString(),
        job: mapJobRow(row),
      }));

      return { rows, total };
    },
  };
}
