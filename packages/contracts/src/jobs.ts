import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const JobStatusSchema = z.enum([
  "draft",
  "published",
  "closed",
  "archived",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "other",
]);
export type JobType = z.infer<typeof JobTypeSchema>;

export const WorkModeSchema = z.enum(["onsite", "hybrid", "remote"]);
export type WorkMode = z.infer<typeof WorkModeSchema>;

export const CompensationPeriodSchema = z.enum([
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);
export type CompensationPeriod = z.infer<typeof CompensationPeriodSchema>;

/* -------------------------------------------------------------------------- */
/* Value objects                                                               */
/* -------------------------------------------------------------------------- */

/** Region-agnostic compensation — supports any currency (ISO 4217) and period. */
export const CompensationSchema = z
  .object({
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    currency: z.string().length(3),
    period: CompensationPeriodSchema,
  })
  .strict();
export type Compensation = z.infer<typeof CompensationSchema>;

/** Region-agnostic location — no hardcoded country assumptions. */
export const JobLocationSchema = z
  .object({
    city: z.string().max(120).optional(),
    region: z.string().max(120).optional(),
    country: z.string().length(2).optional(),
  })
  .strict();
export type JobLocation = z.infer<typeof JobLocationSchema>;

/* -------------------------------------------------------------------------- */
/* Public (API response) shape                                                */
/* -------------------------------------------------------------------------- */

export const JobPublicSchema = z.object({
  id: z.string().uuid(),
  employerId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  jobType: JobTypeSchema,
  workMode: WorkModeSchema,
  location: JobLocationSchema.nullable(),
  compensation: CompensationSchema.nullable(),
  status: JobStatusSchema,
  tags: z.array(z.string()),
  mediaAssetIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type JobPublic = z.infer<typeof JobPublicSchema>;

/* -------------------------------------------------------------------------- */
/* List jobs (public, no auth)                                                */
/* -------------------------------------------------------------------------- */

export const ListJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
  jobType: JobTypeSchema.optional(),
  workMode: WorkModeSchema.optional(),
  country: z.string().length(2).optional(),
  search: z.string().max(200).optional(),
});
export type ListJobsQuery = z.infer<typeof ListJobsQuerySchema>;

export const ListJobsResponseSchema = z.object({
  jobs: z.array(JobPublicSchema),
  total: z.number().int().min(0),
});
export type ListJobsResponse = z.infer<typeof ListJobsResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Employer creates / updates a job                                           */
/* -------------------------------------------------------------------------- */

export const CreateJobRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    title: z.string().min(1).max(300),
    description: z.string().max(10000).optional(),
    jobType: JobTypeSchema,
    workMode: WorkModeSchema,
    location: JobLocationSchema.optional(),
    compensation: CompensationSchema.optional(),
    tags: z.array(z.string().max(60)).max(20).optional(),
    mediaAssetIds: z.array(z.string().uuid()).max(16).optional(),
  })
  .strict();
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const UpdateJobRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(10000).optional(),
    jobType: JobTypeSchema.optional(),
    workMode: WorkModeSchema.optional(),
    location: JobLocationSchema.optional(),
    compensation: CompensationSchema.optional(),
    status: JobStatusSchema.optional(),
    tags: z.array(z.string().max(60)).max(20).optional(),
    mediaAssetIds: z.array(z.string().uuid()).max(16).optional(),
  })
  .strict();
export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;
