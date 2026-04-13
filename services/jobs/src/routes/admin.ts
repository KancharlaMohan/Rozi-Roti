import {
  AdminSuspendRequestSchema,
  AdminActionPublicSchema,
  ListAdminActionsResponseSchema,
} from "@jobs/contracts";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const principal = req.principal;
  if (!principal || !principal.scopes?.includes("admin")) {
    errorReply(reply, 403, "forbidden", "Admin access required.", req.id);
    return false;
  }
  return true;
}

export function registerAdminRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.put(
    "/v1/admin/employers/:id/suspend",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        if (!requireAdmin(req, reply)) return;
        const { id } = req.params as { id: string };
        const parsed = AdminSuspendRequestSchema.parse(req.body);
        const principal = req.principal!;

        const action = await input.admin.createAction({
          id: randomUUID(),
          adminSubjectId: principal.subjectId,
          actionType: "suspend",
          entityType: "employer",
          entityId: id,
          reason: parsed.reason ?? null,
          metadata: {},
        });

        return reply.send(AdminActionPublicSchema.parse({
          ...action, adminCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        throw e;
      }
    },
  );

  app.put(
    "/v1/admin/jobs/:id/remove",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        if (!requireAdmin(req, reply)) return;
        const { id } = req.params as { id: string };
        const parsed = AdminSuspendRequestSchema.parse(req.body);
        const principal = req.principal!;

        const action = await input.admin.createAction({
          id: randomUUID(),
          adminSubjectId: principal.subjectId,
          actionType: "remove",
          entityType: "job",
          entityId: id,
          reason: parsed.reason ?? null,
          metadata: {},
        });

        return reply.send(AdminActionPublicSchema.parse({
          ...action, adminCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/admin/audit-log",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const limit = Number((req.query as Record<string, string>).limit ?? "25");
      const offset = Number((req.query as Record<string, string>).offset ?? "0");
      const principal = req.principal!;
      const { rows, total } = await input.admin.listActions(limit, offset);
      return reply.send(ListAdminActionsResponseSchema.parse({
        actions: rows.map((r) => AdminActionPublicSchema.parse({
          ...r, adminCoreSubjectId: r.adminSubjectId, // transitional gap
        })),
        total,
      }));
    },
  );
}
