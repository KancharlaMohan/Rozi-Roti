import type { InterviewRow, InterviewFeedbackRow } from "../domain/types.js";

export interface InterviewsRepository {
  create(input: Omit<InterviewRow, "createdAt" | "updatedAt">): Promise<InterviewRow>;
  findById(id: string): Promise<InterviewRow | null>;
  update(id: string, input: Partial<Omit<InterviewRow, "id" | "applicationId" | "proposedBySubjectId" | "createdAt" | "updatedAt">>): Promise<InterviewRow | null>;
  listByApplication(applicationId: string): Promise<InterviewRow[]>;
  addFeedback(input: Omit<InterviewFeedbackRow, "createdAt">): Promise<InterviewFeedbackRow>;
}
