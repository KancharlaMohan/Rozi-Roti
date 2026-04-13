import {
  internalJsonFetch,
  type InternalJsonClientConfig,
} from "@cosmox/internal-client";
import { SendNotificationResponseSchema } from "@jobs/contracts";
import type { NotificationsPort } from "../ports/notifications.port.js";

/**
 * CosmoX-integrated notifications adapter.
 * Sends notifications via the platform notifications service using a trusted service token.
 */
export function createHttpNotificationsAdapter(cfg: {
  baseUrl: string;
  serviceToken: string;
}): NotificationsPort {
  const client: InternalJsonClientConfig = {
    baseUrl: cfg.baseUrl,
    defaultTimeoutMs: 5_000,
  };

  return {
    async sendApplicationConfirmation(input) {
      await internalJsonFetch(client, {
        method: "POST",
        path: "/v1/notifications/internal/send",
        body: {
          coreSubjectId: input.candidateCoreSubjectId,
          channelCode: "email",
          templateCode: "jobs_application_confirmation",
          languageCode: "en",
          categoryCode: "transactional",
          recipient: input.candidateCoreSubjectId,
          payload: {
            jobTitle: input.jobTitle,
            employerName: input.employerName,
          },
        },
        schema: SendNotificationResponseSchema,
        ctx: { authorization: `Bearer ${cfg.serviceToken}` },
      });
    },

    async sendApplicationStatusUpdate(input) {
      await internalJsonFetch(client, {
        method: "POST",
        path: "/v1/notifications/internal/send",
        body: {
          coreSubjectId: input.candidateCoreSubjectId,
          channelCode: "email",
          templateCode: "jobs_application_status_update",
          languageCode: "en",
          categoryCode: "transactional",
          recipient: input.candidateCoreSubjectId,
          payload: {
            jobTitle: input.jobTitle,
            newStatus: input.newStatus,
          },
        },
        schema: SendNotificationResponseSchema,
        ctx: { authorization: `Bearer ${cfg.serviceToken}` },
      });
    },
  };
}
