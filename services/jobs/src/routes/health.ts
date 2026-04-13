import { HealthResponseSchema } from "@jobs/contracts";
import type { FastifyInstance } from "fastify";
import type { JobsEnv } from "../env.js";

export function registerHealthRoutes(
  app: FastifyInstance,
  env: JobsEnv,
): void {
  app.get("/health", async (_req, reply) => {
    return reply.send(
      HealthResponseSchema.parse({
        status: "ok",
        service: "jobs",
        version: env.SERVICE_VERSION,
      }),
    );
  });
}
