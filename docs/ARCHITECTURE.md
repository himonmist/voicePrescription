# Architecture, API contracts and backlog

## Layers
`src/app` (UI + thin routes) → `src/lib/api/handler.ts` (pipeline) → `src/lib/ai/service.ts` (gate) → `execute.ts` (orchestrator)
→ `providers/*` (adapters behind `ProviderAdapter`) ; `router/` (classify + rule-based rank) ; `billing/` ; `workflow/` ; `security/` ; `catalog/`.
Persistence is behind `ExecDeps` (Prisma/Neon in `deps.ts`, in-memory in tests).

## Routing (explainable, not "best tool")
Hard filters (disabled / external / unhealthy / plan / capabilities / PHI approval / web search / context) with a recorded rejection reason,
then score = preference + structured output + cost + latency. Ties → shortlist. Nothing executable → explanation + external alternatives (partial capability overlap, ranked).

## API (implemented ✅ / planned ⏳)
| Route | Status |
|---|---|
| GET /api/ai-tools | ✅ (DB or labelled seed; `effectiveStatus` from live adapter health) |
| POST /api/ai/route | ✅ |
| POST /api/ai/execute | ✅ (needs DB) |
| GET /api/prompts, POST /api/prompts/:id/execute | ✅ (seed prompts; variable validation + render) |
| GET /api/ai/usage/summary | ✅ (needs DB) |
| tools/:id, categories, sessions, messages, executions/:id(+cancel), workflows*, documents*, knowledge-collections, budget, prompt CRUD/favorite, admin CRUD, analytics | ⏳ |

Errors: `{error:{code,message}}` with 400/401/402/403/413/429/502/503.

## Status vs. your spec (honest)
Done & tested (107 tests): variable validation/rendering, injection guard, sharing policy, tenant authz, router, quota + idempotent ledger,
orchestrator (no double charge, failure→alternatives, dev-mode labelling, per-user idempotency), healthcare guards, workflow engine
(deps, conditions, approvals, retries, cancel, cost gate, clinical review), catalog validation, sessions, rate limiter, API pipeline, repo hygiene.
Schema: all 31 requested models + identity placeholders; initial migration generated (not yet applied to a live DB).
Not done: DB-backed prompt/catalog admin CRUD, sessions/chat UI with streaming, file upload/OCR/malware scan, knowledge workspace, workflow UI,
billing UI/Stripe/invoices, analytics dashboards, admin screens, real provider calls (adapters written to the documented HTTP APIs, **untested against live providers**),
Bangla/English translation workflow, i18n, E2E browser tests (Scenarios A–I are covered only at unit/service level where noted).

## Known limitations
- `npm audit`: high advisories in build-time transitive deps (Prisma CLI → mysql2/deepmerge-ts; Next's bundled postcss). Not in the request path; CI gates on critical only. Track upstream.
- In-memory rate limit/idempotency are single-instance.
- CSP allows `'unsafe-inline'` scripts (Next inline bootstrap); move to nonce-based CSP via middleware.
- Session auth is a stand-in for SmartDoctorAid's real auth.

## Backlog (next phases, in order)
1. Apply migration to Neon, DB-backed prompt library + admin CRUD (audited). 2. Sessions/messages + chat workspace w/ SSE streaming.
3. Consent dialog UI + route confirmation step. 4. Uploads (Vercel Blob/S3, scan, extract). 5. Billing UI + payment integration.
6. Workflow persistence/UI. 7. Admin + analytics. 8. Playwright E2E for scenarios A–I; external pen-test.
