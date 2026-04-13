import type { CandidateSearchResult } from "@jobs/contracts";
import type { CandidateSearchRepository, CandidateSearchFilter } from "../../ports/candidate-search.repository.js";
import type { CandidateProfileRow, CandidateSkillRow, CandidatePreferencesRow } from "../../domain/types.js";

/**
 * In-memory candidate search — joins across profiles, skills, and preferences stores.
 * For standalone mode. Production uses a PG adapter with SQL joins.
 */
export function createInMemoryCandidateSearchStore(
  profilesGetter: () => Iterable<CandidateProfileRow>,
  skillsGetter: (candidateProfileId: string) => CandidateSkillRow[],
  preferencesGetter: (candidateProfileId: string) => CandidatePreferencesRow | null,
): CandidateSearchRepository {
  return {
    async search(filter: CandidateSearchFilter) {
      const results: CandidateSearchResult[] = [];
      for (const profile of profilesGetter()) {
        const prefs = preferencesGetter(profile.id);
        const availability = prefs?.availabilityStatus ?? null;

        // Filter: skip hidden candidates
        if (availability === "not_looking") continue;

        // Filter: availability
        if (filter.availability && availability !== filter.availability) continue;

        const skills = skillsGetter(profile.id);

        // Filter: skills (if requested, at least one must match)
        if (filter.skills && filter.skills.length > 0) {
          const candidateSkillNames = skills.map((s) => s.skillName.toLowerCase());
          const hasMatch = filter.skills.some((s) => candidateSkillNames.includes(s.toLowerCase()));
          if (!hasMatch) continue;
        }

        results.push({
          id: profile.id,
          coreSubjectId: profile.subjectId, // transitional gap — see IDENTITY_RULES.md
          displayName: profile.displayName,
          headline: profile.headline,
          availabilityStatus: availability,
          skills: skills.map((s) => ({ skillName: s.skillName, proficiency: s.proficiency })),
        });
      }

      const total = results.length;
      const paged = results.slice(filter.offset, filter.offset + filter.limit);
      return { rows: paged, total };
    },
  };
}
