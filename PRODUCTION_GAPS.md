# Rozi-Roti — Production Gaps

_Last updated: 2026-04-14_

This document identifies gaps between the current implementation and production readiness. Each gap includes its current state, what's needed, who owns the fix, and the risk if unresolved.

---

## Critical gaps (must fix before production)

### 1. Authentication — Dev stub only

**Current state:** All authentication uses `createStubDevBearerAuthenticateAdapter()` from `@cosmox/providers`. This accepts `mpn_dev_<uuid>` tokens with no signature verification, no expiry, no revocation. Anyone who knows the token format can impersonate any user.

**What's needed:**
- Replace with real `AuthenticateRequestPort` adapter that validates JWT tokens (or session tokens) issued by a production identity provider
- Token validation must verify: signature, expiry, audience, issuer
- In standalone mode: implement local JWT verification with a shared secret or public key
- In CosmoX-integrated mode: validate tokens against the identity service

**Owner:** Platform team (identity service) + Jobs team (adapter wiring in `server.ts`)

**Risk if unresolved:** Complete authentication bypass. Any actor can impersonate any user.

**File:** `services/jobs/src/server.ts` line ~128 — `createStubDevBearerAuthenticateAdapter()`

---

### 2. SMS / Email / Push delivery — No real provider

**Current state:** The Jobs Planet does NOT send SMS, email, or push notifications directly. It has two notification adapters:
- **Standalone mode:** `createNoopNotificationsAdapter()` — logs to console, delivers nothing
- **CosmoX-integrated mode:** `createHttpNotificationsAdapter()` — calls `POST /v1/notifications/internal/send` on the platform notifications service

Neither mode actually delivers messages to users. The HTTP adapter delegates to the CosmoX notifications service, but that service also needs a real provider configured (SMS gateway, email service, push service).

**What's needed:**
- For standalone mode: implement a real notification adapter (e.g., Twilio for SMS, SendGrid for email, Firebase for push) directly in the Jobs Planet, OR accept that standalone mode has no notifications
- For CosmoX-integrated mode: ensure the platform notifications service has real providers configured
- The Jobs Planet does NOT own provider selection — per `ARCHITECTURE_RULES.md`, notification delivery is a platform capability

**Owner:** Platform team (notifications service provider configuration)

**Risk if unresolved:** Users receive no notifications — no application confirmations, no status updates, no job alerts.

**Files:**
- `services/jobs/src/adapters/noop-notifications.adapter.ts`
- `services/jobs/src/adapters/http-notifications.adapter.ts`
- `services/jobs/src/ports/notifications.port.ts`

---

### 3. Consent validation — Not implemented

**Current state:** The Jobs Planet sends notifications and collects user data without checking consent. The CosmoX platform has a consent service (`services/consent` in `cosmox-shared-services`), but the Jobs Planet does not call it.

**What's needed:**
- Add a `ConsentCheckPort` to the Jobs Planet dependency injection
- Before sending marketing notifications or job alerts, check user consent via the consent service
- Transactional notifications (application confirmation, status updates) may not require consent per most jurisdictions, but this should be confirmed per region
- The notification preferences system (Wave 1f) is a Jobs-level preference, NOT a legal consent record — they are complementary but not the same

**Owner:** Platform team (consent service) + Jobs team (consent check adapter wiring)

**Risk if unresolved:** Legal/regulatory non-compliance (GDPR, CCPA, etc.) for marketing communications.

**Relevant governance:** Per `AI_CONSTITUTION.md` Section 3.4, agents must "respect data retention policies" — this requires consent infrastructure.

---

### 4. Identity resolution — Known transitional gaps

**Current state:** When the Jobs Planet displays another user's identity (e.g., employer viewing candidate applications), it uses `subjectId` (persisted identity) in place of `coreSubjectId` (canonical identity). These values are equal in dev mode but may differ in production.

