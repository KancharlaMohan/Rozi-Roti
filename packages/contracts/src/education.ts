import { z } from "zod";

export const EducationEntryPublicSchema = z.object({
  id: z.string().uuid(),
  candidateProfileId: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  institution: z.string(),
  degree: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  startDate: z.string().max(7),
  endDate: z.string().max(7).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EducationEntryPublic = z.infer<typeof EducationEntryPublicSchema>;

export const UpsertEducationRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    institution: z.string().min(1).max(300),
    degree: z.string().max(200).optional(),
    fieldOfStudy: z.string().max(200).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format"),
    endDate: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format").optional(),
  })
  .strict();
export type UpsertEducationRequest = z.infer<typeof UpsertEducationRequestSchema>;

export const ListEducationResponseSchema = z.object({
  entries: z.array(EducationEntryPublicSchema),
});
export type ListEducationResponse = z.infer<typeof ListEducationResponseSchema>;
