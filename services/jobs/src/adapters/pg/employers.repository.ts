import type { Pool } from "@jobs/db";
import type { EmployerRow } from "../../domain/types.js";
import type { EmployersRepository } from "../../ports/employers.repository.js";

function mapRow(row: Record<string, unknown>): EmployerRow {
  return {
    id: String(row.id),
    subjectId: String(row.subject_id),
    companyName: String(row.company_name),
    description: row.description != null ? String(row.description) : null,
    website: row.website != null ? String(row.website) : null,
    logoAssetId: row.logo_asset_id != null ? String(row.logo_asset_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export function createPgEmployersRepository(pool: Pool): EmployersRepository {
  return {
    async create(input) {
      const now = new Date().toISOString();
      await pool.query(
        `INSERT INTO jobs_employers (id, subject_id, company_name, description, website, logo_asset_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [input.id, input.subjectId, input.companyName, input.description, input.website, input.logoAssetId, now],
      );
      return { ...input, createdAt: now, updatedAt: now };
    },

    async findBySubjectId(subjectId) {
      const r = await pool.query(
        `SELECT * FROM jobs_employers WHERE subject_id = $1 LIMIT 1`,
        [subjectId],
      );
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
    },

    async findById(id) {
      const r = await pool.query(
        `SELECT * FROM jobs_employers WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
    },
  };
}
