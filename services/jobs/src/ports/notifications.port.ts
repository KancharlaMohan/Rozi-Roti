/**
 * Integration port for notification delivery.
 * Standalone mode: noop adapter. CosmoX mode: HTTP adapter calling the notifications service.
 */
export interface NotificationsPort {
  sendApplicationConfirmation(input: {
    candidateCoreSubjectId: string;
    jobTitle: string;
    employerName: string;
  }): Promise<void>;

  sendApplicationStatusUpdate(input: {
    candidateCoreSubjectId: string;
    jobTitle: string;
    newStatus: string;
  }): Promise<void>;
}
