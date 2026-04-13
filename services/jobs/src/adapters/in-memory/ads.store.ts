import type { AdPlacementRow, AdCampaignRow, AdCreativeRow } from "../../domain/types.js";
import type { AdsRepository } from "../../ports/ads.repository.js";

export function createInMemoryAdsStore(): AdsRepository {
  const placements = new Map<string, AdPlacementRow>();
  const campaigns = new Map<string, AdCampaignRow>();
  const creatives = new Map<string, AdCreativeRow>();

  return {
    async createPlacement(input) {
      const row: AdPlacementRow = { ...input, createdAt: new Date().toISOString() };
      placements.set(row.id, row);
      return row;
    },
    async listPlacements() {
      return [...placements.values()];
    },
    async createCampaign(input) {
      const now = new Date().toISOString();
      const row: AdCampaignRow = { ...input, createdAt: now, updatedAt: now };
      campaigns.set(row.id, row);
      return row;
    },
    async listCampaignsByAdvertiser(advertiserSubjectId) {
      return [...campaigns.values()].filter((c) => c.advertiserSubjectId === advertiserSubjectId);
    },
    async findCampaign(id) {
      return campaigns.get(id) ?? null;
    },
    async createCreative(input) {
      const row: AdCreativeRow = { ...input, impressionCount: 0, clickCount: 0, createdAt: new Date().toISOString() };
      creatives.set(row.id, row);
      return row;
    },
    async listCreativesByCampaign(campaignId) {
      return [...creatives.values()].filter((c) => c.campaignId === campaignId);
    },
    async serveAd(placementType) {
      // Find a creative for an active campaign matching this placement type
      for (const creative of creatives.values()) {
        const placement = placements.get(creative.placementId);
        if (!placement || placement.placementType !== placementType) continue;
        const campaign = campaigns.get(creative.campaignId);
        if (!campaign || campaign.status !== "active") continue;
        return creative;
      }
      return null;
    },
    async recordImpression(creativeId) {
      const c = creatives.get(creativeId);
      if (c) creatives.set(creativeId, { ...c, impressionCount: c.impressionCount + 1 });
    },
    async recordClick(creativeId) {
      const c = creatives.get(creativeId);
      if (c) creatives.set(creativeId, { ...c, clickCount: c.clickCount + 1 });
    },
  };
}
