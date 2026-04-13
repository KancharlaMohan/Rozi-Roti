import type { AnalyticsEventRow } from "../domain/types.js";

export interface AnalyticsRepository {
  record(input: Omit<AnalyticsEventRow, "createdAt">): Promise<void>;
  countByEntity(entityType: string, entityId: string, eventType: string): Promise<number>;
  countByEntityBatch(entityType: string, entityIds: string[], eventType: string): Promise<Map<string, number>>;
}
