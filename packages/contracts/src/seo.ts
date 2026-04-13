import { z } from "zod";

export const SeoMetadataPublicSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  slug: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string().nullable(),
  ogImageAssetId: z.string().uuid().nullable(),
  structuredData: z.record(z.unknown()).nullable(),
  canonicalUrl: z.string().nullable(),
});
export type SeoMetadataPublic = z.infer<typeof SeoMetadataPublicSchema>;
