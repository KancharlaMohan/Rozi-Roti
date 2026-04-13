import {
  UpsertJobsNotificationPreferencesRequestSchema,
  ListJobsNotificationPreferencesResponseSchema,
  JobsNotificationPreferenceItemSchema,
} from "@jobs/contracts";
import {
  assertSubjectMatchesPrincipal,
  UnauthorizedSubjectMismatchError,
} from "@cosmox/http-auth";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerNotificationPreferenceRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.put(
    "/v1/notifications/preferences",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpsertJobsNotificationPreferencesRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const rows = await input.notificationPreferences.upsert(
          parsed.preferences.map((p) => ({
            subjectId: principal.subjectId,
            category: p.category,
            channel: p.channel,
            enabled: p.enabled,
            updatedAt: new Date().toISOString(),
          })),
        );

        return reply.send(
          ListJobsNotificationPreferencesResponseSchema.parse({
            preferences: rows.map((r) =>
              JobsNotificationPreferenceItemSchema.parse({
                category: r.category,
                channel: r.channel,
                enabled: r.enabled,
              }),
            ),
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/notifications/preferences",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const rows = await input.notificationPreferences.listBySubject(principal.subjectId);
      return reply.send(
        ListJobsNotificationPreferencesResponseSchema.parse({
          preferences: rows.map((r) =>
            JobsNotificationPreferenceItemSchema.parse({
              category: r.category,
              channel: r.channel,
              enabled: r.enabled,
            }),
          ),
        }),
      );
    },
  );
}
