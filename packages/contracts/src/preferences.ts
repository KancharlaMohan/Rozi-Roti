import { z } from "zod";
import { JobTypeSchema, WorkModeSchema, JobLocationSchema } from "./jobs.js";

export const AvailabilityStatusSchema = z.enum([
  "actively_looking",
  "open",
  "not_looking",
]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const CandidatePreferencesPublicSchema = z.object({
  candidateProfileId: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  desiredJobTypes: z.array(JobTypeSchema),
  desiredWorkModes: z.array(WorkModeSchema),
  desiredLocations: z.array(JobLocationSchema),
  salaryMin: z.number().min(0).nullable(),
  salaryMax: z.number().min(0).nullable(),
  salaryCurrency: z.string().length(3).nullable(),
  industries: z.array(z.string()),
  availabilityStatus: AvailabilityStatusSchema,
  updatedAt: z.string().datetime(),
});
export type CandidatePreferencesPublic = z.infer<typeof CandidatePreferencesPublicSchema>;

export const UpsertCandidatePreferencesRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    desiredJobTypes: z.array(JobTypeSchema).max(10).optional(),
    desiredWorkModes: z.array(WorkModeSchema).max(5).optional(),
    desiredLocations: z.array(JobLocationSchema).max(10).optional(),
    salaryMin: z.number().min(0).optional(),
    salaryMax: z.number().min(0).optional(),
    salaryCurrency: z.string().length(3).optional(),
    industries: z.array(z.string().max(120)).max(20).optional(),
    availabilityStatus: AvailabilityStatusSchema.optional(),
  })
  .strict();
export type UpsertCandidatePreferencesRequest = z.infer<typeof UpsertCandidatePreferencesRequestSchema>;
