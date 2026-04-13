import {
  EmployerAnalyticsResponseSchema,
  JobAnalyticsSummarySchema,
  CandidateAnalyticsResponseSchema,
} from "@jobs/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { JobsService } from "../domain/jobs-service.js";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerAnalyticsRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.get(
    "/v1/employers/analytics/jobs",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const employer = await svc.getEmployerBySubject(principal.subjectId);
      if (!employer) return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);

      const { rows: jobs } = await input.jobs.listByEmployer({ employerId: employer.id, limit: 100, offset: 0 });
      const jobIds = jobs.map((j) => j.id);

      const viewCounts = await input.analytics.countByEntityBatch("job", jobIds, "job_viewed");
      const applyCounts = await input.analytics.countByEntityBatch("job", jobIds, "job_applied");

      let totalViews = 0;
      let totalApps = 0;
      const summaries = jobs.map((j) => {
        const views = viewCounts.get(j.id) ?? 0;
        const apps = applyCounts.get(j.id) ?? 0;
        totalViews += views;
        totalApps += apps;
        return JobAnalyticsSummarySchema.parse({
          jobId: j.id,
          views,
          applications: apps,
          conversionRate: views > 0 ? apps / views : 0,
        });
      });

      return reply.send(EmployerAnalyticsResponseSchema.parse({
        jobs: summaries,
        totalViews,
        totalApplications: totalApps,
      }));
    },
  );

  app.get(
    "/v1/candidates/analytics",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const profile = await svc.getCandidateProfileBySubject(principal.subjectId);
      if (!profile) return errorReply(reply, 404, "not_found", "Profile not found.", req.id);

      const profileViews = await input.analytics.countByEntity("candidate", profile.id, "profile_viewed");
      const { rows: apps } = await input.applications.listByCandidate({ candidateProfileId: profile.id, limit: 1000, offset: 0 });
      const successful = apps.filter((a) => a.status === "offered" || a.status === "hired").length;

      return reply.send(CandidateAnalyticsResponseSchema.parse({
        profileViews,
        applicationsSent: apps.length,
        applicationsSuccessful: successful,
        successRate: apps.length > 0 ? successful / apps.length : 0,
      }));
    },
  );
}
