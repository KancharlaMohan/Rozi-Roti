import { z } from "zod";

export const ExperienceEntryPublicSchema = z.object({
  id: z.string().uuid(),
  candidateProfileId: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  title: z.string(),
  company: z.string(),
  startDate: z.string().max(7),
  endDate: z.string().max(7).nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExperienceEntryPublic = z.infer<typeof ExperienceEntryPublicSchema>;

export const UpsertExperienceRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    startDate: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format"),
    endDate: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format").optional(),
    description: z.string().max(5000).optional(),
  })
  .strict();
export type UpsertExperienceRequest = z.infer<typeof UpsertExperienceRequestSchema>;

export const ListExperienceResponseSchema = z.object({
  entries: z.array(ExperienceEntryPublicSchema),
});
export type ListExperienceResponse = z.infer<typeof ListExperienceResponseSchema>;
