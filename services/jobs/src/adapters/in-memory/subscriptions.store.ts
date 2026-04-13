import type { SubscriptionTierRow, SubscriptionRow } from "../../domain/types.js";
import type { SubscriptionsRepository } from "../../ports/subscriptions.repository.js";

export function createInMemorySubscriptionsStore(): SubscriptionsRepository {
  const tiers = new Map<string, SubscriptionTierRow>();
  const subs = new Map<string, SubscriptionRow>();

  return {
    async createTier(input) {
      const row: SubscriptionTierRow = { ...input, createdAt: new Date().toISOString() };
      tiers.set(row.id, row);
      return row;
    },
    async listTiers() {
      return [...tiers.values()];
    },
    async findTier(id) {
      return tiers.get(id) ?? null;
    },
    async grantSubscription(input) {
      const row: SubscriptionRow = { ...input, createdAt: new Date().toISOString() };
      subs.set(row.id, row);
      return row;
    },
    async findActiveBySubject(subjectId) {
      for (const sub of subs.values()) {
        if (sub.subjectId === subjectId && sub.status === "active") {
          const tier = tiers.get(sub.tierId);
          return { ...sub, tierName: tier?.name ?? "unknown" };
        }
      }
      return null;
    },
  };
}
