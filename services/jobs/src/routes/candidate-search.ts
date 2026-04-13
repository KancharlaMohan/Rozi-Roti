import {
  SearchCandidatesQuerySchema,
  SearchCandidatesResponseSchema,
  CandidateSearchResultSchema,
} from "@jobs/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { JobsService } from "../domain/jobs-service.js";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerCandidateSearchRoutes(
  app: FastifyInstance,
  svc: JobsService,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.get(
    "/v1/employers/candidate-search",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const principal = req.principal!;
        // Verify caller is an employer
        const employer = await svc.getEmployerBySubject(principal.subjectId);
        if (!employer) {
          return errorReply(reply, 403, "employer_required", "Only employers can search candidates.", req.id);
        }

        const query = SearchCandidatesQuerySchema.parse(req.query);
        const skills = query.skills ? query.skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

        const { rows, total } = await input.candidateSearch.search({
          skills,
          country: query.country,
          availability: query.availability,
          limit: query.limit,
          offset: query.offset,
        });

        return reply.send(
          SearchCandidatesResponseSchema.parse({
            candidates: rows.map((r) => CandidateSearchResultSchema.parse(r)),
            total,
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid query parameters.", req.id);
        throw e;
      }
    },
  );
}
