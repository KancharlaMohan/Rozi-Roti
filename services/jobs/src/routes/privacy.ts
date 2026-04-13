import {
  UpsertPrivacySettingsRequestSchema,
  PrivacySettingsPublicSchema,
  BlockEmployerRequestSchema,
  BlockedEmployerPublicSchema,
  ListBlockedEmployersResponseSchema,
} from "@jobs/contracts";
import { assertSubjectMatchesPrincipal, UnauthorizedSubjectMismatchError } from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerPrivacyRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.put(
    "/v1/candidates/privacy",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpsertPrivacySettingsRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const existing = await input.privacy.getSettings(principal.subjectId);
        const settings = await input.privacy.upsertSettings({
          subjectId: principal.subjectId,
          profileVisibility: parsed.profileVisibility ?? existing?.profileVisibility ?? "employers_only",
          resumeVisible: parsed.resumeVisible ?? existing?.resumeVisible ?? true,
          showFullName: parsed.showFullName ?? existing?.showFullName ?? true,
          updatedAt: new Date().toISOString(),
        });

        return reply.send(PrivacySettingsPublicSchema.parse({
          ...settings, coreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/candidates/privacy",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const settings = await input.privacy.getSettings(principal.subjectId);
      if (!settings) {
        return reply.send(PrivacySettingsPublicSchema.parse({
          coreSubjectId: principal.coreSubjectId,
          profileVisibility: "employers_only",
          resumeVisible: true,
          showFullName: true,
          updatedAt: new Date().toISOString(),
        }));
      }
      return reply.send(PrivacySettingsPublicSchema.parse({
        ...settings, coreSubjectId: principal.coreSubjectId,
      }));
    },
  );

  app.post(
    "/v1/candidates/blocked-employers",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = BlockEmployerRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const blocked = await input.privacy.blockEmployer({
          id: randomUUID(),
          subjectId: principal.subjectId,
          employerId: parsed.employerId,
        });

        return reply.code(201).send(BlockedEmployerPublicSchema.parse({
          ...blocked, coreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.delete(
    "/v1/candidates/blocked-employers/:employerId",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { employerId } = req.params as { employerId: string };
      const principal = req.principal!;
      await input.privacy.unblockEmployer(principal.subjectId, employerId);
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/v1/candidates/blocked-employers",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const list = await input.privacy.listBlockedEmployers(principal.subjectId);
      return reply.send(ListBlockedEmployersResponseSchema.parse({
        blockedEmployers: list.map((b) => BlockedEmployerPublicSchema.parse({
          ...b, coreSubjectId: principal.coreSubjectId,
        })),
      }));
    },
  );
}
