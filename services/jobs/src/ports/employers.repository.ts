import type { EmployerRow } from "../domain/types.js";

export interface EmployersRepository {
  create(input: Omit<EmployerRow, "createdAt" | "updatedAt">): Promise<EmployerRow>;
  update(id: string, input: Partial<Omit<EmployerRow, "id" | "subjectId" | "createdAt" | "updatedAt">>): Promise<EmployerRow | null>;
  findBySubjectId(subjectId: string): Promise<EmployerRow | null>;
  findById(id: string): Promise<EmployerRow | null>;
}
