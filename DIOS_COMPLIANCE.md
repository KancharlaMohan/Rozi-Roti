# Rozi-Roti — DIOS Compliance Report

_Last validated: 2026-04-13_

## Compliance status: ALIGNED (with known transitional gaps)

---

## 1. Constitution compliance

| Constitutional law | Status | Evidence |
|-------------------|--------|----------|
| 3.1 Fundamental Constant (Core is infra, not business) | COMPLIANT | No business logic in `@cosmox/*` imports |
| 3.2 Atmospheric Responsibility (vertical adapts to Core) | COMPLIANT | Uses `@cosmox/contracts` as-is |
| 3.3 Vacuum Law (no cross-DB) | COMPLIANT | All platform refs are soft-links (UUID) |
| 3.4 One-Way Gravity (deps flow to Core) | COMPLIANT | `@jobs/*` → `@cosmox/*` only |
| 3.5 Contract Stability (explicit boundaries) | COMPLIANT | All APIs via Zod schemas |
| 3.6 Soft-Link Law | COMPLIANT | `logo_asset_id`, `resume_asset_id`, `media_asset_id` are all UUIDs |
| 3.7 Registration Law | PENDING | Not yet registered in CosmoX catalog |

## 2. Identity compliance

| Rule | Status | Notes |
|------|--------|-------|
| `coreSubjectId` as canonical identity | COMPLIANT | Used in all API contracts |
| `subjectId` for persistence | COMPLIANT | All DB columns use `subject_id` |
| Never assume equality | COMPLIANT | No `===` comparison in logic |
| `assertSubjectMatchesPrincipal` on mutations | COMPLIANT | All 7 mutation handlers use it |
| No local identity resolution | COMPLIANT | Known gaps documented, not worked around |
| Cross-service calls use `coreSubjectId` | COMPLIANT (partial) | `applyForJob` fixed; `updateApplicationStatus` has documented gap |

## 3. Architecture compliance

| Rule | Status | Notes |
|------|--------|-------|
| No cross-service DB access | COMPLIANT | Only `jobs_*` tables |
| Contracts-first | COMPLIANT | All APIs in `packages/contracts` |
| Ports/adapters pattern | COMPLIANT | 6 ports, 12 adapters (6 in-memory, 6 PG) |
| Region-agnostic | COMPLIANT | No country hardcoding |
| No event bus | COMPLIANT | HTTP only |
| No payment engine | COMPLIANT | Not implemented |
| Standalone mode works | COMPLIANT | `pnpm dev` runs without CosmoX |
| Integrated mode works | COMPLIANT | PG + HTTP notifications when env vars set |

## 4. Planet Starter Kit checklist

| Item | Status |
|------|--------|
| Standalone routes (list, detail, auth mutation) | DONE |
| Identity (coreSubjectId on boundaries, subjectId in DB) | DONE |
| Mismatch and unauthenticated cases tested | DONE |
| Tests (standalone HTTP tests) | DONE (25 tests) |
| Anti-pattern review | DONE |

## 5. Known transitional gaps

| Gap | Impact | Owner | Resolution |
|-----|--------|-------|------------|
| Employer viewing candidate's `coreSubjectId` uses `subjectId` | Low — same in dev, differs in prod | Platform team | Implement `IdentityResolutionPort` in identity service |
| Status update notification uses `subjectId` as recipient | Low — notification may route incorrectly in prod | Platform team | Same |
| Not registered in CosmoX catalog | Blocks launcher visibility | Jobs team | Pending catalog registration API |

## 6. Governance documents present

| Document | Present |
|----------|---------|
| README.md | YES |
| ARCHITECTURE_RULES.md | YES |
| IDENTITY_RULES.md | YES |
| AI_CONSTITUTION.md | YES |
| CONTEXT.md | YES |
| DIOS_COMPLIANCE.md | YES (this file) |
| .cursorrules | YES |

## 7. Next validation

Re-validate after each wave of feature expansion. Update this document with:
- New tables and their compliance status
- New endpoints and their identity handling
- New agent behaviors and their AI Constitution compliance