**What's needed:**
- Implement `IdentityResolutionPort` in the CosmoX identity service
- The Jobs Planet calls this port (via HTTP adapter) to resolve `subjectId → coreSubjectId` when displaying other users' data
- The Jobs Planet MUST NOT implement identity resolution locally — per `IDENTITY_RESOLUTION_BOUNDARY.md`

**Owner:** Platform team (identity service)

**Risk if unresolved:** In production where `subjectId ≠ coreSubjectId`, API responses will show incorrect identity values for other users. Self-user responses are correct (derived from the principal).

**Locations with this gap:**
- `services/jobs/src/routes/employers.ts` — employer viewing candidate applications
- `services/jobs/src/routes/moderation.ts` — admin viewing moderation actions
- `services/jobs/src/routes/messaging.ts` — message sender identity
- `services/jobs/src/routes/interviews.ts` — interview proposer identity
- `services/jobs/src/routes/reviews.ts` — reviewer identity
- `services/jobs/src/routes/admin.ts` — admin action log

All locations are marked with `// transitional gap` or `// TODO: resolve via identity service` comments.

---

## High-priority gaps (should fix before public launch)

### 5. Rate limiting — Not implemented

**Current state:** No rate limiting on any endpoint. Any client can make unlimited requests.

**What's needed:**
- Per-IP rate limiting on public endpoints (job search, job detail)
- Per-user rate limiting on authenticated endpoints (apply, message, flag)
- Per-employer rate limiting on job creation
- Can be implemented as Fastify plugin or reverse proxy config

**Owner:** Jobs team (or platform gateway)

**Risk if unresolved:** DDoS vulnerability, abuse of application/messaging endpoints, spam job postings.

---

### 6. Input sanitization — Minimal

**Current state:** Zod validates types and lengths, but does not sanitize HTML, script injection, or SQL injection beyond parameterized queries.

**What's needed:**
- Sanitize text fields (job descriptions, messages, reviews) for XSS before storage or at rendering time
- The PG adapters use parameterized queries (`$1, $2, ...`) which prevent SQL injection
- Consider a content sanitization library for HTML-rich text fields

**Owner:** Jobs team

**Risk if unresolved:** XSS vulnerabilities in job descriptions, messages, and reviews.

---

### 7. CORS configuration — Not configured

**Current state:** No CORS headers configured. The Fastify instance uses defaults (no CORS).

**What's needed:**
- Configure `@fastify/cors` with appropriate origin allowlists
- In standalone mode: allow the frontend origin
- In CosmoX-integrated mode: allow the CosmoX web shell origin

**Owner:** Jobs team

**Risk if unresolved:** Frontend applications cannot call the API from a browser.

---

### 8. HTTPS / TLS — Not configured

**Current state:** The server listens on plain HTTP. No TLS termination.

**What's needed:**
- In production: TLS termination at the load balancer or reverse proxy
- The application itself does not need to handle TLS if behind a proxy
- Ensure all cross-service HTTP calls (to notifications, identity) use HTTPS in production

**Owner:** Infrastructure team

**Risk if unresolved:** Data transmitted in plaintext, including auth tokens.

---

### 9. Database migrations — No versioned migrations

