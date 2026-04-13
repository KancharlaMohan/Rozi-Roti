import type { MessageThreadRow, MessageRow } from "../domain/types.js";

export interface MessagingRepository {
  findOrCreateThread(applicationId: string): Promise<MessageThreadRow>;
  createMessage(input: Omit<MessageRow, "readAt" | "createdAt">): Promise<MessageRow>;
  listThreadsBySubject(subjectId: string, applicationIds: string[]): Promise<MessageThreadRow[]>;
  listMessagesByThread(threadId: string): Promise<MessageRow[]>;
  markRead(messageId: string): Promise<MessageRow | null>;
}
