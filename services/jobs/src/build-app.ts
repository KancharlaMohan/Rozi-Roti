import {
  ApplicationPublicSchema,
  ApplyForJobRequestSchema,
  CreateJobRequestSchema,
  ErrorBodySchema,
  HealthResponseSchema,
  JobPublicSchema,
  ListCandidateApplicationsQuerySchema,
  ListCandidateApplicationsResponseSchema,
  ListEmployerJobsQuerySchema,
  ListJobApplicationsQuerySchema,
  ListJobApplicationsResponseSchema,
  ListJobsQuerySchema,
  ListJobsResponseSchema,
  ListSavedJobsQuerySchema,
  ListSavedJobsResponseSchema,
  RegisterEmployerRequestSchema,
  EmployerPublicSchema,
  SaveJobRequestSchema,
  SavedJobItemSchema,
  UpdateApplicationStatusRequestSchema,
  UpdateJobRequestSchema,
  UpsertCandidateProfileRequestSchema,
  CandidateProfilePublicSchema,
} from "@jobs/contracts";
import { createRequirePrincipalPreHandler } from "@cosmox/http-auth";
import type { AuthenticateRequestPort } from "@cosmox/providers";
import { randomUUID } from "crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { JobsEnv } from "./env.js";
import { JobsService, type JobsServiceDeps } from "./domain/jobs-service.js";
import type { JobRow } from "./domain/types.js";

export type BuildJobsAppInput = {
  env: JobsEnv;
  authenticate: AuthenticateRequestPort;
} & JobsServiceDeps;

/** Converts a JobRow to the public API shape. */
function jobRowToPublic(row: JobRow) {
  return JobPublicSchema.parse({
    id: row.id,
    employerId: row.employerId,
    title: row.title,
    description: row.description,
    jobType: row.jobType,
    workMode: row.workMode,
    location:
      row.locationCity || row.locationRegion || row.locationCountry
        ? {
            city: row.locationCity ?? undefined,
            region: row.locationRegion ?? undefined,
            country: row.locationCountry ?? undefined,
          }
        : null,
    compensation:
      row.compCurrency && row.compPeriod
        ? {
            minAmount: row.compMinAmount ?? undefined,
            maxAmount: row.compMaxAmount ?? undefined,
            currency: row.compCurrency,
            period: row.compPeriod,
          }
        : null,
    status: row.status,
    tags: row.tags,
    mediaAssetIds: row.mediaAssetIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function errorReply(
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
  requestId: string,
) {
  return reply
    .code(status)
    .send(ErrorBodySchema.parse({ code, message, requestId }));
}

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

  /* ------------------------------------------------------------------ */
  /* Health                                                              */
  /* ------------------------------------------------------------------ */

  app.get("/health", async (_req, reply) => {
    return reply.send(
      HealthResponseSchema.parse({
        status: "ok",
        service: "jobs",
        version: input.env.SERVICE_VERSION,
      }),
    );
  });

  /* ------------------------------------------------------------------ */
  /* Public: list / get jobs                                             */
  /* ------------------------------------------------------------------ */

  app.get("/v1/jobs", async (req, reply) => {
    try {
      const query = ListJobsQuerySchema.parse(req.query);
      const { rows, total } = await input.jobs.listPublished(query);
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
  });

  app.get("/v1/jobs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await input.jobs.findById(id);
    if (!row || row.status === "draft") {
      return errorReply(reply, 404, "not_found", "Job not found.", req.id);
    }
    return reply.send(jobRowToPublic(row));
  });

  /* ------------------------------------------------------------------ */
  /* Employer endpoints                                                  */
  /* ------------------------------------------------------------------ */

  app.post(
    "/v1/employers",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = RegisterEmployerRequestSchema.parse(req.body);
        const principal = req.principal!;

        if (parsed.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

        const employer = await svc.registerEmployer({
          subjectId: principal.subjectId,
          companyName: parsed.companyName,
          description: parsed.description,
          website: parsed.website,
          logoAssetId: parsed.logoAssetId,
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

  app.post(
    "/v1/employers/jobs",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = CreateJobRequestSchema.parse(req.body);
        const principal = req.principal!;

        if (parsed.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

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
          mediaAssetIds: parsed.mediaAssetIds,
        });

        return reply.code(201).send(jobRowToPublic(job));
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
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

        if (parsed.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

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
        const code = (e as { code?: string }).code;
        if (code === "not_found") return errorReply(reply, 404, "not_found", (e as Error).message, req.id);
        if (code === "forbidden") return errorReply(reply, 403, "forbidden", (e as Error).message, req.id);
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
        const query = ListEmployerJobsQuerySchema.parse({
          ...(req.query as Record<string, unknown>),
          coreSubjectId: principal.coreSubjectId,
        });

        if (query.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

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

        return reply.send(
          ListJobApplicationsResponseSchema.parse({
            applications: rows.map((r) =>
              ApplicationPublicSchema.parse({
                ...r,
                coreSubjectId: r.subjectId,
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

        if (parsed.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

        const updated = await svc.updateApplicationStatus({
          applicationId: appId,
          employerSubjectId: principal.subjectId,
          status: parsed.status,
        });

        return reply.send(
          ApplicationPublicSchema.parse({
            ...updated,
            coreSubjectId: updated.subjectId,
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        }
        const code = (e as { code?: string }).code;
        if (code === "not_found") return errorReply(reply, 404, "not_found", (e as Error).message, req.id);
        if (code === "forbidden") return errorReply(reply, 403, "forbidden", (e as Error).message, req.id);
        throw e;
      }
    },
  );

  /* ------------------------------------------------------------------ */
  /* Candidate endpoints                                                 */
  /* ------------------------------------------------------------------ */

  app.post(
    "/v1/candidates/profile",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpsertCandidateProfileRequestSchema.parse(req.body);
        const principal = req.principal!;

        if (parsed.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

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

        if (parsed.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

        const application = await svc.applyForJob({
          subjectId: principal.subjectId,
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

  /* ------------------------------------------------------------------ */
  /* Saved jobs                                                          */
  /* ------------------------------------------------------------------ */

  app.post(
    "/v1/jobs/:id/save",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = SaveJobRequestSchema.parse(req.body);
        const principal = req.principal!;

        if (parsed.coreSubjectId !== principal.coreSubjectId) {
          return errorReply(reply, 403, "unauthorized_subject_mismatch", "Subject mismatch.", req.id);
        }

        await svc.saveJob(principal.subjectId, id);
        return reply.send({ ok: true });
      } catch (e) {
        if (e instanceof ZodError) {
          return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
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

  return app;
}
