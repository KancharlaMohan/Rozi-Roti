import { createRequirePrincipalPreHandler } from "@cosmox/http-auth";
import type { AuthenticateRequestPort } from "@cosmox/providers";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
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
import { registerAdRoutes } from "./routes/ads.js";
import { registerSeoRoutes } from "./routes/seo.js";
import { registerSubscriptionRoutes } from "./routes/subscriptions.js";
import { registerAgentRoutes } from "./routes/agents.js";

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

  // Serve frontend (public/index.html) at root
  app.get("/", async (_req, reply) => {
    try {
      const dir = dirname(fileURLToPath(import.meta.url));
      const html = readFileSync(join(dir, "..", "public", "index.html"), "utf-8");
      reply.header("Content-Type", "text/html");
      return reply.send(html);
    } catch {
      return reply.code(404).send("Frontend not found");
    }
  });

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
  registerAdRoutes(app, svc, input, requirePrincipal);
  registerSeoRoutes(app, input);
  registerSubscriptionRoutes(app, input, requirePrincipal);
  registerAgentRoutes(app, input, requirePrincipal);

  return app;
}
