import { ErrorBodySchema, JobPublicSchema } from "@jobs/contracts";
import type { JobRow } from "../domain/types.js";

/** Converts a JobRow (storage shape) to the public API shape. */
export function jobRowToPublic(row: JobRow) {
  return JobPublicSchema.parse({
    id: row.id,
    employerId: row.employerId,
    title: row.title,
    description: row.description,
    jobType: row.jobType,
    workMode: row.workMode,
    location:
      row.locationCity || row.locationRegion || row.locationCountry
        ? {
            city: row.locationCity ?? undefined,
            region: row.locationRegion ?? undefined,
            country: row.locationCountry ?? undefined,
          }
        : null,
    compensation:
      row.compCurrency && row.compPeriod
        ? {
            minAmount: row.compMinAmount ?? undefined,
            maxAmount: row.compMaxAmount ?? undefined,
            currency: row.compCurrency,
            period: row.compPeriod,
          }
        : null,
    status: row.status,
    tags: row.tags,
    requiredSkills: row.requiredSkills,
    industry: row.industry,
    experienceLevel: row.experienceLevel,
    expiresAt: row.expiresAt,
    mediaAssetIds: row.mediaAssetIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function errorReply(
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
  requestId: string,
) {
  return reply
    .code(status)
    .send(ErrorBodySchema.parse({ code, message, requestId }));
}
