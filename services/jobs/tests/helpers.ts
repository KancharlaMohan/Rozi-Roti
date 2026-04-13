import type { AuthenticateRequestPort, AuthenticateRequestInput } from "@cosmox/providers";
import { buildJobsApp, type BuildJobsAppInput } from "../src/build-app.js";
import type { JobsEnv } from "../src/env.js";
import { createInMemoryEmployersStore } from "../src/adapters/in-memory/employers.store.js";
import { createInMemoryCandidatesStore } from "../src/adapters/in-memory/candidates.store.js";
import { createInMemoryJobsStore } from "../src/adapters/in-memory/jobs.store.js";
import { createInMemoryApplicationsStore } from "../src/adapters/in-memory/applications.store.js";
import { createInMemorySavedJobsStore } from "../src/adapters/in-memory/saved-jobs.store.js";
import { createNoopNotificationsAdapter } from "../src/adapters/noop-notifications.adapter.js";

const TEST_ENV: JobsEnv = {
  NODE_ENV: "test",
  PORT: 0,
  SERVICE_NAME: "jobs-test",
  SERVICE_VERSION: "0.0.0-test",
};

export const SUBJECT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const SUBJECT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

/**
 * Creates a test-configured authenticate adapter where any `Authorization: Bearer test_<uuid>`
 * header results in an `AuthenticatedPrincipal` where `subjectId === coreSubjectId === uuid`.
 */
function createTestAuthAdapter(): AuthenticateRequestPort {
  return {
    async authenticate(input: AuthenticateRequestInput) {
      const authHeader = input.source.getHeader("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer test_")) {
        return {
          ok: false as const,
          code: "missing_credentials" as const,
          message: "Missing token",
        };
      }
      const subjectId = authHeader.replace("Bearer test_", "");
      return {
        ok: true as const,
        principal: {
          subjectId,
          coreSubjectId: subjectId,
          scopes: ["self"],
        },
      };
    },
  };
}

export function authHeader(subjectId: string) {
  return { authorization: `Bearer test_${subjectId}` };
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
  };
  return buildJobsApp(deps);
}
