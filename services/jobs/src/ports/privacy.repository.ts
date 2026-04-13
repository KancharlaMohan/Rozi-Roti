import type { PrivacySettingsRow, BlockedEmployerRow } from "../domain/types.js";

export interface PrivacyRepository {
  upsertSettings(input: PrivacySettingsRow): Promise<PrivacySettingsRow>;
  getSettings(subjectId: string): Promise<PrivacySettingsRow | null>;
  blockEmployer(input: Omit<BlockedEmployerRow, "createdAt">): Promise<BlockedEmployerRow>;
  unblockEmployer(subjectId: string, employerId: string): Promise<boolean>;
  listBlockedEmployers(subjectId: string): Promise<BlockedEmployerRow[]>;
  isBlocked(subjectId: string, employerId: string): Promise<boolean>;
}
