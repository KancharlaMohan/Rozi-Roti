import { ServiceEnvSchema } from "@cosmox/config";
import { z } from "zod";

export const JobsEnvSchema = ServiceEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(3100),
  /** When set, the service uses PostgreSQL; otherwise it falls back to in-memory stores. */
  JOBS_DATABASE_URL: z.string().url().optional(),
  /** Base URL of the CosmoX notifications service (optional — noop in standalone mode). */
  NOTIFICATIONS_URL: z.string().url().optional(),
  /** Service token for trusted notification sends (optional). */
  NOTIFICATIONS_SEND_TOKEN: z.string().min(1).optional(),
  /** Public base URL for SEO (sitemap, canonical URLs). */
  BASE_URL: z.string().url().optional(),
});

export type JobsEnv = z.infer<typeof JobsEnvSchema>;

export function loadJobsEnv(
  env: NodeJS.ProcessEnv = process.env,
): JobsEnv {
  return JobsEnvSchema.parse({
    ...env,
    SERVICE_NAME: env.SERVICE_NAME ?? "jobs",
  });
}
