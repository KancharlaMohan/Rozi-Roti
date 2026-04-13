import type { AuthenticateRequestPort, AuthenticateRequestInput } from "@cosmox/providers";
import { buildJobsApp, type BuildJobsAppInput } from "../src/build-app.js";
import type { JobsEnv } from "../src/env.js";
import { createInMemoryEmployersStore } from "../src/adapters/in-memory/employers.store.js";
import { createInMemoryCandidatesStore } from "../src/adapters/in-memory/candidates.store.js";
import { createInMemoryJobsStore } from "../src/adapters/in-memory/jobs.store.js";
import { createInMemoryApplicationsStore } from "../src/adapters/in-memory/applications.store.js";
import { createInMemorySavedJobsStore } from "../src/adapters/in-memory/saved-jobs.store.js";
import { createNoopNotificationsAdapter } from "../src/adapters/noop-notifications.adapter.js";
import { createInMemoryCandidateSkillsStore } from "../src/adapters/in-memory/candidate-skills.store.js";
import { createInMemoryCandidateExperienceStore } from "../src/adapters/in-memory/candidate-experience.store.js";
import { createInMemoryCandidateEducationStore } from "../src/adapters/in-memory/candidate-education.store.js";
import { createInMemoryCandidatePreferencesStore } from "../src/adapters/in-memory/candidate-preferences.store.js";
import { createInMemoryNotificationPreferencesStore } from "../src/adapters/in-memory/notification-preferences.store.js";
import { createInMemoryJobTemplatesStore } from "../src/adapters/in-memory/job-templates.store.js";
import { createInMemoryRecentlyViewedStore } from "../src/adapters/in-memory/recently-viewed.store.js";
import { createInMemoryScreeningStore } from "../src/adapters/in-memory/screening.store.js";
import { createInMemoryCandidateSearchStore } from "../src/adapters/in-memory/candidate-search.store.js";
import { createInMemoryPrivacyStore } from "../src/adapters/in-memory/privacy.store.js";
import { createInMemoryModerationStore } from "../src/adapters/in-memory/moderation.store.js";
import { createInMemoryMessagingStore } from "../src/adapters/in-memory/messaging.store.js";
import { createInMemoryInterviewsStore } from "../src/adapters/in-memory/interviews.store.js";
import { createInMemoryAnalyticsStore } from "../src/adapters/in-memory/analytics.store.js";
import { createInMemoryAdminStore } from "../src/adapters/in-memory/admin.store.js";
import { createInMemoryReviewsStore } from "../src/adapters/in-memory/reviews.store.js";
import { createInMemoryAdsStore } from "../src/adapters/in-memory/ads.store.js";
import { createInMemorySeoStore } from "../src/adapters/in-memory/seo.store.js";
import { createInMemorySubscriptionsStore } from "../src/adapters/in-memory/subscriptions.store.js";
import { createInMemoryAgentsStore } from "../src/adapters/in-memory/agents.store.js";
import { AGENT_SEEDS } from "../src/domain/agent-seeds.js";

const TEST_ENV: JobsEnv = {
  NODE_ENV: "test",
  PORT: 0,
  SERVICE_NAME: "jobs-test",
  SERVICE_VERSION: "0.0.0-test",
};

export const SUBJECT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const SUBJECT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
export const ADMIN_SUBJECT = "cccccccc-cccc-cccc-cccc-cccccccccccc";

/**
 * Creates a test-configured authenticate adapter where any `Authorization: Bearer test_<uuid>`
 * header results in an `AuthenticatedPrincipal` where `subjectId === coreSubjectId === uuid`.
 */
function createTestAuthAdapter(): AuthenticateRequestPort {
  return {
    async authenticate(input: AuthenticateRequestInput) {
      const authHeader = input.source.getHeader("authorization");
      if (!authHeader) {
        return { ok: false as const, code: "missing_credentials" as const, message: "Missing token" };
      }
      // Admin token: Bearer admin_<uuid>
      if (authHeader.startsWith("Bearer admin_")) {
        const subjectId = authHeader.replace("Bearer admin_", "");
        return {
          ok: true as const,
          principal: { subjectId, coreSubjectId: subjectId, scopes: ["self", "admin"] },
        };
      }
      // Regular token: Bearer test_<uuid>
      if (authHeader.startsWith("Bearer test_")) {
        const subjectId = authHeader.replace("Bearer test_", "");
        return {
          ok: true as const,
          principal: { subjectId, coreSubjectId: subjectId, scopes: ["self"] },
        };
      }
      return { ok: false as const, code: "invalid_credentials" as const, message: "Invalid token" };
    },
  };
}

export function authHeader(subjectId: string) {
  return { authorization: `Bearer test_${subjectId}` };
}

export function adminAuthHeader(subjectId: string) {
  return { authorization: `Bearer admin_${subjectId}` };
}

export async function buildTestApp() {
  const jobs = createInMemoryJobsStore();
  const deps: BuildJobsAppInput = {
    env: TEST_ENV,
    authenticate: createTestAuthAdapter(),
    employers: createInMemoryEmployersStore(),
    candidates: createInMemoryCandidatesStore(),
    jobs,
    applications: createInMemoryApplicationsStore(),
    savedJobs: createInMemorySavedJobsStore(() => jobs._rows),
    notifications: createNoopNotificationsAdapter(),
    candidateSkills: createInMemoryCandidateSkillsStore(),
    candidateExperience: createInMemoryCandidateExperienceStore(),
    candidateEducation: createInMemoryCandidateEducationStore(),
    candidatePreferences: createInMemoryCandidatePreferencesStore(),
    notificationPreferences: createInMemoryNotificationPreferencesStore(),
    jobTemplates: createInMemoryJobTemplatesStore(),
    recentlyViewed: createInMemoryRecentlyViewedStore(() => jobs._rows),
    screening: createInMemoryScreeningStore(),
    candidateSearch: createInMemoryCandidateSearchStore(
      () => [],
      () => [],
      () => null,
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
  // Seed agents for tests
  await deps.agents.seedAgents(AGENT_SEEDS);
  return buildJobsApp(deps);
}
