import {
  SendMessageRequestSchema,
  MessagePublicSchema,
  MessageThreadPublicSchema,
  ListMessageThreadsResponseSchema,
  ListMessagesResponseSchema,
} from "@jobs/contracts";
import { assertSubjectMatchesPrincipal, UnauthorizedSubjectMismatchError } from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerMessagingRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post(
    "/v1/messages",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = SendMessageRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        // Verify the user is a party to this application
        const application = await input.applications.findById(parsed.applicationId);
        if (!application) return errorReply(reply, 404, "not_found", "Application not found.", req.id);

        const job = await input.jobs.findById(application.jobId);
        if (!job) return errorReply(reply, 404, "not_found", "Job not found.", req.id);

        const employer = await input.employers.findById(job.employerId);
        const isCandidate = application.subjectId === principal.subjectId;
        const isEmployer = employer?.subjectId === principal.subjectId;
        if (!isCandidate && !isEmployer) {
          return errorReply(reply, 403, "forbidden", "Not a party to this application.", req.id);
        }

        const thread = await input.messaging.findOrCreateThread(parsed.applicationId);
        const message = await input.messaging.createMessage({
          id: randomUUID(),
          threadId: thread.id,
          senderSubjectId: principal.subjectId,
          content: parsed.content,
        });

        return reply.code(201).send(MessagePublicSchema.parse({
          ...message, senderCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/messages/threads",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      // Get all applications where this user is involved
      const candidateProfile = await input.candidates.findBySubjectId(principal.subjectId);
      const employer = await input.employers.findBySubjectId(principal.subjectId);

      const appIds: string[] = [];
      if (candidateProfile) {
        const { rows } = await input.applications.listByCandidate({ candidateProfileId: candidateProfile.id, limit: 100, offset: 0 });
        appIds.push(...rows.map((r) => r.id));
      }
      // For employer, we'd need to list all applications for their jobs — simplified for now
      const threads = await input.messaging.listThreadsBySubject(principal.subjectId, appIds);
      return reply.send(ListMessageThreadsResponseSchema.parse({
        threads: threads.map((t) => MessageThreadPublicSchema.parse(t)),
      }));
    },
  );

  app.get(
    "/v1/messages/threads/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const messages = await input.messaging.listMessagesByThread(id);
      return reply.send(ListMessagesResponseSchema.parse({
        messages: messages.map((m) => MessagePublicSchema.parse({
          ...m,
          senderCoreSubjectId: m.senderSubjectId, // transitional gap per IDENTITY_RULES.md
        })),
      }));
    },
  );

  app.put(
    "/v1/messages/:id/read",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const updated = await input.messaging.markRead(id);
      if (!updated) return errorReply(reply, 404, "not_found", "Message not found.", req.id);
      return reply.send(MessagePublicSchema.parse({
        ...updated, senderCoreSubjectId: updated.senderSubjectId,
      }));
    },
  );
}
