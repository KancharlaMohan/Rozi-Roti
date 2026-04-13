import {
  ApplicationPublicSchema,
  CreateJobRequestSchema,
  EmployerPublicSchema,
  ListEmployerJobsQuerySchema,
  ListJobApplicationsQuerySchema,
  ListJobApplicationsResponseSchema,
  ListJobsResponseSchema,
  RegisterEmployerRequestSchema,
  UpdateApplicationStatusRequestSchema,
  UpdateEmployerRequestSchema,
  UpdateJobRequestSchema,
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

export function registerEmployerRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post(
    "/v1/employers",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = RegisterEmployerRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const employer = await svc.registerEmployer({
          subjectId: principal.subjectId,
          companyName: parsed.companyName,
          description: parsed.description,
          website: parsed.website,
          logoAssetId: parsed.logoAssetId,
          companySize: parsed.companySize,
          industry: parsed.industry,
          foundedYear: parsed.foundedYear,
        });

        return reply.code(201).send(
          EmployerPublicSchema.parse({
            ...employer,
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
        if (typeof e === "object" && e !== null && (e as { code?: string }).code === "employer_already_exists") {
          return errorReply(reply, 409, "employer_already_exists", (e as Error).message, req.id);
        }
        throw e;
      }
    },
  );

  app.get(
    "/v1/employers/me",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const employer = await svc.getEmployerBySubject(principal.subjectId);
      if (!employer) {
        return errorReply(reply, 404, "not_found", "Employer profile not found.", req.id);
      }
      return reply.send(
        EmployerPublicSchema.parse({
          ...employer,
          coreSubjectId: principal.coreSubjectId,
        }),
      );
    },
  );

  app.put(
    "/v1/employers/me",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpdateEmployerRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const employer = await svc.updateEmployer(principal.subjectId, parsed);
        return reply.send(
          EmployerPublicSchema.parse({
            ...employer,
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
        throw e;
      }
    },
  );

  app.post(
    "/v1/employers/jobs",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = CreateJobRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) {
          return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);
        }

        const job = await svc.createJob({
          employerId: employer.id,
          title: parsed.title,
          description: parsed.description,
          jobType: parsed.jobType,
          workMode: parsed.workMode,
          location: parsed.location,
          compensation: parsed.compensation,
          tags: parsed.tags,
          requiredSkills: parsed.requiredSkills,
          industry: parsed.industry,
          experienceLevel: parsed.experienceLevel,
          expiresAt: parsed.expiresAt,
          mediaAssetIds: parsed.mediaAssetIds,
          screeningQuestions: parsed.screeningQuestions,
        });

        return reply.code(201).send(jobRowToPublic(job));
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

  app.put(
    "/v1/employers/jobs/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = UpdateJobRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) {
          return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);
        }

        const job = await svc.updateJob(id, employer.id, parsed);
        return reply.send(jobRowToPublic(job));
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        }
        if (e instanceof UnauthorizedSubjectMismatchError) {
          return errorReply(reply, 403, e.code, e.message, req.id);
        }
        const code = (e as { code?: string }).code;
        if (code === "not_found") return errorReply(reply, 404, "not_found", (e as Error).message, req.id);
        if (code === "forbidden") return errorReply(reply, 403, "forbidden", (e as Error).message, req.id);
        throw e;
      }
    },
  );

  app.post(
    "/v1/employers/jobs/:id/repost",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const principal = req.principal!;
        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) {
          return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);
        }
        const job = await svc.repostJob(id, employer.id);
        return reply.code(201).send(jobRowToPublic(job));
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === "not_found") return errorReply(reply, 404, "not_found", (e as Error).message, req.id);
        if (code === "forbidden") return errorReply(reply, 403, "forbidden", (e as Error).message, req.id);
        if (code === "invalid_status") return errorReply(reply, 400, "invalid_status", (e as Error).message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/employers/jobs",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const principal = req.principal!;
        // Self-only: coreSubjectId injected from principal, not from query string.
        const query = ListEmployerJobsQuerySchema.parse({
          ...(req.query as Record<string, unknown>),
          coreSubjectId: principal.coreSubjectId,
        });

        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) {
          return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);
        }

        const { rows, total } = await input.jobs.listByEmployer({
          employerId: employer.id,
          limit: query.limit,
          offset: query.offset,
        });

        return reply.send(
          ListJobsResponseSchema.parse({
            jobs: rows.map(jobRowToPublic),
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

  app.get(
    "/v1/employers/jobs/:id/applications",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const principal = req.principal!;
        const query = ListJobApplicationsQuerySchema.parse({
          ...(req.query as Record<string, unknown>),
          coreSubjectId: principal.coreSubjectId,
        });

        // Verify employer owns this job
        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) {
          return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);
        }

        const job = await input.jobs.findById(id);
        if (!job || job.employerId !== employer.id) {
          return errorReply(reply, 404, "not_found", "Job not found.", req.id);
        }

        const { rows, total } = await input.applications.listByJob({
          jobId: id,
          limit: query.limit,
          offset: query.offset,
        });

        // IDENTITY NOTE: r.subjectId is persisted identity, not canonical.
        // In production, resolve via IdentityResolutionPort to map subjectId → coreSubjectId.
        // This is a known transitional gap per IDENTITY_RESOLUTION_BOUNDARY.md.
        return reply.send(
          ListJobApplicationsResponseSchema.parse({
            applications: rows.map((r) =>
              ApplicationPublicSchema.parse({
                ...r,
                coreSubjectId: r.subjectId, // TODO: resolve via identity service
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

  app.put(
    "/v1/employers/jobs/:jobId/applications/:appId/status",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { appId } = req.params as { jobId: string; appId: string };
        const parsed = UpdateApplicationStatusRequestSchema.parse(req.body);
        const principal = req.principal!;

        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const updated = await svc.updateApplicationStatus({
          applicationId: appId,
          employerSubjectId: principal.subjectId,
          status: parsed.status,
        });

        // IDENTITY NOTE: updated.subjectId is persisted, not canonical.
        // Same transitional gap as employer application listing.
        return reply.send(
          ApplicationPublicSchema.parse({
            ...updated,
            coreSubjectId: updated.subjectId, // TODO: resolve via identity service
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
        if (code === "forbidden") return errorReply(reply, 403, "forbidden", (e as Error).message, req.id);
        throw e;
      }
    },
  );
}
