import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { BuildJobsAppInput } from "../build-app.js";
import { jobRowToPublic } from "./_shared.js";

export function registerRecentlyViewedRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.get(
    "/v1/candidates/recently-viewed",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const limit = Number((req.query as Record<string, string>).limit ?? "25");
      const offset = Number((req.query as Record<string, string>).offset ?? "0");
      const { rows, total } = await input.recentlyViewed.listBySubject(principal.subjectId, limit, offset);
      return reply.send({
        recentlyViewed: rows.map((r) => ({
          jobId: r.jobId,
          viewedAt: r.viewedAt,
          job: jobRowToPublic(r.job),
        })),
        total,
      });
    },
  );
}
