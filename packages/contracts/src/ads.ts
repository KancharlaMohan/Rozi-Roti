import { z } from "zod";

export const AdPlacementTypeSchema = z.enum([
  "banner",
  "sidebar",
  "sponsored_job",
  "featured_employer",
  "search_result_inline",
]);
export type AdPlacementType = z.infer<typeof AdPlacementTypeSchema>;

export const AdCampaignStatusSchema = z.enum(["draft", "active", "paused", "completed"]);
export type AdCampaignStatus = z.infer<typeof AdCampaignStatusSchema>;

export const AdPlacementPublicSchema = z.object({
  id: z.string().uuid(),
  placementType: AdPlacementTypeSchema,
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AdPlacementPublic = z.infer<typeof AdPlacementPublicSchema>;

export const CreateAdPlacementRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    placementType: AdPlacementTypeSchema,
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
  })
  .strict();
export type CreateAdPlacementRequest = z.infer<typeof CreateAdPlacementRequestSchema>;

export const AdCampaignPublicSchema = z.object({
  id: z.string().uuid(),
  advertiserCoreSubjectId: z.string().uuid(),
  name: z.string(),
  status: AdCampaignStatusSchema,
  budget: z.number().min(0).nullable(),
  currency: z.string().length(3).nullable(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdCampaignPublic = z.infer<typeof AdCampaignPublicSchema>;

export const CreateAdCampaignRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    name: z.string().min(1).max(200),
    budget: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .strict();
export type CreateAdCampaignRequest = z.infer<typeof CreateAdCampaignRequestSchema>;

export const AdCreativePublicSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  placementId: z.string().uuid(),
  title: z.string(),
  body: z.string().nullable(),
  mediaAssetId: z.string().uuid().nullable(),
  targetUrl: z.string().nullable(),
  impressionCount: z.number().int().min(0),
  clickCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
});
export type AdCreativePublic = z.infer<typeof AdCreativePublicSchema>;

export const CreateAdCreativeRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    placementId: z.string().uuid(),
    title: z.string().min(1).max(200),
    body: z.string().max(2000).optional(),
    mediaAssetId: z.string().uuid().optional(),
    targetUrl: z.string().url().max(1000).optional(),
  })
  .strict();
export type CreateAdCreativeRequest = z.infer<typeof CreateAdCreativeRequestSchema>;

export const ServeAdResponseSchema = z.object({
  creative: AdCreativePublicSchema.nullable(),
});
export type ServeAdResponse = z.infer<typeof ServeAdResponseSchema>;

export const ListAdCampaignsResponseSchema = z.object({
  campaigns: z.array(AdCampaignPublicSchema),
});
export type ListAdCampaignsResponse = z.infer<typeof ListAdCampaignsResponseSchema>;

export const ListAdCreativesResponseSchema = z.object({
  creatives: z.array(AdCreativePublicSchema),
});
export type ListAdCreativesResponse = z.infer<typeof ListAdCreativesResponseSchema>;

export const ListAdPlacementsResponseSchema = z.object({
  placements: z.array(AdPlacementPublicSchema),
});
export type ListAdPlacementsResponse = z.infer<typeof ListAdPlacementsResponseSchema>;

export const AdCampaignAnalyticsSchema = z.object({
  campaignId: z.string().uuid(),
  totalImpressions: z.number().int().min(0),
  totalClicks: z.number().int().min(0),
  ctr: z.number().min(0),
});
export type AdCampaignAnalytics = z.infer<typeof AdCampaignAnalyticsSchema>;
