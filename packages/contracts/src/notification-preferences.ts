import { z } from "zod";

export const NotificationCategorySchema = z.enum([
  "application_updates",
  "job_alerts",
  "messages",
  "marketing",
]);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const NotificationChannelSchema = z.enum(["email", "push", "in_app"]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const JobsNotificationPreferenceItemSchema = z.object({
  category: NotificationCategorySchema,
  channel: NotificationChannelSchema,
  enabled: z.boolean(),
});
export type JobsNotificationPreferenceItem = z.infer<typeof JobsNotificationPreferenceItemSchema>;

export const UpsertJobsNotificationPreferencesRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    preferences: z.array(JobsNotificationPreferenceItemSchema).min(1).max(20),
  })
  .strict();
export type UpsertJobsNotificationPreferencesRequest = z.infer<typeof UpsertJobsNotificationPreferencesRequestSchema>;

export const ListJobsNotificationPreferencesResponseSchema = z.object({
  preferences: z.array(JobsNotificationPreferenceItemSchema),
});
export type ListJobsNotificationPreferencesResponse = z.infer<typeof ListJobsNotificationPreferencesResponseSchema>;
