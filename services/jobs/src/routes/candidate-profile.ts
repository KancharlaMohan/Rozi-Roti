import {
  AddCandidateSkillRequestSchema,
  CandidateSkillPublicSchema,
  ListCandidateSkillsResponseSchema,
  UpsertExperienceRequestSchema,
  ExperienceEntryPublicSchema,
  ListExperienceResponseSchema,
  UpsertEducationRequestSchema,
  EducationEntryPublicSchema,
  ListEducationResponseSchema,
  UpsertCandidatePreferencesRequestSchema,
  CandidatePreferencesPublicSchema,
} from "@jobs/contracts";
import {
  assertSubjectMatchesPrincipal,
  UnauthorizedSubjectMismatchError,
} from "@cosmox/http-auth";
import { randomUUID } from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply } from "./_shared.js";

export function registerCandidateProfileRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
  requirePrincipal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  /* ---- Skills ---- */

  app.post(
    "/v1/candidates/skills",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = AddCandidateSkillRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const profile = await input.candidates.findBySubjectId(principal.subjectId);
        if (!profile) return errorReply(reply, 400, "profile_required", "Create a candidate profile first.", req.id);

        const skill = await input.candidateSkills.add({
          id: randomUUID(),
          candidateProfileId: profile.id,
          subjectId: principal.subjectId,
          skillName: parsed.skillName,
          proficiency: parsed.proficiency,
        });

        return reply.code(201).send(
          CandidateSkillPublicSchema.parse({
            ...skill,
            coreSubjectId: principal.coreSubjectId,
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.delete(
    "/v1/candidates/skills/:skillId",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { skillId } = req.params as { skillId: string };
      const principal = req.principal!;
      const profile = await input.candidates.findBySubjectId(principal.subjectId);
      if (!profile) return reply.send({ ok: true });
      await input.candidateSkills.remove(skillId, profile.id);
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/v1/candidates/skills",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const profile = await input.candidates.findBySubjectId(principal.subjectId);
      if (!profile) return reply.send(ListCandidateSkillsResponseSchema.parse({ skills: [] }));
      const skills = await input.candidateSkills.listByProfile(profile.id);
      return reply.send(
        ListCandidateSkillsResponseSchema.parse({
          skills: skills.map((s) => CandidateSkillPublicSchema.parse({ ...s, coreSubjectId: principal.coreSubjectId })),
        }),
      );
    },
  );

  /* ---- Experience ---- */

  app.post(
    "/v1/candidates/experience",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpsertExperienceRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const profile = await input.candidates.findBySubjectId(principal.subjectId);
        if (!profile) return errorReply(reply, 400, "profile_required", "Create a candidate profile first.", req.id);

        const entry = await input.candidateExperience.add({
          id: randomUUID(),
          candidateProfileId: profile.id,
          subjectId: principal.subjectId,
          title: parsed.title,
          company: parsed.company,
          startDate: parsed.startDate,
          endDate: parsed.endDate ?? null,
          description: parsed.description ?? null,
        });

        return reply.code(201).send(
          ExperienceEntryPublicSchema.parse({ ...entry, coreSubjectId: principal.coreSubjectId }),
        );
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.put(
    "/v1/candidates/experience/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = UpsertExperienceRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const profile = await input.candidates.findBySubjectId(principal.subjectId);
        if (!profile) return errorReply(reply, 404, "not_found", "Profile not found.", req.id);

        const updated = await input.candidateExperience.update(id, profile.id, {
          title: parsed.title, company: parsed.company, startDate: parsed.startDate,
          endDate: parsed.endDate ?? null, description: parsed.description ?? null,
        });
        if (!updated) return errorReply(reply, 404, "not_found", "Experience entry not found.", req.id);

        return reply.send(ExperienceEntryPublicSchema.parse({ ...updated, coreSubjectId: principal.coreSubjectId }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.delete(
    "/v1/candidates/experience/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const principal = req.principal!;
      const profile = await input.candidates.findBySubjectId(principal.subjectId);
      if (!profile) return reply.send({ ok: true });
      await input.candidateExperience.remove(id, profile.id);
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/v1/candidates/experience",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const profile = await input.candidates.findBySubjectId(principal.subjectId);
      if (!profile) return reply.send(ListExperienceResponseSchema.parse({ entries: [] }));
      const entries = await input.candidateExperience.listByProfile(profile.id);
      return reply.send(
        ListExperienceResponseSchema.parse({
          entries: entries.map((e) => ExperienceEntryPublicSchema.parse({ ...e, coreSubjectId: principal.coreSubjectId })),
        }),
      );
    },
  );

  /* ---- Education ---- */

  app.post(
    "/v1/candidates/education",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpsertEducationRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const profile = await input.candidates.findBySubjectId(principal.subjectId);
        if (!profile) return errorReply(reply, 400, "profile_required", "Create a candidate profile first.", req.id);

        const entry = await input.candidateEducation.add({
          id: randomUUID(),
          candidateProfileId: profile.id,
          subjectId: principal.subjectId,
          institution: parsed.institution,
          degree: parsed.degree ?? null,
          fieldOfStudy: parsed.fieldOfStudy ?? null,
          startDate: parsed.startDate,
          endDate: parsed.endDate ?? null,
        });

        return reply.code(201).send(
          EducationEntryPublicSchema.parse({ ...entry, coreSubjectId: principal.coreSubjectId }),
        );
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.put(
    "/v1/candidates/education/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const parsed = UpsertEducationRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const profile = await input.candidates.findBySubjectId(principal.subjectId);
        if (!profile) return errorReply(reply, 404, "not_found", "Profile not found.", req.id);

        const updated = await input.candidateEducation.update(id, profile.id, {
          institution: parsed.institution, degree: parsed.degree ?? null,
          fieldOfStudy: parsed.fieldOfStudy ?? null, startDate: parsed.startDate, endDate: parsed.endDate ?? null,
        });
        if (!updated) return errorReply(reply, 404, "not_found", "Education entry not found.", req.id);

        return reply.send(EducationEntryPublicSchema.parse({ ...updated, coreSubjectId: principal.coreSubjectId }));
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.delete(
    "/v1/candidates/education/:id",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const principal = req.principal!;
      const profile = await input.candidates.findBySubjectId(principal.subjectId);
      if (!profile) return reply.send({ ok: true });
      await input.candidateEducation.remove(id, profile.id);
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/v1/candidates/education",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const profile = await input.candidates.findBySubjectId(principal.subjectId);
      if (!profile) return reply.send(ListEducationResponseSchema.parse({ entries: [] }));
      const entries = await input.candidateEducation.listByProfile(profile.id);
      return reply.send(
        ListEducationResponseSchema.parse({
          entries: entries.map((e) => EducationEntryPublicSchema.parse({ ...e, coreSubjectId: principal.coreSubjectId })),
        }),
      );
    },
  );

  /* ---- Preferences ---- */

  app.put(
    "/v1/candidates/preferences",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      try {
        const parsed = UpsertCandidatePreferencesRequestSchema.parse(req.body);
        const principal = req.principal!;
        assertSubjectMatchesPrincipal(principal.subjectId, parsed.coreSubjectId, principal.coreSubjectId);

        const profile = await input.candidates.findBySubjectId(principal.subjectId);
        if (!profile) return errorReply(reply, 400, "profile_required", "Create a candidate profile first.", req.id);

        const prefs = await input.candidatePreferences.upsert({
          candidateProfileId: profile.id,
          subjectId: principal.subjectId,
          desiredJobTypes: parsed.desiredJobTypes ?? [],
          desiredWorkModes: parsed.desiredWorkModes ?? [],
          desiredLocations: parsed.desiredLocations ?? [],
          salaryMin: parsed.salaryMin ?? null,
          salaryMax: parsed.salaryMax ?? null,
          salaryCurrency: parsed.salaryCurrency ?? null,
          industries: parsed.industries ?? [],
          availabilityStatus: parsed.availabilityStatus ?? "not_looking",
          updatedAt: new Date().toISOString(),
        });

        return reply.send(
          CandidatePreferencesPublicSchema.parse({
            ...prefs,
            coreSubjectId: principal.coreSubjectId,
          }),
        );
      } catch (e) {
        if (e instanceof ZodError) return errorReply(reply, 400, "validation_error", "Invalid request body.", req.id);
        if (e instanceof UnauthorizedSubjectMismatchError) return errorReply(reply, 403, e.code, e.message, req.id);
        throw e;
      }
    },
  );

  app.get(
    "/v1/candidates/preferences",
    { preHandler: requirePrincipal },
    async (req, reply) => {
      const principal = req.principal!;
      const profile = await input.candidates.findBySubjectId(principal.subjectId);
      if (!profile) return errorReply(reply, 404, "not_found", "Candidate profile not found.", req.id);
      const prefs = await input.candidatePreferences.findByProfile(profile.id);
      if (!prefs) return errorReply(reply, 404, "not_found", "Preferences not set.", req.id);
      return reply.send(CandidatePreferencesPublicSchema.parse({ ...prefs, coreSubjectId: principal.coreSubjectId }));
    },
  );
}
