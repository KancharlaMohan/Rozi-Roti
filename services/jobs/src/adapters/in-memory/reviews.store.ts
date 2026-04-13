import type { CompanyReviewRow } from "../../domain/types.js";
import type { ReviewsRepository } from "../../ports/reviews.repository.js";

export function createInMemoryReviewsStore(): ReviewsRepository {
  const reviews = new Map<string, CompanyReviewRow>();

  return {
    async create(input) {
      const row: CompanyReviewRow = { ...input, createdAt: new Date().toISOString() };
      reviews.set(row.id, row);
      return row;
    },
    async listByEmployer(employerId, limit, offset) {
      const filtered = [...reviews.values()]
        .filter((r) => r.employerId === employerId && r.status === "approved")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = filtered.length;
      const paged = filtered.slice(offset, offset + limit);
      const avgRating = total > 0
        ? filtered.reduce((sum, r) => sum + r.overallRating, 0) / total
        : 0;
      return { rows: paged, total, averageRating: Math.round(avgRating * 10) / 10 };
    },
  };
}
