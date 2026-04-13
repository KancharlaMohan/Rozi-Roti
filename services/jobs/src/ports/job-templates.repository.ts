import type { JobTemplateRow } from "../domain/types.js";

export interface JobTemplatesRepository {
  create(input: Omit<JobTemplateRow, "createdAt" | "updatedAt">): Promise<JobTemplateRow>;
  findById(id: string): Promise<JobTemplateRow | null>;
  listByEmployer(employerId: string): Promise<JobTemplateRow[]>;
  remove(id: string, employerId: string): Promise<boolean>;
}
