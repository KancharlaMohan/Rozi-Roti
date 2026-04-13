import { z } from "zod";

export const ScreeningQuestionSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  questionText: z.string(),
  required: z.boolean(),
  sortOrder: z.number().int(),
});
export type ScreeningQuestion = z.infer<typeof ScreeningQuestionSchema>;

export const ScreeningQuestionInputSchema = z.object({
  questionText: z.string().min(1).max(500),
  required: z.boolean().optional().default(false),
});
export type ScreeningQuestionInput = z.infer<typeof ScreeningQuestionInputSchema>;

export const ScreeningAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(1).max(5000),
});
export type ScreeningAnswer = z.infer<typeof ScreeningAnswerSchema>;

export const ScreeningAnswerPublicSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerText: z.string(),
  createdAt: z.string().datetime(),
});
export type ScreeningAnswerPublic = z.infer<typeof ScreeningAnswerPublicSchema>;
