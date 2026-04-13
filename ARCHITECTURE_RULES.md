# Rozi-Roti — Architecture Rules

_Extends: [CosmoX Architecture Constitution](../cosmox-shared-services/docs/governance/constitution.md)_
_Extends: [CosmoX Architecture Rules](../cosmox-shared-services/ARCHITECTURE_RULES.md)_

## Scope

These rules govern the Rozi-Roti Jobs Planet and all code within this repository. Where there is conflict with the CosmoX Constitution, the Constitution prevails.

---

## Non-negotiable rules

### 1. Service boundaries

- No cross-service database access. The Jobs Planet owns only `jobs_*` tables.
- No direct imports from CosmoX service implementation code (`services/*`).
- Allowed imports: `@cosmox/contracts`, `@cosmox/config`, `@cosmox/http-auth`, `@cosmox/providers`, `@cosmox/internal-client`, `@cosmox/db`.
- All integration with CosmoX shared services (notifications, media, identity) happens via HTTP and contracts.

### 2. Identity

- `coreSubjectId` is the canonical external identity. Used in API request/response bodies and cross-service calls.
- `subjectId` is the internal persisted identity. Used in database foreign keys and storage rows.
- **Never assume `subjectId === coreSubjectId`** in code logic.
- Use `assertSubjectMatchesPrincipal(principal.subjectId, claimed, principal.coreSubjectId)` for all mutations.
- Identity resolution (mapping `subjectId` to `coreSubjectId` for other users) is owned by the identity service — do not implement it locally.

### 3. Region neutrality

- No hardcoded countries, currencies, or jurisdictions in domain logic.
- Compensation: `{ amount, currency (ISO 4217), period }`.
- Location: `{ city, region, country (ISO 3166-1 alpha-2) }`.
- All region-specific behavior must be driven by configuration or policy, not code branches.

### 4. Contracts-first

- All API shapes defined as Zod schemas in `packages/contracts/src/`.
- All responses validated through schema `.parse()` before sending.
- No undocumented API surface.

### 5. Ports and adapters

- Every external dependency accessed through a port interface in `services/jobs/src/ports/`.
- Every port has at least two adapters: in-memory (standalone) and production (PG / HTTP).
- `build-app.ts` is a pure injectable factory — no side effects, no direct adapter construction.
- `server.ts` is the composition root — selects adapters based on environment.

### 6. Database

- All tables prefixed `jobs_*`.
- Cross-service references are soft-links (UUID) only — no hard foreign keys to platform tables.
- DDL uses `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for safe reapplication.
- Schema changes are additive — no destructive migrations in the MVP phase.

### 7. Async and infrastructure

- No event bus. HTTP orchestration is the default integration path.
- No payment engine inside this Planet. Payment hooks are extension points only.
- No worker processes unless clearly justified and documented.
- Fire-and-forget side effects (notifications, analytics) must `.catch()` errors and not fail the main operation.

### 8. Testing

- All endpoints tested via Fastify `app.inject()` in Vitest.
- Tests use in-memory adapters — no database or network required.
- Test auth uses `Bearer test_<uuid>` tokens, not platform auth.
- Each new feature module gets its own test file.

---

## Dependency direction

```
Allowed:
  @jobs/* → @cosmox/*          (vertical → Core)
  services/jobs → packages/*    (service → own packages)

Forbidden:
  @cosmox/* → @jobs/*           (Core → vertical)
  services/jobs → services/*    (cross-service import)
  @jobs/db → services/jobs      (package → service)
```

---

## Change control

Any change that alters:
- service boundaries
- identity handling patterns
- cross-service integration
- database ownership

must be reviewed against this document and the CosmoX Constitution before merging.
