import type { ScreeningQuestionRow, ScreeningAnswerRow } from "../../domain/types.js";
import type { ScreeningRepository } from "../../ports/screening.repository.js";

export function createInMemoryScreeningStore(): ScreeningRepository {
  const questions = new Map<string, ScreeningQuestionRow>();
  const answers = new Map<string, ScreeningAnswerRow>();

  return {
    async createQuestions(inputs) {
      const now = new Date().toISOString();
      return inputs.map((input) => {
        const row: ScreeningQuestionRow = { ...input, createdAt: now };
        questions.set(row.id, row);
        return row;
      });
    },
    async listQuestionsByJob(jobId) {
      return [...questions.values()]
        .filter((q) => q.jobId === jobId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async createAnswers(inputs) {
      const now = new Date().toISOString();
      return inputs.map((input) => {
        const row: ScreeningAnswerRow = { ...input, createdAt: now };
        answers.set(row.id, row);
        return row;
      });
    },
    async listAnswersByApplication(applicationId) {
      return [...answers.values()].filter((a) => a.applicationId === applicationId);
    },
  };
}
