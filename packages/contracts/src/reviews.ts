import { z } from "zod";

export const CompanyReviewPublicSchema = z.object({
  id: z.string().uuid(),
  employerId: z.string().uuid(),
  reviewerCoreSubjectId: z.string().uuid(),
  overallRating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  pros: z.string().nullable(),
  cons: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
});
export type CompanyReviewPublic = z.infer<typeof CompanyReviewPublicSchema>;

export const SubmitReviewRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    overallRating: z.number().int().min(1).max(5),
    title: z.string().max(200).optional(),
    pros: z.string().max(5000).optional(),
    cons: z.string().max(5000).optional(),
  })
  .strict();
export type SubmitReviewRequest = z.infer<typeof SubmitReviewRequestSchema>;

export const ListCompanyReviewsResponseSchema = z.object({
  reviews: z.array(CompanyReviewPublicSchema),
  averageRating: z.number().min(0).max(5),
  total: z.number().int().min(0),
});
export type ListCompanyReviewsResponse = z.infer<typeof ListCompanyReviewsResponseSchema>;
