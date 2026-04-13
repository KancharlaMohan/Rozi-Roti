import { z } from "zod";

export const TierTypeSchema = z.enum(["candidate", "employer"]);
export type TierType = z.infer<typeof TierTypeSchema>;

export const SubscriptionStatusSchema = z.enum(["active", "cancelled", "expired"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionTierPublicSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tierType: TierTypeSchema,
  features: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});
export type SubscriptionTierPublic = z.infer<typeof SubscriptionTierPublicSchema>;

export const CreateSubscriptionTierRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    name: z.string().min(1).max(200),
    tierType: TierTypeSchema,
    features: z.record(z.unknown()).optional(),
  })
  .strict();
export type CreateSubscriptionTierRequest = z.infer<typeof CreateSubscriptionTierRequestSchema>;

export const SubscriptionPublicSchema = z.object({
  id: z.string().uuid(),
  coreSubjectId: z.string().uuid(),
  tierId: z.string().uuid(),
  tierName: z.string(),
  status: SubscriptionStatusSchema,
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type SubscriptionPublic = z.infer<typeof SubscriptionPublicSchema>;

export const GrantSubscriptionRequestSchema = z
  .object({
    coreSubjectId: z.string().uuid(),
    subjectId: z.string().uuid(),
    tierId: z.string().uuid(),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();
export type GrantSubscriptionRequest = z.infer<typeof GrantSubscriptionRequestSchema>;

export const ListSubscriptionTiersResponseSchema = z.object({
  tiers: z.array(SubscriptionTierPublicSchema),
});
export type ListSubscriptionTiersResponse = z.infer<typeof ListSubscriptionTiersResponseSchema>;
