import { z } from "zod";
import { EmployerPublicSchema } from "./employers.js";
import { JobPublicSchema } from "./jobs.js";

export const AdminActionPublicSchema = z.object({
  id: z.string().uuid(),
  adminCoreSubjectId: z.string().uuid(),
  actionType: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AdminActionPublic = z.infer<typeof AdminActionPublicSchema>;

export const AdminSuspendRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    reason: z.string().max(2000).optional(),
  })
  .strict();
export type AdminSuspendRequest = z.infer<typeof AdminSuspendRequestSchema>;

export const ListAdminEmployersResponseSchema = z.object({
  employers: z.array(EmployerPublicSchema),
  total: z.number().int().min(0),
});
export type ListAdminEmployersResponse = z.infer<typeof ListAdminEmployersResponseSchema>;

export const ListAdminJobsResponseSchema = z.object({
  jobs: z.array(JobPublicSchema),
  total: z.number().int().min(0),
});
export type ListAdminJobsResponse = z.infer<typeof ListAdminJobsResponseSchema>;

export const ListAdminActionsResponseSchema = z.object({
  actions: z.array(AdminActionPublicSchema),
  total: z.number().int().min(0),
});
export type ListAdminActionsResponse = z.infer<typeof ListAdminActionsResponseSchema>;
