import { randomUUID } from "crypto";
import type { MessageThreadRow, MessageRow } from "../../domain/types.js";
import type { MessagingRepository } from "../../ports/messaging.repository.js";

export function createInMemoryMessagingStore(): MessagingRepository {
  const threads = new Map<string, MessageThreadRow>();
  const threadsByApp = new Map<string, string>(); // applicationId → threadId
  const messages = new Map<string, MessageRow>();

  return {
    async findOrCreateThread(applicationId) {
      const existingId = threadsByApp.get(applicationId);
      if (existingId) return threads.get(existingId)!;
      const thread: MessageThreadRow = { id: randomUUID(), applicationId, createdAt: new Date().toISOString() };
      threads.set(thread.id, thread);
      threadsByApp.set(applicationId, thread.id);
      return thread;
    },
    async createMessage(input) {
      const msg: MessageRow = { ...input, readAt: null, createdAt: new Date().toISOString() };
      messages.set(msg.id, msg);
      return msg;
    },
    async listThreadsBySubject(_subjectId, applicationIds) {
      return [...threads.values()].filter((t) => applicationIds.includes(t.applicationId));
    },
    async listMessagesByThread(threadId) {
      return [...messages.values()]
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    async markRead(messageId) {
      const msg = messages.get(messageId);
      if (!msg) return null;
      const updated = { ...msg, readAt: new Date().toISOString() };
      messages.set(messageId, updated);
      return updated;
    },
  };
}
