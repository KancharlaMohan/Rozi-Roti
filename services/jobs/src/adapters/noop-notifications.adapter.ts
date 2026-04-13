import type { NotificationsPort } from "../ports/notifications.port.js";

/** Standalone-mode adapter: logs notification intent without sending. */
export function createNoopNotificationsAdapter(): NotificationsPort {
  return {
    async sendApplicationConfirmation(input) {
      console.log(
        `[noop-notifications] Application confirmation for ${input.candidateCoreSubjectId}: "${input.jobTitle}" at ${input.employerName}`,
      );
    },
    async sendApplicationStatusUpdate(input) {
      console.log(
        `[noop-notifications] Status update for ${input.candidateCoreSubjectId}: "${input.jobTitle}" → ${input.newStatus}`,
      );
    },
  };
}
