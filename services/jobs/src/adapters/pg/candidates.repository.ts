import type { Pool } from "@jobs/db";
import type { CandidateProfileRow } from "../../domain/types.js";
import type { CandidatesRepository } from "../../ports/candidates.repository.js";

function mapRow(row: Record<string, unknown>): CandidateProfileRow {
  return {
    id: String(row.id),
    subjectId: String(row.subject_id),
    displayName: String(row.display_name),
    headline: row.headline != null ? String(row.headline) : null,
    summary: row.summary != null ? String(row.summary) : null,
    resumeAssetId: row.resume_asset_id != null ? String(row.resume_asset_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export function createPgCandidatesRepository(pool: Pool): CandidatesRepository {
  return {
    async upsert(input) {
      const now = new Date().toISOString();
      const r = await pool.query(
        `INSERT INTO jobs_candidate_profiles (id, subject_id, display_name, headline, summary, resume_asset_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         ON CONFLICT (subject_id)
         DO UPDATE SET display_name = $3, headline = $4, summary = $5, resume_asset_id = $6, updated_at = $7
         RETURNING *`,
        [input.id, input.subjectId, input.displayName, input.headline, input.summary, input.resumeAssetId, now],
      );
      return mapRow(r.rows[0] as Record<string, unknown>);
    },

    async findBySubjectId(subjectId) {
      const r = await pool.query(
        `SELECT * FROM jobs_candidate_profiles WHERE subject_id = $1 LIMIT 1`,
        [subjectId],
      );
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
    },

    async findById(id) {
      const r = await pool.query(
        `SELECT * FROM jobs_candidate_profiles WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
    },
  };
}
