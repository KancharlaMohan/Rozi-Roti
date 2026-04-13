import {
  CreateJobTemplateRequestSchema,
  JobTemplatePublicSchema,
  ListJobTemplatesResponseSchema,
} from "@jobs/contracts";
import { assertSubjectMatchesPrincipal, UnauthorizedSubjectMismatchError } from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { JobsService } from "../domain/jobs-service.js";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerTemplateRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post(
    "/v1/employers/templates",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = CreateJobTemplateRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);

        const template = await input.jobTemplates.create({
          id: randomUUID(),
          employerId: employer.id,
          name: parsed.name,
          title: parsed.title,
          description: parsed.description ?? null,
          jobType: parsed.jobType ?? null,
          workMode: parsed.workMode ?? null,
          requiredSkills: parsed.requiredSkills ?? [],
          industry: parsed.industry ?? null,
          experienceLevel: parsed.experienceLevel ?? null,
        });

        return reply.code(201).send(JobTemplatePublicSchema.parse(template));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/employers/templates",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const employer = await svc.getEmployerBySubject(principal.subjectId);
      if (!employer) return errorReply(reply, 404, "employer_not_found", "Register as an employer first.", req.id);
      const templates = await input.jobTemplates.listByEmployer(employer.id);
      return reply.send(ListJobTemplatesResponseSchema.parse({ templates: templates.map((t) => JobTemplatePublicSchema.parse(t)) }));
    },
  );

  app.delete(
    "/v1/employers/templates/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const principal = req.principal!;
      const employer = await svc.getEmployerBySubject(principal.subjectId);
      if (!employer) return reply.send({ ok: true });
      await input.jobTemplates.remove(id, employer.id);
      return reply.send({ ok: true });
    },
  );
}
