import {
  ApplicationPublicSchema,
  ApplyForJobRequestSchema,
  CandidateProfilePublicSchema,
  ListCandidateApplicationsQuerySchema,
  ListCandidateApplicationsResponseSchema,
  UpsertCandidateProfileRequestSchema,
} from "@jobs/contracts";
import {
  assertSubjectMatchesPrincipal,
  UnauthorizedSubjectMismatchError,
} from "@cosmox/http-auth";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { JobsService } from "../domain/jobs-service.js";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerCandidateRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post(
    "/v1/candidates/profile",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpsertCandidateProfileRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const profile = await svc.upsertCandidateProfile({
          subjectId: principal.subjectId,
          displayName: parsed.displayName,
          headline: parsed.headline,
          summary: parsed.summary,
          resumeAssetId: parsed.resumeAssetId,
        });

        return reply.send(
          CandidateProfilePublicSchema.parse({
            ...profile,
            coreSubjectId: principal.coreSubjectId,
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        }
        if (e instanceof UnauthorizedSubjectMismatchError) {
          return errorReply(reply, 403, e.code, e.message, req.id);
        }
        throw e;
      }
    },
  );

  app.get(
    "/v1/candidates/profile",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const profile = await svc.getCandidateProfileBySubject(principal.subjectId);
      if (!profile) {
        return errorReply(reply, 404, "not_found", "Candidate profile not found.", req.id);
      }
      return reply.send(
        CandidateProfilePublicSchema.parse({
          ...profile,
          coreSubjectId: principal.coreSubjectId,
        }),
      );
    },
  );

  app.post(
    "/v1/jobs/:id/apply",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = ApplyForJobRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const application = await svc.applyForJob({
          subjectId: principal.subjectId,
          coreSubjectId: principal.coreSubjectId,
          jobId: id,
          coverLetter: parsed.coverLetter,
          resumeAssetId: parsed.resumeAssetId,
        });

        return reply.code(201).send(
          ApplicationPublicSchema.parse({
            ...application,
            coreSubjectId: principal.coreSubjectId,
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        }
        if (e instanceof UnauthorizedSubjectMismatchError) {
          return errorReply(reply, 403, e.code, e.message, req.id);
        }
        const code = (e as { code?: string }).code;
        if (code === "not_found") return errorReply(reply, 404, "not_found", (e as Error).message, req.id);
        if (code === "job_not_published") return errorReply(reply, 400, "job_not_published", (e as Error).message, req.id);
        if (code === "profile_required") return errorReply(reply, 400, "profile_required", (e as Error).message, req.id);
        if (code === "duplicate_application") return errorReply(reply, 409, "duplicate_application", (e as Error).message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/candidates/applications",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const principal = req.principal!;
        const query = ListCandidateApplicationsQuerySchema.parse({
          ...(req.query as Record<string, unknown>),
          coreSubjectId: principal.coreSubjectId,
        });

        const profile = await svc.getCandidateProfileBySubject(principal.subjectId);
        if (!profile) {
          return reply.send(
            ListCandidateApplicationsResponseSchema.parse({
              applications: [],
              total: 0,
            }),
          );
        }

        const { rows, total } = await input.applications.listByCandidate({
          candidateProfileId: profile.id,
          limit: query.limit,
          offset: query.offset,
        });

        return reply.send(
          ListCandidateApplicationsResponseSchema.parse({
            applications: rows.map((r) =>
              ApplicationPublicSchema.parse({
                ...r,
                coreSubjectId: principal.coreSubjectId,
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
