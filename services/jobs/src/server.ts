import { createStubDevBearerAuthenticateAdapter } from "@cosmox/providers";
import { buildJobsApp } from "./build-app.js";
import { loadJobsEnv } from "./env.js";
import { createInMemoryEmployersStore } from "./adapters/in-memory/employers.store.js";
import { createInMemoryCandidatesStore } from "./adapters/in-memory/candidates.store.js";
import { createInMemoryJobsStore } from "./adapters/in-memory/jobs.store.js";
import { createInMemoryApplicationsStore } from "./adapters/in-memory/applications.store.js";
import { createInMemorySavedJobsStore } from "./adapters/in-memory/saved-jobs.store.js";
import { createNoopNotificationsAdapter } from "./adapters/noop-notifications.adapter.js";

const env = loadJobsEnv();

// ---------------------------------------------------------------------------
// Adapters: in-memory for standalone / dev mode
// When JOBS_DATABASE_URL is set, swap to PG adapters.
// ---------------------------------------------------------------------------

const employers = createInMemoryEmployersStore();
const candidates = createInMemoryCandidatesStore();
const jobs = createInMemoryJobsStore();
const applications = createInMemoryApplicationsStore();

// The saved-jobs in-memory adapter needs read access to the jobs store to join data.
const savedJobs = createInMemorySavedJobsStore(() => jobs._rows);

const notifications = createNoopNotificationsAdapter();
const authenticate = createStubDevBearerAuthenticateAdapter();

const app = await buildJobsApp({
  env,
  authenticate,
  employers,
  candidates,
  jobs,
  applications,
  savedJobs,
  notifications,
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
console.log(`[jobs] Listening on http://0.0.0.0:${env.PORT}`);
