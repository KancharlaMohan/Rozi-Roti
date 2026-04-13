import { z } from "zod";
import { JobTypeSchema, WorkModeSchema, ExperienceLevelSchema } from "./jobs.js";

export const JobTemplatePublicSchema = z.object({
  id: z.string().uuid(),
  employerId: z.string().uuid(),
  name: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  jobType: JobTypeSchema.nullable(),
  workMode: WorkModeSchema.nullable(),
  requiredSkills: z.array(z.string()),
  industry: z.string().nullable(),
  experienceLevel: ExperienceLevelSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type JobTemplatePublic = z.infer<typeof JobTemplatePublicSchema>;

export const CreateJobTemplateRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    name: z.string().min(1).max(200),
    title: z.string().min(1).max(300),
    description: z.string().max(10000).optional(),
    jobType: JobTypeSchema.optional(),
    workMode: WorkModeSchema.optional(),
    requiredSkills: z.array(z.string().max(100)).max(30).optional(),
    industry: z.string().max(120).optional(),
    experienceLevel: ExperienceLevelSchema.optional(),
  })
  .strict();
export type CreateJobTemplateRequest = z.infer<typeof CreateJobTemplateRequestSchema>;

export const ListJobTemplatesResponseSchema = z.object({
  templates: z.array(JobTemplatePublicSchema),
});
export type ListJobTemplatesResponse = z.infer<typeof ListJobTemplatesResponseSchema>;
