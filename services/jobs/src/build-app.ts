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

  return app;
}
