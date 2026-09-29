# SmartDoctorAid – AI Tools Hub

Multi-provider AI workspace with a configurable tool catalog, prompt library, and explainable auto-router.
Stack: Next.js 15 · TypeScript · Tailwind · Prisma 7 · Neon Postgres · Vercel · Vitest.

> Repo state at start: empty (no existing SmartDoctorAid code). Identity/org/plan tables in `prisma/schema.prisma`
> are minimal placeholders; map them to the real SmartDoctorAid tables when merging. The `Actor` contract
> (`src/lib/ai/security/authz.ts`) is the only auth surface the AI code depends on.

## Run locally
```bash
npm ci && cp .env.example .env      # fill SESSION_SECRET (>=32 chars); AI_DEV_MODE=true for a labelled dev stub
AI_MODELS_DEV=dev-echo npm run dev
curl -X POST -H "origin: http://localhost:3000" "http://localhost:3000/api/dev/login?role=DOCTOR" -c jar   # dev only
npm test && npm run typecheck
```

## Deploy (Neon + Vercel)
1. Create a Neon project; put the pooled string in `DATABASE_URL`, direct string in `DATABASE_URL_UNPOOLED`.
2. `DATABASE_URL_UNPOOLED=… npx prisma migrate deploy && npm run db:seed`
3. Vercel: import repo; set env vars from `.env.example` (Production scope; mark as Sensitive). Build command `npm run build`.
4. Rate limiting is in-memory (per instance). **Before multi-instance production, back `RateLimiter` and the idempotency `results` map with Redis/Upstash or the DB.**

## Provider setup
Set the provider key env var, set `AI_MODELS_<PROVIDER>` (comma list, unset = provider cannot run), then in admin mark the
catalog entry `IN_APP` **after** verifying against the official docs. A tool is only executable when: admin status = IN_APP,
`lastVerifiedAt` set, adapter healthy, model allowlisted. Never set `*_APPROVED_FOR_PHI=true` without a signed DPA/BAA.
Tools without a documented public API (NotebookLM, Gamma, Canva, Glass Health, Copilot, Perplexity, Elicit, Consensus)
are seeded as `EXTERNAL` (launch-only) — the app never scrapes or automates them.

## Security model (what is enforced, in code, with tests)
- Every API: origin (CSRF) check → signed HttpOnly session → role → per-user rate limit → body size → strict zod schema → handler; errors never leak internals.
- Tenant isolation: deny-by-default `canAccess`; org admins do **not** read members' private data.
- Data sharing: patient data only to PHI-approved providers with explicit consent; server re-detects patient data (client flag is not trusted) and org policy can forbid external AI.
- Untrusted files/web content wrapped as inert data + injection detection audit events.
- Credits/model/cost decided server-side; charges only after provider success, idempotent per (user, executionId); failures never charge.
- No prompt/response content in usage or audit records. Secrets only via env/secret-manager references.
- Clinical output is labelled DRAFT; finalising/importing requires a doctor + explicit confirmation.
- Security headers (CSP, HSTS, XFO, nosniff). `npm audit`: see "Known limitations".

"100% security" is not an achievable claim; this is a defence-in-depth baseline that still needs an independent
penetration test, dependency monitoring, and a HIPAA/GDPR/local-law review before real patient data is used.
