# Rozi-Roti — Context Reference

_Read this document at the start of every AI-assisted session._

## What this repository is

**Rozi-Roti** is the Jobs Planet for the CosmoX ecosystem. It is a backend-first job portal that operates as an independent vertical — runnable standalone or integrated into CosmoX shared services.

## What CosmoX is

CosmoX is a **Digital Infrastructure Operating System (DIOS)** — a domain-agnostic, globally deployable platform that hosts independent product verticals called **Planets**.

**CosmoX Core provides:**
- Identity and authentication (`@cosmox/http-auth`, `@cosmox/providers`)
- Notifications (`POST /v1/notifications/internal/send`)
- Media storage (`@cosmox/media` — asset IDs only, no direct storage)
- Consent management
- Geo services
- Catalog (F3)
- Audit infrastructure
- Contracts (`@cosmox/contracts`)
- Database utilities (`@cosmox/db`)
- Internal HTTP client (`@cosmox/internal-client`)

**CosmoX Core does NOT provide:**
- Business logic for any specific Planet
- Event bus (HTTP orchestration is the default)
- Payment processing (extension points only)
- AI/ML infrastructure (each Planet manages its own)

## Repository structure

```
Roti Rozi/                           # Root monorepo
├── packages/contracts/              # @jobs/contracts — Zod API schemas
├── packages/db/                     # @jobs/db — DDL baseline
├── services/jobs/                   # @jobs/service-jobs — Fastify HTTP service
│   ├── src/
│   │   ├── build-app.ts             # App factory (pure, injectable)
│   │   ├── server.ts                # Composition root (adapter selection)
│   │   ├── env.ts                   # Environment schema
│   │   ├── domain/                  # Business logic and types
│   │   ├── ports/                   # Interface definitions
│   │   ├── adapters/in-memory/      # Standalone mode stores
│   │   ├── adapters/pg/             # PostgreSQL implementations
│   │   └── routes/                  # HTTP route modules (being refactored)
│   └── tests/                       # Vitest integration tests
├── ARCHITECTURE_RULES.md            # Planet architecture rules
├── IDENTITY_RULES.md                # Identity handling rules
├── AI_CONSTITUTION.md               # AI agent guardrails
├── DIOS_COMPLIANCE.md               # CosmoX compliance status
└── CONTEXT.md                       # This file
```

## Sibling repositories

| Repo | Description | Relationship |
|------|-------------|-------------|
| `cosmox-shared-services` | CosmoX Core — identity, notifications, media, etc. | Parent platform. Jobs imports `@cosmox/*` packages via `file:` links. |
| `cosmox-realestate` | Real Galaxy (real estate vertical) | Sibling Planet. Same structural patterns. Reference implementation. |

## Current state

- **17 endpoints**, **6 DB tables**, **25 tests** — all passing
- Application flow is complete (apply, status lifecycle, saved jobs)
- Basic profiles (employer + candidate) implemented
- Basic job search with filters
- Dual-mode: standalone (in-memory) and CosmoX-integrated (PG + HTTP notifications)
- DIOS identity compliant: `assertSubjectMatchesPrincipal` on all mutations

## What NOT to do

1. **Do NOT import from `services/*` in cosmox-shared-services** — only `@cosmox/*` packages
2. **Do NOT add cross-service DB queries** — soft-links (UUID) only
3. **Do NOT assume `subjectId === coreSubjectId`**
4. **Do NOT hardcode countries, currencies, or jurisdictions**
5. **Do NOT introduce event bus, message queue, or async infra**
6. **Do NOT build payment processing** — extension points only
7. **Do NOT skip contracts** — all API shapes via Zod schemas in `packages/contracts`
8. **Do NOT bypass `assertSubjectMatchesPrincipal`** on mutations
9. **Do NOT add dependencies** not in existing `package.json` without approval
10. **Do NOT generate code that doesn't pass `pnpm typecheck && pnpm test`**

## Key governance documents (read in this order)

1. [CosmoX Architecture Constitution](../cosmox-shared-services/docs/governance/constitution.md) — supreme law
2. [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md) — this Planet's rules
3. [IDENTITY_RULES.md](./IDENTITY_RULES.md) — identity handling
4. [AI_CONSTITUTION.md](./AI_CONSTITUTION.md) — AI agent guardrails
5. [PRODUCTION_GAPS.md](./PRODUCTION_GAPS.md) — what's NOT production-ready yet (auth, SMS, consent, etc.)
6. [CosmoX Planet Starter Kit](../cosmox-shared-services/docs/architecture/planet-starter-kit.md) — structural patterns
