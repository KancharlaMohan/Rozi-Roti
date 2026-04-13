import { createRequirePrincipalPreHandler } from "@cosmox/http-auth";
import type { AuthenticateRequestPort } from "@cosmox/providers";
import { randomUUID } from "crypto";
import Fastify, { type FastifyInstance } from "fastify";
import type { JobsEnv } from "./env.js";
import { JobsService, type JobsServiceDeps } from "./domain/jobs-service.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerEmployerRoutes } from "./routes/employers.js";
import { registerCandidateRoutes } from "./routes/candidates.js";
import { registerSavedJobRoutes } from "./routes/saved-jobs.js";
import { registerCandidateProfileRoutes } from "./routes/candidate-profile.js";
import { registerNotificationPreferenceRoutes } from "./routes/notification-preferences.js";
import { registerTemplateRoutes } from "./routes/templates.js";
import { registerRecentlyViewedRoutes } from "./routes/recently-viewed.js";
import { registerCandidateSearchRoutes } from "./routes/candidate-search.js";
import { registerPrivacyRoutes } from "./routes/privacy.js";
import { registerModerationRoutes } from "./routes/moderation.js";
import { registerMessagingRoutes } from "./routes/messaging.js";
import { registerInterviewRoutes } from "./routes/interviews.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerReviewRoutes } from "./routes/reviews.js";

export type BuildJobsAppInput = {
  env: JobsEnv;
  authenticate: AuthenticateRequestPort;
} & JobsServiceDeps;

export async function buildJobsApp(
  input: BuildJobsAppInput,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    genReqId: (req) =>
      (req.headers["x-request-id"] as string | undefined)?.trim() ||
      randomUUID(),
  });

  const requirePrincipal = createRequirePrincipalPreHandler(input.authenticate);
  const svc = new JobsService(input);

  registerHealthRoutes(app, input.env);
  registerJobRoutes(app, input);
  registerEmployerRoutes(app, svc, input, requirePrincipal);
  registerCandidateRoutes(app, svc, input, requirePrincipal);
  registerSavedJobRoutes(app, svc, input, requirePrincipal);
  registerCandidateProfileRoutes(app, input, requirePrincipal);
  registerNotificationPreferenceRoutes(app, input, requirePrincipal);
  registerTemplateRoutes(app, svc, input, requirePrincipal);
  registerRecentlyViewedRoutes(app, input, requirePrincipal);
  registerCandidateSearchRoutes(app, svc, input, requirePrincipal);
  registerPrivacyRoutes(app, input, requirePrincipal);
  registerModerationRoutes(app, svc, input, requirePrincipal);
  registerMessagingRoutes(app, input, requirePrincipal);
  registerInterviewRoutes(app, input, requirePrincipal);
  registerAnalyticsRoutes(app, svc, input, requirePrincipal);
  registerAdminRoutes(app, input, requirePrincipal);
  registerReviewRoutes(app, input, requirePrincipal);

  return app;
}
