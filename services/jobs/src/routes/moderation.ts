import {
  FlagRequestSchema,
  FlagPublicSchema,
  ListModerationQueueResponseSchema,
  ModerationQueueItemPublicSchema,
  ModerationActionRequestSchema,
  ModerationActionPublicSchema,
  RequestVerificationSchema,
  EmployerVerificationPublicSchema,
  AdminVerifyEmployerRequestSchema,
} from "@jobs/contracts";
import { assertSubjectMatchesPrincipal, UnauthorizedSubjectMismatchError } from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { JobsService } from "../domain/jobs-service.js";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

/** Admin scope check — per AI_CONSTITUTION.md and ARCHITECTURE_RULES.md */
function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const principal = req.principal;
  if (!principal || !principal.scopes?.includes("admin")) {
    errorReply(reply, 403, "forbidden", "Admin access required.", req.id);
    return false;
  }
  return true;
}

export function registerModerationRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipalHandler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  // --- Any authenticated user can flag content ---
  app.post(
    "/v1/flags",
    { preHandler: requirePrincipalHandler },
    async (req, reply) => {
      try {
        const parsed = FlagRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const flag = await input.moderation.createFlag({
          id: randomUUID(),
          entityType: parsed.entityType,
          entityId: parsed.entityId,
          flagReason: parsed.flagReason,
          reportedBySubjectId: principal.subjectId,
          description: parsed.description ?? null,
        });

        // Auto-create moderation queue item for the flagged entity
        await input.moderation.createQueueItem({
          id: randomUUID(),
          entityType: parsed.entityType,
          entityId: parsed.entityId,
          status: "flagged",
          reason: parsed.flagReason,
          submittedBySubjectId: principal.subjectId,
        });

        return reply.code(201).send(FlagPublicSchema.parse({
          ...flag, reportedByCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  // --- Admin: moderation queue ---
  app.get(
    "/v1/admin/moderation/queue",
    { preHandler: requirePrincipalHandler },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const status = (req.query as Record<string, string>).status;
      const limit = Number((req.query as Record<string, string>).limit ?? "25");
      const offset = Number((req.query as Record<string, string>).offset ?? "0");
      const { rows, total } = await input.moderation.listQueue(status, limit, offset);
      return reply.send(ListModerationQueueResponseSchema.parse({
        items: rows.map((r) => ModerationQueueItemPublicSchema.parse(r)),
        total,
      }));
    },
  );

  app.post(
    "/v1/admin/moderation/:id/action",
    { preHandler: requirePrincipalHandler },
    async (req, reply) => {
      try {
        if (!requireAdmin(req, reply)) return;
        const { id } = req.params as { id: string };
        const parsed = ModerationActionRequestSchema.parse(req.body);
        const principal = req.principal!;

        const queueItem = await input.moderation.findQueueItem(id);
        if (!queueItem) return errorReply(reply, 404, "not_found", "Queue item not found.", req.id);

        // Map action to queue status
        const statusMap: Record<string, string> = {
          approve: "approved", reject: "rejected", flag: "flagged", unflag: "pending_review",
        };
        await input.moderation.updateQueueItemStatus(id, statusMap[parsed.action] ?? "pending_review");

        const action = await input.moderation.createAction({
          id: randomUUID(),
          queueItemId: id,
          action: parsed.action,
          moderatorSubjectId: principal.subjectId,
          notes: parsed.notes ?? null,
        });

        return reply.send(ModerationActionPublicSchema.parse({
          ...action, moderatorCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        throw e;
      }
    },
  );

  // --- Employer verification ---
  app.post(
    "/v1/employers/verification-request",
    { preHandler: requirePrincipalHandler },
    async (req, reply) => {
      try {
        const parsed = RequestVerificationSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) return errorReply(reply, 404, "not_found", "Employer not found.", req.id);

        const existing = await input.moderation.findVerificationByEmployer(employer.id);
        if (existing && (existing.status === "pending" || existing.status === "verified")) {
          return errorReply(reply, 409, "verification_exists", "Verification already submitted or completed.", req.id);
        }

        const verification = await input.moderation.createVerification({
          id: randomUUID(),
          employerId: employer.id,
          documentAssetId: parsed.documentAssetId ?? null,
          status: "pending",
          reviewedBySubjectId: null,
          notes: null,
        });

        return reply.code(201).send(EmployerVerificationPublicSchema.parse(verification));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/employers/verification-status",
    { preHandler: requirePrincipalHandler },
    async (req, reply) => {
      const principal = req.principal!;
      const employer = await svc.getEmployerBySubject(principal.subjectId);
      if (!employer) return errorReply(reply, 404, "not_found", "Employer not found.", req.id);
      const verification = await input.moderation.findVerificationByEmployer(employer.id);
      if (!verification) return errorReply(reply, 404, "not_found", "No verification request found.", req.id);
      return reply.send(EmployerVerificationPublicSchema.parse(verification));
    },
  );

  app.post(
    "/v1/admin/employers/:employerId/verify",
    { preHandler: requirePrincipalHandler },
    async (req, reply) => {
      try {
        if (!requireAdmin(req, reply)) return;
        const { employerId } = req.params as { employerId: string };
        const parsed = AdminVerifyEmployerRequestSchema.parse(req.body);
        const principal = req.principal!;

        const verification = await input.moderation.findVerificationByEmployer(employerId);
        if (!verification) return errorReply(reply, 404, "not_found", "No verification request found.", req.id);

        const updated = await input.moderation.updateVerification(
          verification.id, parsed.status, principal.subjectId, parsed.notes,
        );
        if (!updated) return errorReply(reply, 404, "not_found", "Verification not found.", req.id);

        // Update employer verification_status
        await input.employers.update(employerId, {
          verificationStatus: parsed.status,
          verifiedAt: parsed.status === "verified" ? new Date().toISOString() : undefined,
        } as any);

        return reply.send(EmployerVerificationPublicSchema.parse(updated));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        throw e;
      }
    },
  );
}
