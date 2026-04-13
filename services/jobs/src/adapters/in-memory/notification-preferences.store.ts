import type { NotificationPreferenceRow } from "../../domain/types.js";
import type { NotificationPreferencesRepository } from "../../ports/notification-preferences.repository.js";

export function createInMemoryNotificationPreferencesStore(): NotificationPreferencesRepository {
  const rows = new Map<string, NotificationPreferenceRow>(); // key = `${subjectId}:${category}:${channel}`

  function key(subjectId: string, category: string, channel: string): string {
    return `${subjectId}:${category}:${channel}`;
  }

  return {
    async upsert(inputs) {
      const results: NotificationPreferenceRow[] = [];
      for (const input of inputs) {
        const row: NotificationPreferenceRow = { ...input, updatedAt: new Date().toISOString() };
        rows.set(key(input.subjectId, input.category, input.channel), row);
        results.push(row);
      }
      return results;
    },
    async listBySubject(subjectId) {
      return [...rows.values()].filter((r) => r.subjectId === subjectId);
    },
  };
}
