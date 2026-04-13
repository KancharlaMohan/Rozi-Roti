import {
  ProposeInterviewRequestSchema,
  UpdateInterviewRequestSchema,
  InterviewPublicSchema,
  ListInterviewsResponseSchema,
  AddInterviewFeedbackRequestSchema,
  InterviewFeedbackPublicSchema,
} from "@jobs/contracts";
import { assertSubjectMatchesPrincipal, UnauthorizedSubjectMismatchError } from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerInterviewRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post(
    "/v1/interviews",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = ProposeInterviewRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const application = await input.applications.findById(parsed.applicationId);
        if (!application) return errorReply(reply, 404, "not_found", "Application not found.", req.id);

        const interview = await input.interviews.create({
          id: randomUUID(),
          applicationId: parsed.applicationId,
          proposedBySubjectId: principal.subjectId,
          scheduledAt: parsed.scheduledAt,
          durationMinutes: parsed.durationMinutes,
          location: parsed.location ?? null,
          meetingUrl: parsed.meetingUrl ?? null,
          status: "proposed",
          notes: parsed.notes ?? null,
        });

        return reply.code(201).send(InterviewPublicSchema.parse({
          ...interview, proposedByCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.put(
    "/v1/interviews/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = UpdateInterviewRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const interview = await input.interviews.findById(id);
        if (!interview) return errorReply(reply, 404, "not_found", "Interview not found.", req.id);

        const updated = await input.interviews.update(id, {
          status: parsed.status,
          scheduledAt: parsed.scheduledAt,
          location: parsed.location,
          meetingUrl: parsed.meetingUrl,
          notes: parsed.notes,
        });
        if (!updated) return errorReply(reply, 404, "not_found", "Interview not found.", req.id);

        return reply.send(InterviewPublicSchema.parse({
          ...updated, proposedByCoreSubjectId: updated.proposedBySubjectId, // transitional gap
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.post(
    "/v1/interviews/:id/feedback",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = AddInterviewFeedbackRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const interview = await input.interviews.findById(id);
        if (!interview) return errorReply(reply, 404, "not_found", "Interview not found.", req.id);

        const feedback = await input.interviews.addFeedback({
          id: randomUUID(),
          interviewId: id,
          reviewerSubjectId: principal.subjectId,
          rating: parsed.rating ?? null,
          notes: parsed.notes ?? null,
        });

        return reply.code(201).send(InterviewFeedbackPublicSchema.parse({
          ...feedback, reviewerCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/applications/:applicationId/interviews",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { applicationId } = req.params as { applicationId: string };
      const interviews = await input.interviews.listByApplication(applicationId);
      return reply.send(ListInterviewsResponseSchema.parse({
        interviews: interviews.map((i) => InterviewPublicSchema.parse({
          ...i, proposedByCoreSubjectId: i.proposedBySubjectId, // transitional gap
        })),
      }));
    },
  );
}
