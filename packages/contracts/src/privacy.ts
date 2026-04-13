import { z } from "zod";

export const ProfileVisibilitySchema = z.enum(["public", "employers_only", "hidden"]);
export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

export const PrivacySettingsPublicSchema = z.object({
  coreSubjectId: z.string().uuid(),
  profileVisibility: ProfileVisibilitySchema,
  resumeVisible: z.boolean(),
  showFullName: z.boolean(),
  updatedAt: z.string().datetime(),
});
export type PrivacySettingsPublic = z.infer<typeof PrivacySettingsPublicSchema>;

export const UpsertPrivacySettingsRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    profileVisibility: ProfileVisibilitySchema.optional(),
    resumeVisible: z.boolean().optional(),
    showFullName: z.boolean().optional(),
  })
  .strict();
export type UpsertPrivacySettingsRequest = z.infer<typeof UpsertPrivacySettingsRequestSchema>;

export const BlockedEmployerPublicSchema = z.object({
  id: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  employerId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type BlockedEmployerPublic = z.infer<typeof BlockedEmployerPublicSchema>;

export const BlockEmployerRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    employerId: z.string().uuid(),
  })
  .strict();
export type BlockEmployerRequest = z.infer<typeof BlockEmployerRequestSchema>;

export const ListBlockedEmployersResponseSchema = z.object({
  blockedEmployers: z.array(BlockedEmployerPublicSchema),
});
export type ListBlockedEmployersResponse = z.infer<typeof ListBlockedEmployersResponseSchema>;
