import type { PrivacySettingsRow, BlockedEmployerRow } from "../../domain/types.js";
import type { PrivacyRepository } from "../../ports/privacy.repository.js";

export function createInMemoryPrivacyStore(): PrivacyRepository {
  const settings = new Map<string, PrivacySettingsRow>();
  const blocked = new Map<string, BlockedEmployerRow>(); // key = `${subjectId}:${employerId}`

  return {
    async upsertSettings(input) {
      const row: PrivacySettingsRow = { ...input, updatedAt: new Date().toISOString() };
      settings.set(input.subjectId, row);
      return row;
    },
    async getSettings(subjectId) {
      return settings.get(subjectId) ?? null;
    },
    async blockEmployer(input) {
      const row: BlockedEmployerRow = { ...input, createdAt: new Date().toISOString() };
      blocked.set(`${input.subjectId}:${input.employerId}`, row);
      return row;
    },
    async unblockEmployer(subjectId, employerId) {
      return blocked.delete(`${subjectId}:${employerId}`);
    },
    async listBlockedEmployers(subjectId) {
      return [...blocked.values()].filter((r) => r.subjectId === subjectId);
    },
    async isBlocked(subjectId, employerId) {
      return blocked.has(`${subjectId}:${employerId}`);
    },
  };
}
