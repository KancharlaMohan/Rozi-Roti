import type { SeoMetadataRow } from "../../domain/types.js";
import type { SeoRepository } from "../../ports/seo.repository.js";

export function createInMemorySeoStore(): SeoRepository {
  const bySlug = new Map<string, SeoMetadataRow>();
  const byEntity = new Map<string, SeoMetadataRow>(); // key = `${entityType}:${entityId}`

  return {
    async upsert(input) {
      const now = new Date().toISOString();
      const row: SeoMetadataRow = { ...input, createdAt: now, updatedAt: now };
      bySlug.set(row.slug, row);
      byEntity.set(`${row.entityType}:${row.entityId}`, row);
      return row;
    },
    async findBySlug(slug) {
      return bySlug.get(slug) ?? null;
    },
    async findByEntity(entityType, entityId) {
      return byEntity.get(`${entityType}:${entityId}`) ?? null;
    },
    async listSlugs(entityType, limit, offset) {
      const all = [...byEntity.values()]
        .filter((r) => r.entityType === entityType)
        .map((r) => r.slug);
      return { slugs: all.slice(offset, offset + limit), total: all.length };
    },
  };
}