**Current state:** All DDL is in a single `BASELINE_DDL` string using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS`. This is safe for initial setup but not for production schema evolution.

**What's needed:**
- Implement versioned migrations (e.g., using `node-pg-migrate` or a custom migration runner)
- Each wave's DDL additions should become individual migration files
- Rollback capability for failed migrations

**Owner:** Jobs team

**Risk if unresolved:** Schema changes in future releases may fail or cause data loss without proper migration tooling.

---

### 10. Logging and observability — Basic only

**Current state:** Fastify's built-in pino logger is enabled. No structured logging beyond request/response. No metrics, no tracing, no health check beyond `/health`.

**What's needed:**
- Structured log fields: `coreSubjectId`, `action`, `entityType`, `entityId` on domain operations
- Metrics: request latency, error rates, queue depths (for future async operations)
- Distributed tracing: `x-request-id` propagation is implemented, but no trace export
- Per `ARCHITECTURE_RULES.md`: "Each service must emit sufficient telemetry for health monitoring, failure diagnosis, security review"

**Owner:** Jobs team + Platform team

**Risk if unresolved:** Cannot diagnose production issues, no security audit trail, no capacity planning data.

---

## Medium-priority gaps (should fix before scale)

### 11. PostgreSQL adapters — Incomplete for Wave 1+ features

**Current state:** PG adapters exist for the original 6 tables (employers, candidates, jobs, applications, saved-jobs, posting-media). All Wave 1-5 features use in-memory adapters only, even in CosmoX-integrated (PG) mode.

**What's needed:**
- PG adapters for all 28 tables added in Waves 1-5
- The port interfaces are defined and the in-memory adapters prove the contracts work
- PG adapters follow the same pattern as the original 6 — see `services/jobs/src/adapters/pg/`

**Owner:** Jobs team

**Risk if unresolved:** All data stored in-memory is lost on restart. Production persistence requires PG adapters.

---

### 12. Secrets management — Environment variables only

**Current state:** All secrets (database URL, notification service token) are loaded from environment variables via Zod-validated `env.ts`. No secrets rotation, no vault integration.

**What's needed:**
- Integrate with a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Per CosmoX Constitution Section 10.2: "Secrets must not be hard-coded. All environments must use approved secret storage."

**Owner:** Infrastructure team

**Risk if unresolved:** Secrets in environment variables may leak via logs, process listings, or container inspection.

---

### 13. Graceful shutdown — Not implemented

**Current state:** The server starts but has no graceful shutdown handling. Active requests and database connections are not drained on SIGTERM.

**What's needed:**
- Handle SIGTERM/SIGINT signals
- Drain active requests before closing
- Close database pool connections
- Close Fastify server gracefully

**Owner:** Jobs team

**Risk if unresolved:** In-flight requests may fail during deployments.

---

## Low-priority gaps (future work)

### 14. Caching — None

No caching layer for frequently accessed data (published jobs, employer profiles, analytics aggregates).

### 15. Full-text search — Basic ILIKE only

Job search uses `ILIKE` pattern matching. No full-text search index (pg_trgm, tsvector) or external search engine (Elasticsearch).

### 16. File upload validation — Media service dependency

Resume and logo uploads are by asset ID reference only. No validation that the referenced media asset actually exists in the media service.

### 17. Email templates — Hardcoded template codes

Notification template codes (`jobs_application_confirmation`, `jobs_application_status_update`) are hardcoded strings. No registration or validation against the platform notifications service template registry.

---

## Gap resolution tracking

| # | Gap | Severity | Owner | Status |
|---|-----|----------|-------|--------|
| 1 | Auth — dev stub | CRITICAL | Platform + Jobs | Open |
| 2 | SMS/Email/Push delivery | CRITICAL | Platform | Open |
| 3 | Consent validation | CRITICAL | Platform + Jobs | Open |
| 4 | Identity resolution | CRITICAL | Platform | Open — documented in IDENTITY_RULES.md |
| 5 | Rate limiting | HIGH | Jobs / Gateway | Open |
| 6 | Input sanitization | HIGH | Jobs | Open |
| 7 | CORS | HIGH | Jobs | Open |
| 8 | HTTPS/TLS | HIGH | Infrastructure | Open |
| 9 | DB migrations | HIGH | Jobs | Open |
| 10 | Logging/observability | HIGH | Jobs + Platform | Open |
| 11 | PG adapters for Wave 1-5 | MEDIUM | Jobs | Open |
| 12 | Secrets management | MEDIUM | Infrastructure | Open |
| 13 | Graceful shutdown | MEDIUM | Jobs | Open |
| 14 | Caching | LOW | Jobs | Open |
| 15 | Full-text search | LOW | Jobs | Open |
| 16 | Media validation | LOW | Jobs | Open |
| 17 | Email templates | LOW | Jobs | Open |
