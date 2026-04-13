import type { CompanyReviewRow } from "../domain/types.js";

export interface ReviewsRepository {
  create(input: Omit<CompanyReviewRow, "createdAt">): Promise<CompanyReviewRow>;
  listByEmployer(employerId: string, limit: number, offset: number): Promise<{ rows: CompanyReviewRow[]; total: number; averageRating: number }>;
}
