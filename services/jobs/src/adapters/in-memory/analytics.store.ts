import type { AnalyticsEventRow } from "../../domain/types.js";
import type { AnalyticsRepository } from "../../ports/analytics.repository.js";

export function createInMemoryAnalyticsStore(): AnalyticsRepository {
  const events: AnalyticsEventRow[] = [];

  return {
    async record(input) {
      events.push({ ...input, createdAt: new Date().toISOString() });
    },
    async countByEntity(entityType, entityId, eventType) {
      return events.filter((e) => e.entityType === entityType && e.entityId === entityId && e.eventType === eventType).length;
    },
    async countByEntityBatch(entityType, entityIds, eventType) {
      const map = new Map<string, number>();
      for (const id of entityIds) map.set(id, 0);
      for (const e of events) {
        if (e.entityType === entityType && e.eventType === eventType && entityIds.includes(e.entityId)) {
          map.set(e.entityId, (map.get(e.entityId) ?? 0) + 1);
        }
      }
      return map;
    },
  };
}
