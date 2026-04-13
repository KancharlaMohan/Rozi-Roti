import type { SubscriptionTierRow, SubscriptionRow } from "../domain/types.js";

export interface SubscriptionsRepository {
  createTier(input: Omit<SubscriptionTierRow, "createdAt">): Promise<SubscriptionTierRow>;
  listTiers(): Promise<SubscriptionTierRow[]>;
  findTier(id: string): Promise<SubscriptionTierRow | null>;
  grantSubscription(input: Omit<SubscriptionRow, "createdAt">): Promise<SubscriptionRow>;
  findActiveBySubject(subjectId: string): Promise<(SubscriptionRow & { tierName: string }) | null>;
}
