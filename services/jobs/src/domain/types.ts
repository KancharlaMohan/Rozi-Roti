/** Internal row types for the Jobs domain. These are storage-level shapes, not API contracts. */

export type EmployerRow = {
  id: string;
  subjectId: string;
  companyName: string;
  description: string | null;
  website: string | null;
  logoAssetId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateProfileRow = {
  id: string;
  subjectId: string;
  displayName: string;
  headline: string | null;
  summary: string | null;
  resumeAssetId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobRow = {
  id: string;
  employerId: string;
  title: string;
  description: string | null;
  jobType: string;
  workMode: string;
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  compMinAmount: number | null;
  compMaxAmount: number | null;
  compCurrency: string | null;
  compPeriod: string | null;
  status: string;
  tags: string[];
  mediaAssetIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ApplicationRow = {
  id: string;
  jobId: string;
  candidateProfileId: string;
  subjectId: string;
  status: string;
  coverLetter: string | null;
  resumeAssetId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedJobRow = {
  candidateProfileId: string;
  jobId: string;
  savedAt: string;
};
