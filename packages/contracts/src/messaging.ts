import { z } from "zod";

export const MessageThreadPublicSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type MessageThreadPublic = z.infer<typeof MessageThreadPublicSchema>;

export const MessagePublicSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  senderCoreSubjectId: z.string().uuid(),
  content: z.string(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type MessagePublic = z.infer<typeof MessagePublicSchema>;

export const SendMessageRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    applicationId: z.string().uuid(),
    content: z.string().min(1).max(5000),
  })
  .strict();
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const ListMessageThreadsResponseSchema = z.object({
  threads: z.array(MessageThreadPublicSchema),
});
export type ListMessageThreadsResponse = z.infer<typeof ListMessageThreadsResponseSchema>;

export const ListMessagesResponseSchema = z.object({
  messages: z.array(MessagePublicSchema),
});
export type ListMessagesResponse = z.infer<typeof ListMessagesResponseSchema>;
