import { createStubDevBearerAuthenticateAdapter } from "@cosmox/providers";
import { buildJobsApp, type BuildJobsAppInput } from "./build-app.js";
import { loadJobsEnv } from "./env.js";
import { createInMemoryEmployersStore } from "./adapters/in-memory/employers.store.js";
import { createInMemoryCandidatesStore } from "./adapters/in-memory/candidates.store.js";
import { createInMemoryJobsStore } from "./adapters/in-memory/jobs.store.js";
import { createInMemoryApplicationsStore } from "./adapters/in-memory/applications.store.js";
import { createInMemorySavedJobsStore } from "./adapters/in-memory/saved-jobs.store.js";
import { createNoopNotificationsAdapter } from "./adapters/noop-notifications.adapter.js";

const env = loadJobsEnv();

// ---------------------------------------------------------------------------
// Adapter selection: dual-mode composition root.
//
// Independent (standalone) mode — in-memory stores, noop notifications:
//   No env vars needed, just `pnpm dev`.
//
// CosmoX-integrated mode — PostgreSQL + HTTP notifications:
//   Set JOBS_DATABASE_URL, NOTIFICATIONS_URL, NOTIFICATIONS_SEND_TOKEN.
// ---------------------------------------------------------------------------

async function buildAdapters(): Promise<Omit<BuildJobsAppInput, "env" | "authenticate">> {
  if (env.JOBS_DATABASE_URL) {
    // CosmoX-integrated mode: PG adapters + optional HTTP notifications.
    const { applyBaselineSchema, createPool } = await import("@jobs/db");
    const { createPgEmployersRepository } = await import("./adapters/pg/employers.repository.js");
    const { createPgCandidatesRepository } = await import("./adapters/pg/candidates.repository.js");
    const { createPgJobsRepository } = await import("./adapters/pg/jobs.repository.js");
    const { createPgApplicationsRepository } = await import("./adapters/pg/applications.repository.js");
    const { createPgSavedJobsRepository } = await import("./adapters/pg/saved-jobs.repository.js");

    const pool = createPool(env.JOBS_DATABASE_URL, "jobs");
    await applyBaselineSchema(pool);
    console.log("[jobs] PostgreSQL connected, baseline schema applied.");

    const employers = createPgEmployersRepository(pool);
    const candidates = createPgCandidatesRepository(pool);
    const jobs = createPgJobsRepository(pool);
    const applications = createPgApplicationsRepository(pool);
    const savedJobs = createPgSavedJobsRepository(pool);

    // Notifications: HTTP adapter if configured, otherwise noop.
    let notifications;
    if (env.NOTIFICATIONS_URL && env.NOTIFICATIONS_SEND_TOKEN) {
      const { createHttpNotificationsAdapter } = await import("./adapters/http-notifications.adapter.js");
      notifications = createHttpNotificationsAdapter({
        baseUrl: env.NOTIFICATIONS_URL,
        serviceToken: env.NOTIFICATIONS_SEND_TOKEN,
      });
      console.log("[jobs] HTTP notifications adapter configured.");
    } else {
      notifications = createNoopNotificationsAdapter();
      console.log("[jobs] Notifications: noop (NOTIFICATIONS_URL not set).");
    }

    return { employers, candidates, jobs, applications, savedJobs, notifications };
  }

  // Independent (standalone) mode: in-memory stores.
  console.log("[jobs] Running in standalone mode (in-memory stores).");
  const jobs = createInMemoryJobsStore();
  return {
    employers: createInMemoryEmployersStore(),
    candidates: createInMemoryCandidatesStore(),
    jobs,
    applications: createInMemoryApplicationsStore(),
    savedJobs: createInMemorySavedJobsStore(() => jobs._rows),
    notifications: createNoopNotificationsAdapter(),
  };
}

const adapters = await buildAdapters();
const authenticate = createStubDevBearerAuthenticateAdapter();

const app = await buildJobsApp({
  env,
  authenticate,
  ...adapters,
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
console.log(`[jobs] Listening on http://0.0.0.0:${env.PORT}`);
