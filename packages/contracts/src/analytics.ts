import { z } from "zod";

export const AnalyticsEventTypeSchema = z.enum([
  "job_viewed",
  "job_applied",
  "profile_viewed",
  "search_performed",
]);
export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;

export const AnalyticsEventPublicSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  metadata: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});
export type AnalyticsEventPublic = z.infer<typeof AnalyticsEventPublicSchema>;

export const JobAnalyticsSummarySchema = z.object({
  jobId: z.string().uuid(),
  views: z.number().int().min(0),
  applications: z.number().int().min(0),
  conversionRate: z.number().min(0).max(1),
});
export type JobAnalyticsSummary = z.infer<typeof JobAnalyticsSummarySchema>;

export const EmployerAnalyticsResponseSchema = z.object({
  jobs: z.array(JobAnalyticsSummarySchema),
  totalViews: z.number().int().min(0),
  totalApplications: z.number().int().min(0),
});
export type EmployerAnalyticsResponse = z.infer<typeof EmployerAnalyticsResponseSchema>;

export const CandidateAnalyticsResponseSchema = z.object({
  profileViews: z.number().int().min(0),
  applicationsSent: z.number().int().min(0),
  applicationsSuccessful: z.number().int().min(0),
  successRate: z.number().min(0).max(1),
});
export type CandidateAnalyticsResponse = z.infer<typeof CandidateAnalyticsResponseSchema>;
