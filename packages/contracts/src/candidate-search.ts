import { z } from "zod";
import { CandidateProfilePublicSchema } from "./candidates.js";
import { CandidateSkillPublicSchema } from "./skills.js";
import { AvailabilityStatusSchema } from "./preferences.js";

export const SearchCandidatesQuerySchema = z.object({
  skills: z.string().max(500).optional(),
  country: z.string().length(2).optional(),
  availability: AvailabilityStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type SearchCandidatesQuery = z.infer<typeof SearchCandidatesQuerySchema>;

export const CandidateSearchResultSchema = z.object({
  id: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  displayName: z.string(),
  headline: z.string().nullable(),
  availabilityStatus: z.string().nullable(),
  skills: z.array(z.object({ skillName: z.string(), proficiency: z.string() })),
});
export type CandidateSearchResult = z.infer<typeof CandidateSearchResultSchema>;

export const SearchCandidatesResponseSchema = z.object({
  candidates: z.array(CandidateSearchResultSchema),
  total: z.number().int().min(0),
});
export type SearchCandidatesResponse = z.infer<typeof SearchCandidatesResponseSchema>;
