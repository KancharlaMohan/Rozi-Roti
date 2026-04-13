import { createStubDevBearerAuthenticateAdapter } from "@cosmox/providers";
import { buildJobsApp, type BuildJobsAppInput } from "./build-app.js";
import { loadJobsEnv } from "./env.js";
import { createInMemoryEmployersStore } from "./adapters/in-memory/employers.store.js";
import { createInMemoryCandidatesStore } from "./adapters/in-memory/candidates.store.js";
import { createInMemoryJobsStore } from "./adapters/in-memory/jobs.store.js";
import { createInMemoryApplicationsStore } from "./adapters/in-memory/applications.store.js";
import { createInMemorySavedJobsStore } from "./adapters/in-memory/saved-jobs.store.js";
import { createNoopNotificationsAdapter } from "./adapters/noop-notifications.adapter.js";
import { createInMemoryCandidateSkillsStore } from "./adapters/in-memory/candidate-skills.store.js";
import { createInMemoryCandidateExperienceStore } from "./adapters/in-memory/candidate-experience.store.js";
import { createInMemoryCandidateEducationStore } from "./adapters/in-memory/candidate-education.store.js";
import { createInMemoryCandidatePreferencesStore } from "./adapters/in-memory/candidate-preferences.store.js";
import { createInMemoryNotificationPreferencesStore } from "./adapters/in-memory/notification-preferences.store.js";
import { createInMemoryJobTemplatesStore } from "./adapters/in-memory/job-templates.store.js";
import { createInMemoryRecentlyViewedStore } from "./adapters/in-memory/recently-viewed.store.js";
import { createInMemoryScreeningStore } from "./adapters/in-memory/screening.store.js";
import { createInMemoryCandidateSearchStore } from "./adapters/in-memory/candidate-search.store.js";
import { createInMemoryPrivacyStore } from "./adapters/in-memory/privacy.store.js";
import { createInMemoryModerationStore } from "./adapters/in-memory/moderation.store.js";
import { createInMemoryMessagingStore } from "./adapters/in-memory/messaging.store.js";
import { createInMemoryInterviewsStore } from "./adapters/in-memory/interviews.store.js";
import { createInMemoryAnalyticsStore } from "./adapters/in-memory/analytics.store.js";
import { createInMemoryAdminStore } from "./adapters/in-memory/admin.store.js";
import { createInMemoryReviewsStore } from "./adapters/in-memory/reviews.store.js";
import { createInMemoryAdsStore } from "./adapters/in-memory/ads.store.js";
import { createInMemorySeoStore } from "./adapters/in-memory/seo.store.js";
import { createInMemorySubscriptionsStore } from "./adapters/in-memory/subscriptions.store.js";
import { createInMemoryAgentsStore } from "./adapters/in-memory/agents.store.js";
import { AGENT_SEEDS } from "./domain/agent-seeds.js";

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

    const candidateSkills = createInMemoryCandidateSkillsStore();
    const candidatePreferences = createInMemoryCandidatePreferencesStore();
    return {
      employers, candidates, jobs, applications, savedJobs, notifications,
      candidateSkills,
      candidateExperience: createInMemoryCandidateExperienceStore(),
      candidateEducation: createInMemoryCandidateEducationStore(),
      candidatePreferences,
      notificationPreferences: createInMemoryNotificationPreferencesStore(),
      jobTemplates: createInMemoryJobTemplatesStore(),
      recentlyViewed: createInMemoryRecentlyViewedStore(() => new Map()), // PG mode — not used in-process
      screening: createInMemoryScreeningStore(),
      candidateSearch: createInMemoryCandidateSearchStore(
        () => [], () => [], () => null, // PG mode handles joins in SQL
      ),
      privacy: createInMemoryPrivacyStore(),
      moderation: createInMemoryModerationStore(),
      messaging: createInMemoryMessagingStore(),
      interviews: createInMemoryInterviewsStore(),
      analytics: createInMemoryAnalyticsStore(),
      admin: createInMemoryAdminStore({ findBySubjectId: async () => null, findById: async () => null, create: async (i: any) => i, update: async () => null } as any, jobs),
      reviews: createInMemoryReviewsStore(),
      ads: createInMemoryAdsStore(),
      seo: createInMemorySeoStore(),
      subscriptions: createInMemorySubscriptionsStore(),
      agents: createInMemoryAgentsStore(),
    };
  }

  // Independent (standalone) mode: in-memory stores.
  console.log("[jobs] Running in standalone mode (in-memory stores).");
  const jobs = createInMemoryJobsStore();
  const candidateSkillsStore = createInMemoryCandidateSkillsStore();
  const candidatePrefsStore = createInMemoryCandidatePreferencesStore();
  const candidatesStore = createInMemoryCandidatesStore();
  return {
    employers: createInMemoryEmployersStore(),
    candidates: candidatesStore,
    jobs,
    applications: createInMemoryApplicationsStore(),
    savedJobs: createInMemorySavedJobsStore(() => jobs._rows),
    notifications: createNoopNotificationsAdapter(),
    candidateSkills: candidateSkillsStore,
    candidateExperience: createInMemoryCandidateExperienceStore(),
    candidateEducation: createInMemoryCandidateEducationStore(),
    candidatePreferences: candidatePrefsStore,
    notificationPreferences: createInMemoryNotificationPreferencesStore(),
    jobTemplates: createInMemoryJobTemplatesStore(),
    recentlyViewed: createInMemoryRecentlyViewedStore(() => jobs._rows),
    screening: createInMemoryScreeningStore(),
    candidateSearch: createInMemoryCandidateSearchStore(
      () => [...(candidatesStore as any)._getAll?.() ?? []],
      (profileId: string) => [],
      (profileId: string) => null,
    ),
    privacy: createInMemoryPrivacyStore(),
    moderation: createInMemoryModerationStore(),
    messaging: createInMemoryMessagingStore(),
    interviews: createInMemoryInterviewsStore(),
    analytics: createInMemoryAnalyticsStore(),
    admin: createInMemoryAdminStore(createInMemoryEmployersStore(), jobs),
    reviews: createInMemoryReviewsStore(),
    ads: createInMemoryAdsStore(),
    seo: createInMemorySeoStore(),
    subscriptions: createInMemorySubscriptionsStore(),
    agents: createInMemoryAgentsStore(),
  };
}

const adapters = await buildAdapters();

// Seed AI agents on startup — idempotent, only inserts if not already present
await adapters.agents.seedAgents(AGENT_SEEDS);
console.log(`[jobs] Seeded ${AGENT_SEEDS.length} AI agents.`);

const authenticate = createStubDevBearerAuthenticateAdapter();

const app = await buildJobsApp({
  env,
  authenticate,
  ...adapters,
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
console.log(`[jobs] Listening on http://0.0.0.0:${env.PORT}`);
