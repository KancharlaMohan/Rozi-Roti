import {
  ListSavedJobsQuerySchema,
  ListSavedJobsResponseSchema,
  SaveJobRequestSchema,
  SavedJobItemSchema,
} from "@jobs/contracts";
import {
  assertSubjectMatchesPrincipal,
  UnauthorizedSubjectMismatchError,
} from "@cosmox/http-auth";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { JobsService } from "../domain/jobs-service.js";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply, jobRowToPublic } from "./_shared.js";

export function registerSavedJobRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post(
    "/v1/jobs/:id/save",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = SaveJobRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        await svc.saveJob(principal.subjectId, id);
        return reply.send({ ok: true });
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        }
        if (e instanceof UnauthorizedSubjectMismatchError) {
          return errorReply(reply, 403, e.code, e.message, req.id);
        }
        const code = (e as { code?: string }).code;
        if (code === "not_found") return errorReply(reply, 404, "not_found", (e as Error).message, req.id);
        if (code === "profile_required") return errorReply(reply, 400, "profile_required", (e as Error).message, req.id);
        throw e;
      }
    },
  );

  app.delete(
    "/v1/jobs/:id/save",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const principal = req.principal!;
      await svc.unsaveJob(principal.subjectId, id);
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/v1/candidates/saved-jobs",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const principal = req.principal!;
        const query = ListSavedJobsQuerySchema.parse({
          ...(req.query as Record<string, unknown>),
          coreSubjectId: principal.coreSubjectId,
        });

        const profile = await svc.getCandidateProfileBySubject(principal.subjectId);
        if (!profile) {
          return reply.send(
            ListSavedJobsResponseSchema.parse({
              savedJobs: [],
              total: 0,
            }),
          );
        }

        const { rows, total } = await input.savedJobs.listByCandidate({
          candidateProfileId: profile.id,
          limit: query.limit,
          offset: query.offset,
        });

        return reply.send(
          ListSavedJobsResponseSchema.parse({
            savedJobs: rows.map((r) =>
              SavedJobItemSchema.parse({
                jobId: r.jobId,
                savedAt: r.savedAt,
                job: jobRowToPublic(r.job),
              }),
            ),
            total,
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid query parameters.", req.id);
        }
        throw e;
      }
    },
  );
}
