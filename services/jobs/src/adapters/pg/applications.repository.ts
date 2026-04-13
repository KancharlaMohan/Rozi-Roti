import type { Pool } from "@jobs/db";
import type { ApplicationRow } from "../../domain/types.js";
import type {
  ApplicationsRepository,
  ListCandidateAppsFilter,
  ListJobAppsFilter,
} from "../../ports/applications.repository.js";

function mapRow(row: Record<string, unknown>): ApplicationRow {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    candidateProfileId: String(row.candidate_profile_id),
    subjectId: String(row.subject_id),
    status: String(row.status),
    coverLetter: row.cover_letter != null ? String(row.cover_letter) : null,
    resumeAssetId: row.resume_asset_id != null ? String(row.resume_asset_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export function createPgApplicationsRepository(pool: Pool): ApplicationsRepository {
  return {
    async create(input) {
      const now = new Date().toISOString();
      const r = await pool.query(
        `INSERT INTO jobs_applications
          (id, job_id, candidate_profile_id, subject_id, status, cover_letter, resume_asset_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
         RETURNING *`,
        [input.id, input.jobId, input.candidateProfileId, input.subjectId, input.status, input.coverLetter, input.resumeAssetId, now],
      );
      return mapRow(r.rows[0] as Record<string, unknown>);
    },

    async findById(id) {
      const r = await pool.query(`SELECT * FROM jobs_applications WHERE id = $1`, [id]);
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
    },

    async findByJobAndCandidate(jobId, candidateProfileId) {
      const r = await pool.query(
        `SELECT * FROM jobs_applications WHERE job_id = $1 AND candidate_profile_id = $2`,
        [jobId, candidateProfileId],
      );
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
    },

    async updateStatus(id, status) {
      const r = await pool.query(
        `UPDATE jobs_applications SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [status, new Date().toISOString(), id],
      );
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
    },

    async listByCandidate(filter: ListCandidateAppsFilter) {
      const countR = await pool.query(
        `SELECT count(*)::int AS total FROM jobs_applications WHERE candidate_profile_id = $1`,
        [filter.candidateProfileId],
      );
      const total = (countR.rows[0] as { total: number }).total;

      const r = await pool.query(
        `SELECT * FROM jobs_applications WHERE candidate_profile_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [filter.candidateProfileId, filter.limit, filter.offset],
      );
      return { rows: r.rows.map((row: Record<string, unknown>) => mapRow(row)), total };
    },

    async listByJob(filter: ListJobAppsFilter) {
      const countR = await pool.query(
        `SELECT count(*)::int AS total FROM jobs_applications WHERE job_id = $1`,
        [filter.jobId],
      );
      const total = (countR.rows[0] as { total: number }).total;

      const r = await pool.query(
        `SELECT * FROM jobs_applications WHERE job_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [filter.jobId, filter.limit, filter.offset],
      );
      return { rows: r.rows.map((row: Record<string, unknown>) => mapRow(row)), total };
    },
  };
}
