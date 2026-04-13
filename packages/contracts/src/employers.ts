import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const CompanySizeSchema = z.enum([
  "micro",
  "small",
  "medium",
  "large",
  "enterprise",
]);
export type CompanySize = z.infer<typeof CompanySizeSchema>;

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
  companySize: CompanySizeSchema.nullable(),
  industry: z.string().nullable(),
  foundedYear: z.number().int().nullable(),
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
    companySize: CompanySizeSchema.optional(),
    industry: z.string().max(120).optional(),
    foundedYear: z.number().int().min(1800).max(2100).optional(),
  })
  .strict();
export type RegisterEmployerRequest = z.infer<typeof RegisterEmployerRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Update employer profile                                                    */
/* -------------------------------------------------------------------------- */

export const UpdateEmployerRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    companyName: z.string().min(1).max(300).optional(),
    description: z.string().max(5000).optional(),
    website: z.string().url().max(500).optional(),
    logoAssetId: z.string().uuid().optional(),
    companySize: CompanySizeSchema.optional(),
    industry: z.string().max(120).optional(),
    foundedYear: z.number().int().min(1800).max(2100).optional(),
  })
  .strict();
export type UpdateEmployerRequest = z.infer<typeof UpdateEmployerRequestSchema>;

/* -------------------------------------------------------------------------- */
/* List employer's own jobs                                                   */
/* -------------------------------------------------------------------------- */

export const ListEmployerJobsQuerySchema = z.object({
  coreSubjectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type ListEmployerJobsQuery = z.infer<typeof ListEmployerJobsQuerySchema>;
