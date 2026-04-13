import type { EmployerRow } from "../domain/types.js";

export interface EmployersRepository {
  create(input: Omit<EmployerRow, "createdAt" | "updatedAt">): Promise<EmployerRow>;
  findBySubjectId(subjectId: string): Promise<EmployerRow | null>;
  findById(id: string): Promise<EmployerRow | null>;
}
