import { z } from "zod";

export const ProficiencyLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);
export type ProficiencyLevel = z.infer<typeof ProficiencyLevelSchema>;

export const CandidateSkillPublicSchema = z.object({
  id: z.string().uuid(),
  candidateProfileId: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  skillName: z.string(),
  proficiency: ProficiencyLevelSchema,
  createdAt: z.string().datetime(),
});
export type CandidateSkillPublic = z.infer<typeof CandidateSkillPublicSchema>;

export const AddCandidateSkillRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    skillName: z.string().min(1).max(100),
    proficiency: ProficiencyLevelSchema,
  })
  .strict();
export type AddCandidateSkillRequest = z.infer<typeof AddCandidateSkillRequestSchema>;

export const RemoveCandidateSkillRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
  })
  .strict();
export type RemoveCandidateSkillRequest = z.infer<typeof RemoveCandidateSkillRequestSchema>;

export const ListCandidateSkillsResponseSchema = z.object({
  skills: z.array(CandidateSkillPublicSchema),
});
export type ListCandidateSkillsResponse = z.infer<typeof ListCandidateSkillsResponseSchema>;
