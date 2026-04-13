import {
  SubmitReviewRequestSchema,
  CompanyReviewPublicSchema,
  ListCompanyReviewsResponseSchema,
} from "@jobs/contracts";
import { assertSubjectMatchesPrincipal, UnauthorizedSubjectMismatchError } from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerReviewRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post(
    "/v1/employers/:employerId/reviews",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { employerId } = req.params as { employerId: string };
        const parsed = SubmitReviewRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const review = await input.reviews.create({
          id: randomUUID(),
          employerId,
          reviewerSubjectId: principal.subjectId,
          overallRating: parsed.overallRating,
          title: parsed.title ?? null,
          pros: parsed.pros ?? null,
          cons: parsed.cons ?? null,
          status: "pending_review",
        });

        return reply.code(201).send(CompanyReviewPublicSchema.parse({
          ...review, reviewerCoreSubjectId: principal.coreSubjectId,
        }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/employers/:employerId/reviews",
    async (req, reply) => {
      const { employerId } = req.params as { employerId: string };
      const limit = Number((req.query as Record<string, string>).limit ?? "25");
      const offset = Number((req.query as Record<string, string>).offset ?? "0");
      const { rows, total, averageRating } = await input.reviews.listByEmployer(employerId, limit, offset);
      return reply.send(ListCompanyReviewsResponseSchema.parse({
        reviews: rows.map((r) => CompanyReviewPublicSchema.parse({
          ...r, reviewerCoreSubjectId: r.reviewerSubjectId, // transitional gap
        })),
        averageRating,
        total,
      }));
    },
  );
}
