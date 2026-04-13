import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Application status                                                          */
/* -------------------------------------------------------------------------- */

export const ApplicationStatusSchema = z.enum([
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

/* -------------------------------------------------------------------------- */
/* Application public shape                                                    */
/* -------------------------------------------------------------------------- */

export const ApplicationPublicSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  candidateProfileId: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  status: ApplicationStatusSchema,
  coverLetter: z.string().nullable(),
  resumeAssetId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ApplicationPublic = z.infer<typeof ApplicationPublicSchema>;

/* -------------------------------------------------------------------------- */
/* Apply for a job                                                             */
/* -------------------------------------------------------------------------- */

export const ApplyForJobRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    coverLetter: z.string().max(5000).optional(),
    resumeAssetId: z.string().uuid().optional(),
  })
  .strict();
export type ApplyForJobRequest = z.infer<typeof ApplyForJobRequestSchema>;

/* -------------------------------------------------------------------------- */
/* List candidate's applications                                               */
/* -------------------------------------------------------------------------- */

export const ListCandidateApplicationsQuerySchema = z.object({
  coreSubjectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type ListCandidateApplicationsQuery = z.infer<typeof ListCandidateApplicationsQuerySchema>;

export const ListCandidateApplicationsResponseSchema = z.object({
  applications: z.array(ApplicationPublicSchema),
  total: z.number().int().min(0),
});
export type ListCandidateApplicationsResponse = z.infer<typeof ListCandidateApplicationsResponseSchema>;

/* -------------------------------------------------------------------------- */
/* List applications for a job (employer view)                                 */
/* -------------------------------------------------------------------------- */

export const ListJobApplicationsQuerySchema = z.object({
  coreSubjectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type ListJobApplicationsQuery = z.infer<typeof ListJobApplicationsQuerySchema>;

export const ListJobApplicationsResponseSchema = z.object({
  applications: z.array(ApplicationPublicSchema),
  total: z.number().int().min(0),
});
export type ListJobApplicationsResponse = z.infer<typeof ListJobApplicationsResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Update application status (employer action)                                 */
/* -------------------------------------------------------------------------- */

export const UpdateApplicationStatusRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    status: ApplicationStatusSchema,
  })
  .strict();
export type UpdateApplicationStatusRequest = z.infer<typeof UpdateApplicationStatusRequestSchema>;
