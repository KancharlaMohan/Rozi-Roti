import type { Pool } from "@cosmox/db";

/**
 * Jobs vertical baseline DDL.
 *
 * Identity subjects are managed by @cosmox identity_subjects.
 * Media assets are managed by @cosmox media_assets.
 * All FKs to platform tables are soft-links (no cross-DB foreign keys).
 */
export const BASELINE_DDL = `
-- Employers: organizations that post jobs
CREATE TABLE IF NOT EXISTS jobs_employers (
  id uuid PRIMARY KEY,
  subject_id uuid NOT NULL,           -- soft-link to @cosmox identity_subjects (persisted identity)
  company_name text NOT NULL,
  description text,
  website text,
  logo_asset_id uuid,                 -- soft-link to @cosmox media_assets
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_employers_subject_idx
  ON jobs_employers (subject_id);

-- Candidate profiles
CREATE TABLE IF NOT EXISTS jobs_candidate_profiles (
  id uuid PRIMARY KEY,
  subject_id uuid NOT NULL,           -- soft-link to @cosmox identity_subjects (persisted identity)
  display_name text NOT NULL,
  headline text,
  summary text,
  resume_asset_id uuid,               -- soft-link to @cosmox media_assets
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_candidate_profiles_subject_idx
  ON jobs_candidate_profiles (subject_id);

-- Job postings
CREATE TABLE IF NOT EXISTS jobs_postings (
  id uuid PRIMARY KEY,
  employer_id uuid NOT NULL,          -- FK to jobs_employers
  title text NOT NULL,
  description text,
  job_type text NOT NULL DEFAULT 'full_time'
    CHECK (job_type IN ('full_time','part_time','contract','internship','temporary','other')),
  work_mode text NOT NULL DEFAULT 'onsite'
    CHECK (work_mode IN ('onsite','hybrid','remote')),

  -- Region-agnostic location
  location_city text,
  location_region text,
  location_country text,              -- ISO 3166-1 alpha-2

  -- Region-agnostic compensation
  comp_min_amount numeric,
  comp_max_amount numeric,
  comp_currency text,                 -- ISO 4217
  comp_period text
    CHECK (comp_period IS NULL OR comp_period IN ('hourly','daily','weekly','monthly','yearly')),

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','closed','archived')),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_postings_employer_idx
  ON jobs_postings (employer_id);
CREATE INDEX IF NOT EXISTS jobs_postings_status_idx
  ON jobs_postings (status, created_at DESC);

-- Job posting media attachments
CREATE TABLE IF NOT EXISTS jobs_posting_media (
  id uuid PRIMARY KEY,
  posting_id uuid NOT NULL REFERENCES jobs_postings(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL,       -- soft-link to @cosmox media_assets
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_posting_media_posting_idx
  ON jobs_posting_media (posting_id, sort_order);

-- Applications
CREATE TABLE IF NOT EXISTS jobs_applications (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs_postings(id),
  candidate_profile_id uuid NOT NULL, -- FK to jobs_candidate_profiles
  subject_id uuid NOT NULL,           -- denormalized from candidate profile for query convenience
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewing','shortlisted','interview','offered','hired','rejected','withdrawn')),
  cover_letter text,
  resume_asset_id uuid,               -- soft-link to @cosmox media_assets (application-specific)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_applications_unique_idx
  ON jobs_applications (job_id, candidate_profile_id);
CREATE INDEX IF NOT EXISTS jobs_applications_candidate_idx
  ON jobs_applications (candidate_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_applications_job_idx
  ON jobs_applications (job_id, created_at DESC);

-- Saved/bookmarked jobs
CREATE TABLE IF NOT EXISTS jobs_saved (
  candidate_profile_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES jobs_postings(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_profile_id, job_id)
);

CREATE INDEX IF NOT EXISTS jobs_saved_candidate_idx
  ON jobs_saved (candidate_profile_id, saved_at DESC);

-- Wave 1: Candidate skills
CREATE TABLE IF NOT EXISTS jobs_candidate_skills (
  id uuid PRIMARY KEY,
  candidate_profile_id uuid NOT NULL REFERENCES jobs_candidate_profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  skill_name text NOT NULL,
  proficiency text NOT NULL CHECK (proficiency IN ('beginner','intermediate','advanced','expert')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_candidate_skills_uniq
  ON jobs_candidate_skills (candidate_profile_id, lower(skill_name));
CREATE INDEX IF NOT EXISTS jobs_candidate_skills_profile_idx
  ON jobs_candidate_skills (candidate_profile_id);

-- Wave 1: Candidate experience
CREATE TABLE IF NOT EXISTS jobs_candidate_experience (
  id uuid PRIMARY KEY,
  candidate_profile_id uuid NOT NULL REFERENCES jobs_candidate_profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  start_date text NOT NULL,
  end_date text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_candidate_experience_profile_idx
  ON jobs_candidate_experience (candidate_profile_id, start_date DESC);

-- Wave 1: Candidate education
CREATE TABLE IF NOT EXISTS jobs_candidate_education (
  id uuid PRIMARY KEY,
  candidate_profile_id uuid NOT NULL REFERENCES jobs_candidate_profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  institution text NOT NULL,
  degree text,
  field_of_study text,
  start_date text NOT NULL,
  end_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_candidate_education_profile_idx
  ON jobs_candidate_education (candidate_profile_id);

-- Wave 1: Candidate preferences
CREATE TABLE IF NOT EXISTS jobs_candidate_preferences (
  candidate_profile_id uuid PRIMARY KEY REFERENCES jobs_candidate_profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  desired_job_types text[] NOT NULL DEFAULT '{}',
  desired_work_modes text[] NOT NULL DEFAULT '{}',
  desired_locations jsonb NOT NULL DEFAULT '[]',
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  industries text[] NOT NULL DEFAULT '{}',
  availability_status text NOT NULL DEFAULT 'not_looking'
    CHECK (availability_status IN ('actively_looking','open','not_looking')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Wave 1: Notification preferences
CREATE TABLE IF NOT EXISTS jobs_notification_preferences (
  subject_id uuid NOT NULL,
  category text NOT NULL,
  channel text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, category, channel)
);

-- Wave 1: Employer enrichment
ALTER TABLE jobs_employers ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE jobs_employers ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE jobs_employers ADD COLUMN IF NOT EXISTS founded_year integer;

-- Wave 1: Job posting enrichment
ALTER TABLE jobs_postings ADD COLUMN IF NOT EXISTS required_skills text[] NOT NULL DEFAULT '{}';
ALTER TABLE jobs_postings ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE jobs_postings ADD COLUMN IF NOT EXISTS experience_level text;

-- Wave 2: Job lifecycle
ALTER TABLE jobs_postings ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Wave 2: Job templates
CREATE TABLE IF NOT EXISTS jobs_templates (
  id uuid PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES jobs_employers(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL,
  description text,
  job_type text,
  work_mode text,
  required_skills text[] NOT NULL DEFAULT '{}',
  industry text,
  experience_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_templates_employer_idx ON jobs_templates (employer_id);

-- Wave 2: Recently viewed jobs
CREATE TABLE IF NOT EXISTS jobs_recently_viewed (
  id uuid PRIMARY KEY,
  subject_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES jobs_postings(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_recently_viewed_uniq
  ON jobs_recently_viewed (subject_id, job_id);
CREATE INDEX IF NOT EXISTS jobs_recently_viewed_subject_idx
  ON jobs_recently_viewed (subject_id, viewed_at DESC);

-- Wave 2: Screening questions
CREATE TABLE IF NOT EXISTS jobs_screening_questions (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs_postings(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_screening_questions_job_idx
  ON jobs_screening_questions (job_id, sort_order);

-- Wave 2: Screening answers
CREATE TABLE IF NOT EXISTS jobs_screening_answers (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES jobs_applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES jobs_screening_questions(id),
  answer_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_screening_answers_app_idx
  ON jobs_screening_answers (application_id);

-- Wave 3: Privacy settings
CREATE TABLE IF NOT EXISTS jobs_privacy_settings (
  subject_id uuid PRIMARY KEY,
  profile_visibility text NOT NULL DEFAULT 'employers_only'
    CHECK (profile_visibility IN ('public','employers_only','hidden')),
  resume_visible boolean NOT NULL DEFAULT true,
  show_full_name boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Wave 3: Blocked employers
CREATE TABLE IF NOT EXISTS jobs_blocked_employers (
  id uuid PRIMARY KEY,
  subject_id uuid NOT NULL,
  employer_id uuid NOT NULL REFERENCES jobs_employers(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_blocked_employers_uniq
  ON jobs_blocked_employers (subject_id, employer_id);
CREATE INDEX IF NOT EXISTS jobs_blocked_employers_subject_idx
  ON jobs_blocked_employers (subject_id);

-- Wave 3: Moderation queue
CREATE TABLE IF NOT EXISTS jobs_moderation_queue (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('job_posting','employer','candidate')),
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','rejected','flagged')),
  reason text,
  submitted_by_subject_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_moderation_queue_status_idx
  ON jobs_moderation_queue (status, created_at);

-- Wave 3: Moderation actions
CREATE TABLE IF NOT EXISTS jobs_moderation_actions (
  id uuid PRIMARY KEY,
  queue_item_id uuid NOT NULL REFERENCES jobs_moderation_queue(id),
  action text NOT NULL,
  moderator_subject_id uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wave 3: Flags
CREATE TABLE IF NOT EXISTS jobs_flags (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  flag_reason text NOT NULL,
  reported_by_subject_id uuid NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_flags_entity_idx
  ON jobs_flags (entity_type, entity_id);

-- Wave 3: Employer verification
CREATE TABLE IF NOT EXISTS jobs_employer_verifications (
  id uuid PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES jobs_employers(id),
  document_asset_id uuid,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('unverified','pending','verified','rejected')),
  reviewed_by_subject_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs_employers ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';
ALTER TABLE jobs_employers ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Wave 4: Message threads
CREATE TABLE IF NOT EXISTS jobs_message_threads (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES jobs_applications(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_message_threads_app_idx
  ON jobs_message_threads (application_id);

-- Wave 4: Messages
CREATE TABLE IF NOT EXISTS jobs_messages (
  id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES jobs_message_threads(id),
  sender_subject_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_messages_thread_idx
  ON jobs_messages (thread_id, created_at);

-- Wave 4: Interviews
CREATE TABLE IF NOT EXISTS jobs_interviews (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES jobs_applications(id),
  proposed_by_subject_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  meeting_url text,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','confirmed','rescheduled','completed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_interviews_app_idx
  ON jobs_interviews (application_id);

-- Wave 4: Interview feedback
CREATE TABLE IF NOT EXISTS jobs_interview_feedback (
  id uuid PRIMARY KEY,
  interview_id uuid NOT NULL REFERENCES jobs_interviews(id),
  reviewer_subject_id uuid NOT NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wave 5: Analytics events
CREATE TABLE IF NOT EXISTS jobs_analytics_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  subject_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_analytics_events_entity_idx
  ON jobs_analytics_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_analytics_events_type_idx
  ON jobs_analytics_events (event_type, created_at DESC);

-- Wave 5: Admin actions
CREATE TABLE IF NOT EXISTS jobs_admin_actions (
  id uuid PRIMARY KEY,
  admin_subject_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_admin_actions_entity_idx
  ON jobs_admin_actions (entity_type, entity_id);

-- Wave 5: Company reviews
CREATE TABLE IF NOT EXISTS jobs_company_reviews (
  id uuid PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES jobs_employers(id),
  reviewer_subject_id uuid NOT NULL,
  overall_rating integer NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  title text,
  pros text,
  cons text,
  status text NOT NULL DEFAULT 'pending_review',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_company_reviews_uniq
  ON jobs_company_reviews (employer_id, reviewer_subject_id);
CREATE INDEX IF NOT EXISTS jobs_company_reviews_employer_idx
  ON jobs_company_reviews (employer_id, created_at DESC);

-- Wave 6: Ad placements
CREATE TABLE IF NOT EXISTS jobs_ad_placements (
  id uuid PRIMARY KEY,
  placement_type text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wave 6: Ad campaigns
CREATE TABLE IF NOT EXISTS jobs_ad_campaigns (
  id uuid PRIMARY KEY,
  advertiser_subject_id uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed')),
  budget numeric,
  currency text,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_ad_campaigns_advertiser_idx
  ON jobs_ad_campaigns (advertiser_subject_id);

-- Wave 6: Ad creatives
CREATE TABLE IF NOT EXISTS jobs_ad_creatives (
  id uuid PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES jobs_ad_campaigns(id) ON DELETE CASCADE,
  placement_id uuid NOT NULL REFERENCES jobs_ad_placements(id),
  title text NOT NULL,
  body text,
  media_asset_id uuid,
  target_url text,
  impression_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_ad_creatives_campaign_idx
  ON jobs_ad_creatives (campaign_id);

-- Wave 6: Featured employers
CREATE TABLE IF NOT EXISTS jobs_featured_employers (
  id uuid PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES jobs_employers(id),
  campaign_id uuid REFERENCES jobs_ad_campaigns(id),
  priority integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_featured_employers_active_idx
  ON jobs_featured_employers (expires_at, priority DESC);

-- Wave 6: Sponsored jobs flag
ALTER TABLE jobs_postings ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;
`;

export async function applyBaselineSchema(pool: Pool): Promise<void> {
  await pool.query(BASELINE_DDL);
}
