import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Candidate profile public shape                                             */
/* -------------------------------------------------------------------------- */

export const CandidateProfilePublicSchema = z.object({
  id: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  displayName: z.string(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  resumeAssetId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CandidateProfilePublic = z.infer<typeof CandidateProfilePublicSchema>;

/* -------------------------------------------------------------------------- */
/* Create / update candidate profile                                          */
/* -------------------------------------------------------------------------- */

export const UpsertCandidateProfileRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    displayName: z.string().min(1).max(200),
    headline: z.string().max(300).optional(),
    summary: z.string().max(5000).optional(),
    resumeAssetId: z.string().uuid().optional(),
  })
  .strict();
export type UpsertCandidateProfileRequest = z.infer<typeof UpsertCandidateProfileRequestSchema>;
