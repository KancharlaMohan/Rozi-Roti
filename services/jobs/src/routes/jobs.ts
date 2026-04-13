import {
  ListJobsQuerySchema,
  ListJobsResponseSchema,
} from "@jobs/contracts";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply, jobRowToPublic } from "./_shared.js";

export function registerJobRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
): void {
  app.get("/v1/jobs", async (req, reply) => {
    try {
      const query = ListJobsQuerySchema.parse(req.query);
      const { rows, total } = await input.jobs.listPublished(query);
      return reply.send(
        ListJobsResponseSchema.parse({
          jobs: rows.map(jobRowToPublic),
          total,
        }),
      );
    } catch (e) {
      if (e instanceof ZodError) {
        return errorReply(reply, 400, "validation_error", "Invalid query parameters.", req.id);
      }
      throw e;
    }
  });

  app.get("/v1/jobs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await input.jobs.findById(id);
    if (!row || row.status === "draft") {
      return errorReply(reply, 404, "not_found", "Job not found.", req.id);
    }
    return reply.send(jobRowToPublic(row));
  });
}
