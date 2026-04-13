/** Internal row types for the Jobs domain. These are storage-level shapes, not API contracts. */

export type EmployerRow = {
  id: string;
  subjectId: string;
  companyName: string;
  description: string | null;
  website: string | null;
  logoAssetId: string | null;
  companySize: string | null;
  industry: string | null;
  foundedYear: number | null;
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
  requiredSkills: string[];
  industry: string | null;
  experienceLevel: string | null;
  expiresAt: string | null;
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

export type CandidateSkillRow = {
  id: string;
  candidateProfileId: string;
  subjectId: string;
  skillName: string;
  proficiency: string;
  createdAt: string;
};

export type CandidateExperienceRow = {
  id: string;
  candidateProfileId: string;
  subjectId: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateEducationRow = {
  id: string;
  candidateProfileId: string;
  subjectId: string;
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidatePreferencesRow = {
  candidateProfileId: string;
  subjectId: string;
  desiredJobTypes: string[];
  desiredWorkModes: string[];
  desiredLocations: unknown[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  industries: string[];
  availabilityStatus: string;
  updatedAt: string;
};

export type NotificationPreferenceRow = {
  subjectId: string;
  category: string;
  channel: string;
  enabled: boolean;
  updatedAt: string;
};

export type JobTemplateRow = {
  id: string;
  employerId: string;
  name: string;
  title: string;
  description: string | null;
  jobType: string | null;
  workMode: string | null;
  requiredSkills: string[];
  industry: string | null;
  experienceLevel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecentlyViewedRow = {
  id: string;
  subjectId: string;
  jobId: string;
  viewedAt: string;
};

export type ScreeningQuestionRow = {
  id: string;
  jobId: string;
  questionText: string;
  required: boolean;
  sortOrder: number;
  createdAt: string;
};

export type ScreeningAnswerRow = {
  id: string;
  applicationId: string;
  questionId: string;
  answerText: string;
  createdAt: string;
};

export type PrivacySettingsRow = {
  subjectId: string;
  profileVisibility: string;
  resumeVisible: boolean;
  showFullName: boolean;
  updatedAt: string;
};

export type BlockedEmployerRow = {
  id: string;
  subjectId: string;
  employerId: string;
  createdAt: string;
};

export type ModerationQueueItemRow = {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  reason: string | null;
  submittedBySubjectId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModerationActionRow = {
  id: string;
  queueItemId: string;
  action: string;
  moderatorSubjectId: string;
  notes: string | null;
  createdAt: string;
};

export type FlagRow = {
  id: string;
  entityType: string;
  entityId: string;
  flagReason: string;
  reportedBySubjectId: string;
  description: string | null;
  createdAt: string;
};

export type EmployerVerificationRow = {
  id: string;
  employerId: string;
  documentAssetId: string | null;
  status: string;
  reviewedBySubjectId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageThreadRow = {
  id: string;
  applicationId: string;
  createdAt: string;
};

export type MessageRow = {
  id: string;
  threadId: string;
  senderSubjectId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
};

export type InterviewRow = {
  id: string;
  applicationId: string;
  proposedBySubjectId: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InterviewFeedbackRow = {
  id: string;
  interviewId: string;
  reviewerSubjectId: string;
  rating: number | null;
  notes: string | null;
  createdAt: string;
};

export type AnalyticsEventRow = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  subjectId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminActionRow = {
  id: string;
  adminSubjectId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CompanyReviewRow = {
  id: string;
  employerId: string;
  reviewerSubjectId: string;
  overallRating: number;
  title: string | null;
  pros: string | null;
  cons: string | null;
  status: string;
  createdAt: string;
};

export type AdPlacementRow = {
  id: string;
  placementType: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type AdCampaignRow = {
  id: string;
  advertiserSubjectId: string;
  name: string;
  status: string;
  budget: number | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdCreativeRow = {
  id: string;
  campaignId: string;
  placementId: string;
  title: string;
  body: string | null;
  mediaAssetId: string | null;
  targetUrl: string | null;
  impressionCount: number;
  clickCount: number;
  createdAt: string;
};

export type SeoMetadataRow = {
  id: string;
  entityType: string;
  entityId: string;
  slug: string;
  metaTitle: string;
  metaDescription: string | null;
  ogImageAssetId: string | null;
  structuredData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};
