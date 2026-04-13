import type {
  ModerationQueueItemRow,
  ModerationActionRow,
  FlagRow,
  EmployerVerificationRow,
} from "../domain/types.js";

export interface ModerationRepository {
  createFlag(input: Omit<FlagRow, "createdAt">): Promise<FlagRow>;
  createQueueItem(input: Omit<ModerationQueueItemRow, "createdAt" | "updatedAt">): Promise<ModerationQueueItemRow>;
  listQueue(status: string | undefined, limit: number, offset: number): Promise<{ rows: ModerationQueueItemRow[]; total: number }>;
  findQueueItem(id: string): Promise<ModerationQueueItemRow | null>;
  updateQueueItemStatus(id: string, status: string): Promise<ModerationQueueItemRow | null>;
  createAction(input: Omit<ModerationActionRow, "createdAt">): Promise<ModerationActionRow>;
  listActionsByQueueItem(queueItemId: string): Promise<ModerationActionRow[]>;
  createVerification(input: Omit<EmployerVerificationRow, "createdAt" | "updatedAt">): Promise<EmployerVerificationRow>;
  findVerificationByEmployer(employerId: string): Promise<EmployerVerificationRow | null>;
  updateVerification(id: string, status: string, reviewedBySubjectId: string, notes?: string): Promise<EmployerVerificationRow | null>;
}
