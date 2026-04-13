import { randomUUID } from "crypto";
import type { ApplicationRow, CandidateProfileRow, EmployerRow, JobRow } from "./types.js";
import type { EmployersRepository } from "../ports/employers.repository.js";
import type { CandidatesRepository } from "../ports/candidates.repository.js";
import type { JobsRepository } from "../ports/jobs.repository.js";
import type { ApplicationsRepository } from "../ports/applications.repository.js";
import type { SavedJobsRepository } from "../ports/saved-jobs.repository.js";
import type { NotificationsPort } from "../ports/notifications.port.js";

export type JobsServiceDeps = {
  employers: EmployersRepository;
  candidates: CandidatesRepository;
  jobs: JobsRepository;
  applications: ApplicationsRepository;
  savedJobs: SavedJobsRepository;
  notifications: NotificationsPort;
};

export class JobsService {
  constructor(private readonly deps: JobsServiceDeps) {}

  /* ----- Employers ----- */

  async registerEmployer(input: {
    subjectId: string;
    companyName: string;
    description?: string;
    website?: string;
    logoAssetId?: string;
  }): Promise<EmployerRow> {
    const existing = await this.deps.employers.findBySubjectId(input.subjectId);
    if (existing) {
      throw Object.assign(new Error("Employer already registered for this subject."), {
        code: "employer_already_exists",
      });
    }
    return this.deps.employers.create({
      id: randomUUID(),
      subjectId: input.subjectId,
      companyName: input.companyName,
      description: input.description ?? null,
      website: input.website ?? null,
      logoAssetId: input.logoAssetId ?? null,
    });
  }

  async getEmployerBySubject(subjectId: string): Promise<EmployerRow | null> {
    return this.deps.employers.findBySubjectId(subjectId);
  }

  /* ----- Candidate profiles ----- */

  async upsertCandidateProfile(input: {
    subjectId: string;
    displayName: string;
    headline?: string;
    summary?: string;
    resumeAssetId?: string;
  }): Promise<CandidateProfileRow> {
    return this.deps.candidates.upsert({
      id: randomUUID(),
      subjectId: input.subjectId,
      displayName: input.displayName,
      headline: input.headline ?? null,
      summary: input.summary ?? null,
      resumeAssetId: input.resumeAssetId ?? null,
    });
  }

  async getCandidateProfileBySubject(subjectId: string): Promise<CandidateProfileRow | null> {
    return this.deps.candidates.findBySubjectId(subjectId);
  }

  /* ----- Jobs ----- */

  async createJob(input: {
    employerId: string;
    title: string;
    description?: string;
    jobType: string;
    workMode: string;
    location?: { city?: string; region?: string; country?: string };
    compensation?: { minAmount?: number; maxAmount?: number; currency: string; period: string };
    tags?: string[];
    mediaAssetIds?: string[];
  }): Promise<JobRow> {
    return this.deps.jobs.create({
      id: randomUUID(),
      employerId: input.employerId,
      title: input.title,
      description: input.description ?? null,
      jobType: input.jobType,
      workMode: input.workMode,
      locationCity: input.location?.city ?? null,
      locationRegion: input.location?.region ?? null,
      locationCountry: input.location?.country ?? null,
      compMinAmount: input.compensation?.minAmount ?? null,
      compMaxAmount: input.compensation?.maxAmount ?? null,
      compCurrency: input.compensation?.currency ?? null,
      compPeriod: input.compensation?.period ?? null,
      status: "draft",
      tags: input.tags ?? [],
      mediaAssetIds: input.mediaAssetIds ?? [],
    });
  }

