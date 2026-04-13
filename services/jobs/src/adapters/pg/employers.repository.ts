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
    companySize: row.company_size != null ? String(row.company_size) : null,
    industry: row.industry != null ? String(row.industry) : null,
    foundedYear: row.founded_year != null ? Number(row.founded_year) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export function createPgEmployersRepository(pool: Pool): EmployersRepository {
  return {
    async create(input) {
      const now = new Date().toISOString();
      await pool.query(
        `INSERT INTO jobs_employers (id, subject_id, company_name, description, website, logo_asset_id, company_size, industry, founded_year, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [input.id, input.subjectId, input.companyName, input.description, input.website, input.logoAssetId, input.companySize, input.industry, input.foundedYear, now],
      );
      return { ...input, createdAt: now, updatedAt: now };
    },

    async update(id, input) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;
      const fieldMap: Record<string, string> = {
        companyName: "company_name", description: "description", website: "website",
        logoAssetId: "logo_asset_id", companySize: "company_size", industry: "industry", foundedYear: "founded_year",
      };
      for (const [key, col] of Object.entries(fieldMap)) {
        if ((input as Record<string, unknown>)[key] !== undefined) {
          sets.push(`${col} = $${idx}`); vals.push((input as Record<string, unknown>)[key]); idx++;
        }
      }
      if (sets.length === 0) return this.findById(id);
      sets.push(`updated_at = $${idx}`); vals.push(new Date().toISOString()); idx++;
      vals.push(id);
      const r = await pool.query(`UPDATE jobs_employers SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`, vals);
      if (r.rows.length === 0) return null;
      return mapRow(r.rows[0] as Record<string, unknown>);
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
