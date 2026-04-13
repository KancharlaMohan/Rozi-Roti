import type { NotificationPreferenceRow } from "../domain/types.js";

export interface NotificationPreferencesRepository {
  upsert(rows: NotificationPreferenceRow[]): Promise<NotificationPreferenceRow[]>;
  listBySubject(subjectId: string): Promise<NotificationPreferenceRow[]>;
}
