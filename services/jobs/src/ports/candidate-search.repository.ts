import type { CandidateSearchResult } from "@jobs/contracts";

export type CandidateSearchFilter = {
  skills?: string[];
  country?: string;
  availability?: string;
  limit: number;
  offset: number;
};

export interface CandidateSearchRepository {
  search(filter: CandidateSearchFilter): Promise<{ rows: CandidateSearchResult[]; total: number }>;
}
