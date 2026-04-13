import type { ScreeningQuestionRow, ScreeningAnswerRow } from "../domain/types.js";

export interface ScreeningRepository {
  createQuestions(questions: Omit<ScreeningQuestionRow, "createdAt">[]): Promise<ScreeningQuestionRow[]>;
  listQuestionsByJob(jobId: string): Promise<ScreeningQuestionRow[]>;
  createAnswers(answers: Omit<ScreeningAnswerRow, "createdAt">[]): Promise<ScreeningAnswerRow[]>;
  listAnswersByApplication(applicationId: string): Promise<ScreeningAnswerRow[]>;
}