  async updateJob(
    jobId: string,
    employerId: string,
    input: Partial<{
      title: string;
      description: string;
      jobType: string;
      workMode: string;
      location: { city?: string; region?: string; country?: string };
      compensation: { minAmount?: number; maxAmount?: number; currency: string; period: string };
      status: string;
      tags: string[];
      mediaAssetIds: string[];
    }>,
  ): Promise<JobRow> {
    const job = await this.deps.jobs.findById(jobId);
    if (!job) throw Object.assign(new Error("Job not found."), { code: "not_found" });
    if (job.employerId !== employerId) {
      throw Object.assign(new Error("Not authorized to update this job."), { code: "forbidden" });
    }

    const patch: Partial<JobRow> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.jobType !== undefined) patch.jobType = input.jobType;
    if (input.workMode !== undefined) patch.workMode = input.workMode;
    if (input.status !== undefined) patch.status = input.status;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.mediaAssetIds !== undefined) patch.mediaAssetIds = input.mediaAssetIds;
    if (input.location !== undefined) {
      patch.locationCity = input.location.city ?? null;
      patch.locationRegion = input.location.region ?? null;
      patch.locationCountry = input.location.country ?? null;
    }
    if (input.compensation !== undefined) {
      patch.compMinAmount = input.compensation.minAmount ?? null;
      patch.compMaxAmount = input.compensation.maxAmount ?? null;
      patch.compCurrency = input.compensation.currency ?? null;
      patch.compPeriod = input.compensation.period ?? null;
    }

    const updated = await this.deps.jobs.update(jobId, patch);
    if (!updated) throw Object.assign(new Error("Job not found."), { code: "not_found" });
    return updated;
  }

  /* ----- Applications ----- */

  async applyForJob(input: {
    subjectId: string;
    jobId: string;
    coverLetter?: string;
    resumeAssetId?: string;
  }): Promise<ApplicationRow> {
    const job = await this.deps.jobs.findById(input.jobId);
    if (!job) throw Object.assign(new Error("Job not found."), { code: "not_found" });
    if (job.status !== "published") {
      throw Object.assign(new Error("Job is not accepting applications."), { code: "job_not_published" });
    }

    const profile = await this.deps.candidates.findBySubjectId(input.subjectId);
    if (!profile) {
      throw Object.assign(new Error("Candidate profile required before applying."), { code: "profile_required" });
    }

    const existing = await this.deps.applications.findByJobAndCandidate(input.jobId, profile.id);
    if (existing) {
      throw Object.assign(new Error("Already applied to this job."), { code: "duplicate_application" });
    }

    const application = await this.deps.applications.create({
      id: randomUUID(),
      jobId: input.jobId,
      candidateProfileId: profile.id,
      subjectId: input.subjectId,
      status: "submitted",
      coverLetter: input.coverLetter ?? null,
      resumeAssetId: input.resumeAssetId ?? null,
    });

    // Fire-and-forget notification — do not fail the application if notification fails
    const employer = await this.deps.employers.findById(job.employerId);
    this.deps.notifications
      .sendApplicationConfirmation({
        candidateCoreSubjectId: input.subjectId,
        jobTitle: job.title,
        employerName: employer?.companyName ?? "Unknown",
      })
      .catch((err) => console.error("[jobs-service] Notification failed:", err));

    return application;
  }

  async updateApplicationStatus(input: {
    applicationId: string;
    employerSubjectId: string;
    status: string;
  }): Promise<ApplicationRow> {
    const app = await this.deps.applications.findById(input.applicationId);
    if (!app) throw Object.assign(new Error("Application not found."), { code: "not_found" });

    const job = await this.deps.jobs.findById(app.jobId);
    if (!job) throw Object.assign(new Error("Job not found."), { code: "not_found" });

    const employer = await this.deps.employers.findById(job.employerId);
    if (!employer || employer.subjectId !== input.employerSubjectId) {
      throw Object.assign(new Error("Not authorized."), { code: "forbidden" });
    }

    const updated = await this.deps.applications.updateStatus(input.applicationId, input.status);
    if (!updated) throw Object.assign(new Error("Application not found."), { code: "not_found" });

    // Fire-and-forget notification
    this.deps.notifications
      .sendApplicationStatusUpdate({
        candidateCoreSubjectId: app.subjectId,
        jobTitle: job.title,
        newStatus: input.status,
      })
      .catch((err) => console.error("[jobs-service] Notification failed:", err));

    return updated;
  }

  /* ----- Saved jobs ----- */

  async saveJob(subjectId: string, jobId: string): Promise<void> {
    const job = await this.deps.jobs.findById(jobId);
    if (!job) throw Object.assign(new Error("Job not found."), { code: "not_found" });

    const profile = await this.deps.candidates.findBySubjectId(subjectId);
    if (!profile) {
      throw Object.assign(new Error("Candidate profile required."), { code: "profile_required" });
    }

    await this.deps.savedJobs.save(profile.id, jobId);
  }

  async unsaveJob(subjectId: string, jobId: string): Promise<void> {
    const profile = await this.deps.candidates.findBySubjectId(subjectId);
    if (!profile) return;
    await this.deps.savedJobs.unsave(profile.id, jobId);
  }
}
