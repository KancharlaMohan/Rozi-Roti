import type { AdminActionRow, EmployerRow, JobRow } from "../domain/types.js";

export interface AdminRepository {
  createAction(input: Omit<AdminActionRow, "createdAt">): Promise<AdminActionRow>;
  listActions(limit: number, offset: number): Promise<{ rows: AdminActionRow[]; total: number }>;
  listAllEmployers(limit: number, offset: number): Promise<{ rows: EmployerRow[]; total: number }>;
  listAllJobs(limit: number, offset: number): Promise<{ rows: JobRow[]; total: number }>;
}
