import type { AdPlacementRow, AdCampaignRow, AdCreativeRow } from "../domain/types.js";

export interface AdsRepository {
  createPlacement(input: Omit<AdPlacementRow, "createdAt">): Promise<AdPlacementRow>;
  listPlacements(): Promise<AdPlacementRow[]>;
  createCampaign(input: Omit<AdCampaignRow, "createdAt" | "updatedAt">): Promise<AdCampaignRow>;
  listCampaignsByAdvertiser(advertiserSubjectId: string): Promise<AdCampaignRow[]>;
  findCampaign(id: string): Promise<AdCampaignRow | null>;
  createCreative(input: Omit<AdCreativeRow, "impressionCount" | "clickCount" | "createdAt">): Promise<AdCreativeRow>;
  listCreativesByCampaign(campaignId: string): Promise<AdCreativeRow[]>;
  serveAd(placementType: string): Promise<AdCreativeRow | null>;
  recordImpression(creativeId: string): Promise<void>;
  recordClick(creativeId: string): Promise<void>;
}
