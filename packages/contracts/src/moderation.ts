import { z } from "zod";

export const ModerationStatusSchema = z.enum(["pending_review", "approved", "rejected", "flagged"]);
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;

export const ModerationEntityTypeSchema = z.enum(["job_posting", "employer", "candidate"]);
export type ModerationEntityType = z.infer<typeof ModerationEntityTypeSchema>;

export const FlagReasonSchema = z.enum(["spam", "scam", "inappropriate", "duplicate", "other"]);
export type FlagReason = z.infer<typeof FlagReasonSchema>;

export const ModerationActionTypeSchema = z.enum(["approve", "reject", "flag", "unflag"]);
export type ModerationActionType = z.infer<typeof ModerationActionTypeSchema>;

export const FlagRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    entityType: ModerationEntityTypeSchema,
    entityId: z.string().uuid(),
    flagReason: FlagReasonSchema,
    description: z.string().max(2000).optional(),
  })
  .strict();
export type FlagRequest = z.infer<typeof FlagRequestSchema>;

export const FlagPublicSchema = z.object({
  id: z.string().uuid(),
  entityType: ModerationEntityTypeSchema,
  entityId: z.string().uuid(),
  flagReason: FlagReasonSchema,
  description: z.string().nullable(),
  reportedByCoreSubjectId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type FlagPublic = z.infer<typeof FlagPublicSchema>;

export const ModerationQueueItemPublicSchema = z.object({
  id: z.string().uuid(),
  entityType: ModerationEntityTypeSchema,
  entityId: z.string().uuid(),
  status: ModerationStatusSchema,
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ModerationQueueItemPublic = z.infer<typeof ModerationQueueItemPublicSchema>;

export const ListModerationQueueResponseSchema = z.object({
  items: z.array(ModerationQueueItemPublicSchema),
  total: z.number().int().min(0),
});
export type ListModerationQueueResponse = z.infer<typeof ListModerationQueueResponseSchema>;

export const ModerationActionRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    action: ModerationActionTypeSchema,
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type ModerationActionRequest = z.infer<typeof ModerationActionRequestSchema>;

export const ModerationActionPublicSchema = z.object({
  id: z.string().uuid(),
  queueItemId: z.string().uuid(),
  action: ModerationActionTypeSchema,
  moderatorCoreSubjectId: z.string().uuid(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ModerationActionPublic = z.infer<typeof ModerationActionPublicSchema>;

export const VerificationStatusSchema = z.enum(["unverified", "pending", "verified", "rejected"]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const EmployerVerificationPublicSchema = z.object({
  id: z.string().uuid(),
  employerId: z.string().uuid(),
  documentAssetId: z.string().uuid().nullable(),
  status: VerificationStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EmployerVerificationPublic = z.infer<typeof EmployerVerificationPublicSchema>;

export const RequestVerificationSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    documentAssetId: z.string().uuid().optional(),
  })
  .strict();
export type RequestVerification = z.infer<typeof RequestVerificationSchema>;

export const AdminVerifyEmployerRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    status: z.enum(["verified", "rejected"]),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type AdminVerifyEmployerRequest = z.infer<typeof AdminVerifyEmployerRequestSchema>;
