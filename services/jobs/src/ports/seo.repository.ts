import type { SeoMetadataRow } from "../domain/types.js";

export interface SeoRepository {
  upsert(input: Omit<SeoMetadataRow, "createdAt" | "updatedAt">): Promise<SeoMetadataRow>;
  findBySlug(slug: string): Promise<SeoMetadataRow | null>;
  findByEntity(entityType: string, entityId: string): Promise<SeoMetadataRow | null>;
  listSlugs(entityType: string, limit: number, offset: number): Promise<{ slugs: string[]; total: number }>;
}
