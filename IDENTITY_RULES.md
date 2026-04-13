# Rozi-Roti — Identity Rules

_Extends: [CosmoX Identity Anchor Standard](../cosmox-shared-services/IDENTITY_ANCHOR_STANDARD.md)_
_Extends: [CosmoX Identity Resolution Boundary](../cosmox-shared-services/IDENTITY_RESOLUTION_BOUNDARY.md)_

## Canonical identity model

| Field | Type | Source | Use |
|-------|------|--------|-----|
| `coreSubjectId` | UUID | `principal.coreSubjectId` from auth | API bodies, cross-service calls, notification recipients, public-facing responses |
| `subjectId` | UUID | `principal.subjectId` from auth | Database `subject_id` columns, internal storage keys, repository lookups |

## Rules

### 1. Never equate

```typescript
// FORBIDDEN — do not assume equality
if (subjectId === coreSubjectId) { ... }

// CORRECT — always treat them as separate values
const persistenceKey = principal.subjectId;
const apiIdentity = principal.coreSubjectId;
```

### 2. Mutation validation

All authenticated mutations that accept `coreSubjectId` in the request body MUST validate using the platform utility:

```typescript
import { assertSubjectMatchesPrincipal } from "@cosmox/http-auth";

// In every mutation handler:
assertSubjectMatchesPrincipal(
  principal.subjectId,       // auth binding check
  parsed.coreSubjectId,      // claimed identity from request
  principal.coreSubjectId    // canonical identity from auth
);
```

This enforces TWO checks:
1. **Canonical claim**: `principal.coreSubjectId === request.coreSubjectId`
2. **Auth binding**: `principal.subjectId === request.coreSubjectId`

### 3. Persistence

- Database columns: always `subject_id` (persisted identity)
- Never store `coreSubjectId` in Jobs Planet tables — it is derived from the principal at request time
- Repository interfaces accept `subjectId`, not `coreSubjectId`

### 4. API responses

- All public API responses expose `coreSubjectId`, not `subjectId`
- For the authenticated user's own data: `coreSubjectId` comes from `principal.coreSubjectId`
- For other users' data (e.g., employer viewing candidate applications): this is a **known gap** — requires identity service resolution

### 5. Cross-service calls

- Notification port uses `coreSubjectId` for recipient identification
- Media references use asset IDs (no identity involved)
- The Jobs Planet MUST NOT call the identity service to resolve other users' identities — that would violate the Identity Resolution Boundary. This must be handled by the platform orchestration layer.

### 6. Known transitional gaps

| Gap | Location | Resolution path |
|-----|----------|----------------|
| Employer views candidate `coreSubjectId` in application listing | `build-app.ts` line ~350 | Requires `IdentityResolutionPort` owned by identity service |
| Status update notification uses `app.subjectId` as canonical | `jobs-service.ts` line ~237 | Same — needs identity service resolution |
| Application row stores `subjectId` but API needs `coreSubjectId` | `applications.repository.ts` | Same — transitional per IDENTITY_RESOLUTION_BOUNDARY.md |

These are **architecturally correct gaps** — the Jobs Planet does not own identity resolution. They must be resolved at the platform level when `IdentityResolutionPort` is implemented.

## Anti-patterns

- Storing `coreSubjectId` in domain tables "for convenience"
- Implementing a local `resolveSubjectId` function
- Querying `identity_subjects` table from the Jobs Planet
- Trusting `coreSubjectId` from request body without `assertSubjectMatchesPrincipal`
- Using `subjectId` in notification payloads (must use `coreSubjectId`)
