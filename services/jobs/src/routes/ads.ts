import {
  CreateAdPlacementRequestSchema,
  AdPlacementPublicSchema,
  ListAdPlacementsResponseSchema,
  CreateAdCampaignRequestSchema,
  AdCampaignPublicSchema,
  ListAdCampaignsResponseSchema,
  CreateAdCreativeRequestSchema,
  AdCreativePublicSchema,
  ListAdCreativesResponseSchema,
  ServeAdResponseSchema,
  AdCampaignAnalyticsSchema,
} from "@jobs/contracts";
import { assertSubjectMatchesPrincipal, UnauthorizedSubjectMismatchError } from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { JobsService } from "../domain/jobs-service.js";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  if (!req.principal?.scopes?.includes("admin")) {
    errorReply(reply, 403, "forbidden", "Admin access required.", req.id);
    return false;
  }
  return true;
}

export function registerAdRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  /* --- Admin: ad placements --- */
  app.post("/v1/admin/ad-placements", { preHandler: requirePrincipal }, async (req, reply) => {
    try {
      if (!requireAdmin(req, reply)) return;
      const parsed = CreateAdPlacementRequestSchema.parse(req.body);
      const placement = await input.ads.createPlacement({
        id: randomUUID(), placementType: parsed.placementType,
        name: parsed.name, description: parsed.description ?? null,
      });
      return reply.code(201).send(AdPlacementPublicSchema.parse(placement));
    } catch (e) {
      if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
      throw e;
    }
  });

  app.get("/v1/admin/ad-placements", { preHandler: requirePrincipal }, async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const placements = await input.ads.listPlacements();
    return reply.send(ListAdPlacementsResponseSchema.parse({
      placements: placements.map((p) => AdPlacementPublicSchema.parse(p)),
    }));
  });

  /* --- Employer: ad campaigns --- */
  app.post("/v1/employers/ad-campaigns", { preHandler: requirePrincipal }, async (req, reply) => {
    try {
      const parsed = CreateAdCampaignRequestSchema.parse(req.body);
      const principal = req.principal!;
      assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

      const campaign = await input.ads.createCampaign({
        id: randomUUID(), advertiserSubjectId: principal.subjectId,
        name: parsed.name, status: "draft",
        budget: parsed.budget ?? null, currency: parsed.currency ?? null,
        startDate: parsed.startDate ?? null, endDate: parsed.endDate ?? null,
      });
      return reply.code(201).send(AdCampaignPublicSchema.parse({
        ...campaign, advertiserCoreSubjectId: principal.coreSubjectId,
      }));
    } catch (e) {
      if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
      if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
      throw e;
    }
  });

  app.get("/v1/employers/ad-campaigns", { preHandler: requirePrincipal }, async (req, reply) => {
    const principal = req.principal!;
    const campaigns = await input.ads.listCampaignsByAdvertiser(principal.subjectId);
    return reply.send(ListAdCampaignsResponseSchema.parse({
      campaigns: campaigns.map((c) => AdCampaignPublicSchema.parse({
        ...c, advertiserCoreSubjectId: principal.coreSubjectId,
      })),
    }));
  });

  /* --- Employer: ad creatives --- */
  app.post("/v1/employers/ad-campaigns/:campaignId/creatives", { preHandler: requirePrincipal }, async (req, reply) => {
    try {
      const { campaignId } = req.params as { campaignId: string };
      const parsed = CreateAdCreativeRequestSchema.parse(req.body);
      const principal = req.principal!;
      assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

      const campaign = await input.ads.findCampaign(campaignId);
      if (!campaign || campaign.advertiserSubjectId !== principal.subjectId) {
        return errorReply(reply, 404, "not_found", "Campaign not found.", req.id);
      }

      const creative = await input.ads.createCreative({
        id: randomUUID(), campaignId, placementId: parsed.placementId,
        title: parsed.title, body: parsed.body ?? null,
        mediaAssetId: parsed.mediaAssetId ?? null, targetUrl: parsed.targetUrl ?? null,
      });
      return reply.code(201).send(AdCreativePublicSchema.parse(creative));
    } catch (e) {
      if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
      if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
      throw e;
    }
  });

  app.get("/v1/employers/ad-campaigns/:campaignId/creatives", { preHandler: requirePrincipal }, async (req, reply) => {
    const { campaignId } = req.params as { campaignId: string };
    const creatives = await input.ads.listCreativesByCampaign(campaignId);
    return reply.send(ListAdCreativesResponseSchema.parse({
      creatives: creatives.map((c) => AdCreativePublicSchema.parse(c)),
    }));
  });

  /* --- Public: serve ad --- */
  app.get("/v1/ads/serve", async (req, reply) => {
    const placement = (req.query as Record<string, string>).placement ?? "banner";
    const creative = await input.ads.serveAd(placement);
    if (creative) {
      input.ads.recordImpression(creative.id).catch(() => {}); // fire-and-forget
    }
    return reply.send(ServeAdResponseSchema.parse({ creative: creative ? AdCreativePublicSchema.parse(creative) : null }));
  });

  app.post("/v1/ads/:creativeId/click", async (req, reply) => {
    const { creativeId } = req.params as { creativeId: string };
    await input.ads.recordClick(creativeId);
    return reply.send({ ok: true });
  });

  /* --- Employer: campaign analytics --- */
  app.get("/v1/employers/ad-campaigns/:campaignId/analytics", { preHandler: requirePrincipal }, async (req, reply) => {
    const { campaignId } = req.params as { campaignId: string };
    const principal = req.principal!;
    const campaign = await input.ads.findCampaign(campaignId);
    if (!campaign || campaign.advertiserSubjectId !== principal.subjectId) {
      return errorReply(reply, 404, "not_found", "Campaign not found.", req.id);
    }
    const creatives = await input.ads.listCreativesByCampaign(campaignId);
    const totalImpressions = creatives.reduce((s, c) => s + c.impressionCount, 0);
    const totalClicks = creatives.reduce((s, c) => s + c.clickCount, 0);
    return reply.send(AdCampaignAnalyticsSchema.parse({
      campaignId, totalImpressions, totalClicks,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    }));
  });
}
