import { z } from "zod";

export const InterviewStatusSchema = z.enum([
  "proposed",
  "confirmed",
  "rescheduled",
  "completed",
  "cancelled",
]);
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

export const InterviewPublicSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  proposedByCoreSubjectId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int(),
  location: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  status: InterviewStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InterviewPublic = z.infer<typeof InterviewPublicSchema>;

export const ProposeInterviewRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    applicationId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    durationMinutes: z.number().int().min(15).max(480).optional().default(60),
    location: z.string().max(500).optional(),
    meetingUrl: z.string().url().max(1000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type ProposeInterviewRequest = z.infer<typeof ProposeInterviewRequestSchema>;

export const UpdateInterviewRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    status: InterviewStatusSchema.optional(),
    scheduledAt: z.string().datetime().optional(),
    location: z.string().max(500).optional(),
    meetingUrl: z.string().url().max(1000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type UpdateInterviewRequest = z.infer<typeof UpdateInterviewRequestSchema>;

export const InterviewFeedbackPublicSchema = z.object({
  id: z.string().uuid(),
  interviewId: z.string().uuid(),
  reviewerCoreSubjectId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type InterviewFeedbackPublic = z.infer<typeof InterviewFeedbackPublicSchema>;

export const AddInterviewFeedbackRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    rating: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(5000).optional(),
  })
  .strict();
export type AddInterviewFeedbackRequest = z.infer<typeof AddInterviewFeedbackRequestSchema>;

export const ListInterviewsResponseSchema = z.object({
  interviews: z.array(InterviewPublicSchema),
});
export type ListInterviewsResponse = z.infer<typeof ListInterviewsResponseSchema>;
