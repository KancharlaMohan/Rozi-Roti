import {
  CreateSubscriptionTierRequestSchema,
  SubscriptionTierPublicSchema,
  ListSubscriptionTiersResponseSchema,
  GrantSubscriptionRequestSchema,
  SubscriptionPublicSchema,
} from "@jobs/contracts";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  if (!req.principal?.scopes?.includes("admin")) {
    errorReply(reply, 403, "forbidden", "Admin access required.", req.id);
    return false;
  }
  return true;
}

export function registerSubscriptionRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  /* --- Public: list tiers --- */
  app.get("/v1/subscription-tiers", async (_req, reply) => {
    const tiers = await input.subscriptions.listTiers();
    return reply.send(ListSubscriptionTiersResponseSchema.parse({
      tiers: tiers.map((t) => SubscriptionTierPublicSchema.parse(t)),
    }));
  });

  /* --- Admin: create tier --- */
  app.post("/v1/admin/subscription-tiers", { preHandler: requirePrincipal }, async (req, reply) => {
    try {
      if (!requireAdmin(req, reply)) return;
      const parsed = CreateSubscriptionTierRequestSchema.parse(req.body);
      const tier = await input.subscriptions.createTier({
        id: randomUUID(), name: parsed.name,
        tierType: parsed.tierType, features: parsed.features ?? {},
      });
      return reply.code(201).send(SubscriptionTierPublicSchema.parse(tier));
    } catch (e) {
      if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
      throw e;
    }
  });

  /* --- Admin: grant subscription (payment handled externally per DIOS) --- */
  app.post("/v1/admin/subscriptions", { preHandler: requirePrincipal }, async (req, reply) => {
    try {
      if (!requireAdmin(req, reply)) return;
      const parsed = GrantSubscriptionRequestSchema.parse(req.body);
      const tier = await input.subscriptions.findTier(parsed.tierId);
      if (!tier) return errorReply(reply, 404, "not_found", "Tier not found.", req.id);

      const sub = await input.subscriptions.grantSubscription({
        id: randomUUID(),
        subjectId: parsed.subjectId,
        tierId: parsed.tierId,
        status: "active",
        startsAt: parsed.startsAt,
        expiresAt: parsed.expiresAt ?? null,
      });
      return reply.code(201).send(SubscriptionPublicSchema.parse({
        ...sub, coreSubjectId: parsed.subjectId, tierName: tier.name,
      }));
    } catch (e) {
      if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
      throw e;
    }
  });

  /* --- Authenticated: get own subscription --- */
  app.get("/v1/subscriptions/me", { preHandler: requirePrincipal }, async (req, reply) => {
    const principal = req.principal!;
    const sub = await input.subscriptions.findActiveBySubject(principal.subjectId);
    if (!sub) return errorReply(reply, 404, "not_found", "No active subscription.", req.id);
    return reply.send(SubscriptionPublicSchema.parse({
      ...sub, coreSubjectId: principal.coreSubjectId,
    }));
  });
}
