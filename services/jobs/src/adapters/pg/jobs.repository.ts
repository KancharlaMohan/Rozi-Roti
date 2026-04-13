import type { Pool } from "@jobs/db";
import type { JobRow } from "../../domain/types.js";
import type {
  JobsRepository,
  ListByEmployerFilter,
  ListJobsFilter,
} from "../../ports/jobs.repository.js";

function mapRow(row: Record<string, unknown>): JobRow {
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
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

/** Load media asset IDs for a set of job postings. */
async function loadMediaAssetIds(pool: Pool, jobIds: string[]): Promise<Map<string, string[]>> {
  if (jobIds.length === 0) return new Map();
  const r = await pool.query(
    `SELECT posting_id, media_asset_id FROM jobs_posting_media
     WHERE posting_id = ANY($1) ORDER BY sort_order`,
    [jobIds],
  );
  const map = new Map<string, string[]>();
  for (const row of r.rows as Array<{ posting_id: string; media_asset_id: string }>) {
    const arr = map.get(row.posting_id) ?? [];
    arr.push(row.media_asset_id);
    map.set(row.posting_id, arr);
  }
  return map;
}

export function createPgJobsRepository(pool: Pool): JobsRepository {
  return {
    async create(input) {
      const now = new Date().toISOString();
      await pool.query(
        `INSERT INTO jobs_postings
          (id, employer_id, title, description, job_type, work_mode,
           location_city, location_region, location_country,
           comp_min_amount, comp_max_amount, comp_currency, comp_period,
           status, tags, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)`,
        [
          input.id, input.employerId, input.title, input.description,
          input.jobType, input.workMode,
          input.locationCity, input.locationRegion, input.locationCountry,
          input.compMinAmount, input.compMaxAmount, input.compCurrency, input.compPeriod,
          input.status, input.tags, now,
        ],
      );

      // Insert media associations
      for (let i = 0; i < input.mediaAssetIds.length; i++) {
        const crypto = await import("crypto");
        await pool.query(
          `INSERT INTO jobs_posting_media (id, posting_id, media_asset_id, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [crypto.randomUUID(), input.id, input.mediaAssetIds[i], i],
        );
      }

      return { ...input, createdAt: now, updatedAt: now };
    },

    async update(id, input) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      const fieldMap: Record<string, string> = {
        title: "title",
        description: "description",
        jobType: "job_type",
        workMode: "work_mode",
        locationCity: "location_city",
        locationRegion: "location_region",
        locationCountry: "location_country",
        compMinAmount: "comp_min_amount",
        compMaxAmount: "comp_max_amount",
        compCurrency: "comp_currency",
        compPeriod: "comp_period",
        status: "status",
        tags: "tags",
      };

      for (const [key, col] of Object.entries(fieldMap)) {
        if ((input as Record<string, unknown>)[key] !== undefined) {
          sets.push(`${col} = $${idx}`);
          vals.push((input as Record<string, unknown>)[key]);
          idx++;
        }
      }

      if (sets.length === 0 && !input.mediaAssetIds) return this.findById(id);

      sets.push(`updated_at = $${idx}`);
      vals.push(new Date().toISOString());
      idx++;

      vals.push(id);
      const r = await pool.query(
        `UPDATE jobs_postings SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals,
      );

      if (r.rows.length === 0) return null;

      // Update media if provided
      if (input.mediaAssetIds !== undefined) {
        await pool.query(`DELETE FROM jobs_posting_media WHERE posting_id = $1`, [id]);
        for (let i = 0; i < input.mediaAssetIds.length; i++) {
          const crypto = await import("crypto");
          await pool.query(
            `INSERT INTO jobs_posting_media (id, posting_id, media_asset_id, sort_order) VALUES ($1, $2, $3, $4)`,
            [crypto.randomUUID(), id, input.mediaAssetIds[i], i],
          );
        }
      }

      const row = mapRow(r.rows[0] as Record<string, unknown>);
      const mediaMap = await loadMediaAssetIds(pool, [id]);
      row.mediaAssetIds = mediaMap.get(id) ?? [];
      return row;
    },

    async findById(id) {
      const r = await pool.query(`SELECT * FROM jobs_postings WHERE id = $1`, [id]);
      if (r.rows.length === 0) return null;
      const row = mapRow(r.rows[0] as Record<string, unknown>);
      const mediaMap = await loadMediaAssetIds(pool, [id]);
      row.mediaAssetIds = mediaMap.get(id) ?? [];
      return row;
    },

    async listPublished(filter) {
      const conditions = ["status = 'published'"];
      const vals: unknown[] = [];
      let idx = 1;

      if (filter.jobType) {
        conditions.push(`job_type = $${idx}`);
        vals.push(filter.jobType);
        idx++;
      }
      if (filter.workMode) {
        conditions.push(`work_mode = $${idx}`);
        vals.push(filter.workMode);
        idx++;
      }
      if (filter.country) {
        conditions.push(`location_country = $${idx}`);
        vals.push(filter.country);
        idx++;
      }
      if (filter.search) {
        conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
        vals.push(`%${filter.search}%`);
        idx++;
      }

      const where = conditions.join(" AND ");

      const countR = await pool.query(`SELECT count(*)::int AS total FROM jobs_postings WHERE ${where}`, vals);
      const total = (countR.rows[0] as { total: number }).total;

      vals.push(filter.limit, filter.offset);
      const r = await pool.query(
        `SELECT * FROM jobs_postings WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        vals,
      );

      const rows: JobRow[] = r.rows.map((row: Record<string, unknown>) => mapRow(row));
      const jobIds = rows.map((j) => j.id);
      const mediaMap = await loadMediaAssetIds(pool, jobIds);
      for (const row of rows) {
        row.mediaAssetIds = mediaMap.get(row.id) ?? [];
      }

      return { rows, total };
    },

    async listByEmployer(filter) {
      const countR = await pool.query(
        `SELECT count(*)::int AS total FROM jobs_postings WHERE employer_id = $1`,
        [filter.employerId],
      );
      const total = (countR.rows[0] as { total: number }).total;

      const r = await pool.query(
        `SELECT * FROM jobs_postings WHERE employer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [filter.employerId, filter.limit, filter.offset],
      );

      const rows: JobRow[] = r.rows.map((row: Record<string, unknown>) => mapRow(row));
      const jobIds = rows.map((j) => j.id);
      const mediaMap = await loadMediaAssetIds(pool, jobIds);
      for (const row of rows) {
        row.mediaAssetIds = mediaMap.get(row.id) ?? [];
      }

      return { rows, total };
    },
  };
}
