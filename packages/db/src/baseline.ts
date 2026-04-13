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
`;

export async function applyBaselineSchema(pool: Pool): Promise<void> {
  await pool.query(BASELINE_DDL);
}
