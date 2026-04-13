# Rozi-Roti — Jobs Planet for CosmoX

**Rozi-Roti** is the Jobs vertical for the CosmoX Digital Infrastructure Operating System (DIOS). It operates as an independent Planet — runnable standalone or integrated into CosmoX shared services.

## Quick start

```bash
pnpm install
pnpm -C services/jobs dev          # standalone mode, in-memory stores, port 3100
curl http://localhost:3100/health
```

## Architecture

- **Monorepo**: `packages/contracts`, `packages/db`, `services/jobs`
- **Stack**: TypeScript, Fastify, Zod, Vitest, PostgreSQL
- **Pattern**: Hexagonal (ports/adapters), contracts-first
- **Dual-mode**: standalone (in-memory + noop notifications) or CosmoX-integrated (PG + HTTP notifications)

## Identity model

| Field | Use | Where |
|-------|-----|-------|
| `coreSubjectId` | Canonical / external identity | API request/response bodies, cross-service calls |
| `subjectId` | Internal / persisted identity | Database foreign keys, storage rows |

**Never assume `subjectId === coreSubjectId`** — equality may occur in dev but is not guaranteed.

## Dual-mode operation

| Mode | Env vars | Behavior |
|------|----------|----------|
| **Standalone** | None | In-memory stores, noop notifications, dev auth |
| **CosmoX-integrated** | `JOBS_DATABASE_URL`, `NOTIFICATIONS_URL`, `NOTIFICATIONS_SEND_TOKEN` | PostgreSQL, HTTP notifications, platform auth |

## Scripts

```bash
pnpm typecheck    # all packages
pnpm test         # all tests
pnpm build        # compile all
pnpm -C services/jobs dev   # dev server with hot reload
```

## Governance

This Planet is governed by:
- [CosmoX Architecture Constitution](../cosmox-shared-services/docs/governance/constitution.md)
- [Architecture Rules](../cosmox-shared-services/ARCHITECTURE_RULES.md)
- [Identity Anchor Standard](../cosmox-shared-services/IDENTITY_ANCHOR_STANDARD.md)
- [Planet Starter Kit](../cosmox-shared-services/docs/architecture/planet-starter-kit.md)

Planet-specific governance:
- [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md)
- [IDENTITY_RULES.md](./IDENTITY_RULES.md)
- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [DIOS_COMPLIANCE.md](./DIOS_COMPLIANCE.md)
