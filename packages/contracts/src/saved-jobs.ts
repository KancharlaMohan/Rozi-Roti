import { z } from "zod";
import { JobPublicSchema } from "./jobs.js";

/* -------------------------------------------------------------------------- */
/* Save / unsave a job (candidate action)                                      */
/* -------------------------------------------------------------------------- */

export const SaveJobRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
  })
  .strict();
export type SaveJobRequest = z.infer<typeof SaveJobRequestSchema>;

/* -------------------------------------------------------------------------- */
/* List saved jobs                                                             */
/* -------------------------------------------------------------------------- */

export const ListSavedJobsQuerySchema = z.object({
  coreSubjectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type ListSavedJobsQuery = z.infer<typeof ListSavedJobsQuerySchema>;

export const SavedJobItemSchema = z.object({
  jobId: z.string().uuid(),
  savedAt: z.string().datetime(),
  job: JobPublicSchema,
});
export type SavedJobItem = z.infer<typeof SavedJobItemSchema>;

export const ListSavedJobsResponseSchema = z.object({
  savedJobs: z.array(SavedJobItemSchema),
  total: z.number().int().min(0),
});
export type ListSavedJobsResponse = z.infer<typeof ListSavedJobsResponseSchema>;
