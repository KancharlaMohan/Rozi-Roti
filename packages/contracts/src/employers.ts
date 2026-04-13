import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Employer public shape                                                      */
/* -------------------------------------------------------------------------- */

export const EmployerPublicSchema = z.object({
  id: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  companyName: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  logoAssetId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EmployerPublic = z.infer<typeof EmployerPublicSchema>;

/* -------------------------------------------------------------------------- */
/* Register employer                                                          */
/* -------------------------------------------------------------------------- */

export const RegisterEmployerRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    companyName: z.string().min(1).max(300),
    description: z.string().max(5000).optional(),
    website: z.string().url().max(500).optional(),
    logoAssetId: z.string().uuid().optional(),
  })
  .strict();
export type RegisterEmployerRequest = z.infer<typeof RegisterEmployerRequestSchema>;

/* -------------------------------------------------------------------------- */
/* List employer's own jobs                                                   */
/* -------------------------------------------------------------------------- */

export const ListEmployerJobsQuerySchema = z.object({
  coreSubjectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type ListEmployerJobsQuery = z.infer<typeof ListEmployerJobsQuerySchema>;
