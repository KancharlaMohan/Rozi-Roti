import type { JobRow } from "../domain/types.js";

export type ListJobsFilter = {
  limit: number;
  offset: number;
  jobType?: string;
  workMode?: string;
  country?: string;
  search?: string;
};

export type ListByEmployerFilter = {
  employerId: string;
  limit: number;
  offset: number;
};

export interface JobsRepository {
  create(input: Omit<JobRow, "createdAt" | "updatedAt">): Promise<JobRow>;
  update(id: string, input: Partial<Omit<JobRow, "id" | "createdAt" | "updatedAt">>): Promise<JobRow | null>;
  findById(id: string): Promise<JobRow | null>;
  listPublished(filter: ListJobsFilter): Promise<{ rows: JobRow[]; total: number }>;
  listByEmployer(filter: ListByEmployerFilter): Promise<{ rows: JobRow[]; total: number }>;
}
