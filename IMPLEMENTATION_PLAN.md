# Enterprise Recruitment Data Platform — Implementation Plan

## Current State Assessment

### Reusable Assets (keep as-is or adapt)
| Asset | Location | Reuse Strategy |
|-------|----------|----------------|
| Gemini CV/JD/Match AI | `src/lib/gemini.ts` | Move to `packages/embeddings/` + extend with embedding generation |
| Stripe billing config | `src/lib/stripe.ts` | Move to `packages/billing/`, add metered usage + subscription CRUD |
| Webhook delivery | `src/lib/webhooks.ts` | Move to `packages/webhooks/`, add retry queue + exponential backoff |
| Visa scraper + seed data | `src/lib/visa-scraper.ts` | Move to `apps/crawl4ai/`, add change detection + history tracking |
| Photo extraction | `src/lib/photo-extraction.ts` | Move to `packages/shared/` utility |
| Supabase clients | `src/lib/supabase-*.ts` | Keep for `apps/api` consumer-facing app, parallel to enterprise API |
| SEO structured data | `src/lib/structured-data.ts` | Keep in `apps/api` |
| Drizzle schema (partial) | `packages/db/schema/` | Extend with missing tables, add RLS SQL, generate migrations |
| 26 Next.js pages | `src/app/[locale]/` | Keep as `apps/api` (consumer marketplace) |
| 12 API routes | `src/app/api/` | Keep for consumer app; enterprise API is separate |

### Must Build From Scratch
- Monorepo tooling (Turborepo + pnpm workspaces)
- Docker Compose infrastructure (7 services)
- BullMQ queue system + Upstash Redis
- MinIO object storage service
- Bright Data proxy integration
- Playwright scraper service
- Crawl4AI service with Gemini extraction
- Claude Computer Use + Cowork agent
- Embedding pipeline (Gemini text-embedding-004)
- Enterprise API layer (`/api/v1/` with OpenAPI)
- Multi-tenant auth (JWT + API keys + MFA + SSO)
- Nginx reverse proxy + SSL
- GitHub Actions CI/CD
- Monitoring stack (Sentry + Checkly)

---

## Phase 0 — Monorepo Foundation (Week 1)

**Goal:** Convert to monorepo, get all existing code building, zero regressions.

### 0.1 — pnpm Workspaces Setup
- [ ] Install pnpm, create `pnpm-workspace.yaml`
- [ ] Define workspace packages: `apps/*`, `packages/*`, `infra/*`
- [ ] Move existing Next.js app to `apps/api/`
- [ ] Update all import paths (`@/*` → `@recruitment/api/*` or keep relative)
- [ ] Verify `pnpm install` resolves all dependencies

### 0.2 — Turborepo Configuration
- [ ] `turbo.json` with pipeline: build, dev, lint, test, typecheck
- [ ] Per-package `turbo.json` overrides where needed
- [ ] Cache configuration (local + remote via Vercel)
- [ ] `pnpm dev` starts all apps in parallel

### 0.3 — Package Scaffolding (empty shells)
Create all package directories with `package.json` + `tsconfig.json` + `src/index.ts`:
- [ ] `packages/db` — already exists, verify builds
- [ ] `packages/auth` — JWT, API key, MFA, SSO utilities
- [ ] `packages/queue` — BullMQ producers/consumers + job types
- [ ] `packages/webhooks` — delivery engine + retry + signature
- [ ] `packages/billing` — Stripe integration + metered usage
- [ ] `packages/embeddings` — Gemini client + chunking strategies
- [ ] `packages/matching` — hybrid pgvector + tsvector scoring
- [ ] `packages/storage` — MinIO client + archive utilities
- [ ] `packages/shared` — types, constants, error codes, response envelope

### 0.4 — Shared TypeScript Config
- [ ] Root `tsconfig.base.json` with strict settings
- [ ] Per-package `tsconfig.json` extending base
- [ ] Path aliases for cross-package imports (`@recruitment/db`, `@recruitment/auth`, etc.)
- [ ] Shared ESLint config (`packages/eslint-config/`)

### 0.5 — Verify Zero Regression
- [ ] `pnpm build` succeeds for `apps/api`
- [ ] `pnpm test` passes all existing tests
- [ ] `pnpm dev` runs the existing app correctly
- [ ] Vercel deployment still works (update `vercel.json` root directory)

**Deliverable:** Monorepo builds, existing app unchanged, all packages scaffolded.

---

## Phase 1 — Database & Schema Completion (Week 2)

**Goal:** Unified Drizzle schema on Neon with all tables, RLS, migrations, seed data.

### 1.1 — Complete Drizzle Schema (fill gaps from audit)
- [ ] `packages/db/schema/candidates.ts` — Add missing fields:
  - `email`, `phone`, `photo_url`, `headline`, `bio`
  - `education` (JSONB), `work_history` (JSONB), `certifications` (TEXT[])
  - `quiz_answers` (JSONB), `match_tags` (TEXT[])
  - `cv_url`, `cv_parsed_at`
  - `is_public`, `available_now`, `notice_period`, `available_from`, `open_to_relocation`
  - `salary_expectation_min`, `salary_expectation_max`, `salary_currency`
  - `remote_preference` (enum: remote/hybrid/onsite/any)

- [ ] `packages/db/schema/jobs.ts` — Add missing fields:
  - `description` (TEXT), `nice_to_haves` (TEXT[]), `skills_required` (TEXT[])
  - `job_type` (enum: full-time/part-time/contract/freelance/internship)
  - `work_mode` (enum: remote/hybrid/onsite)
  - `city` (TEXT), `salary_min` (INTEGER), `salary_max` (INTEGER), `salary_currency`
  - `visa_sponsorship` (BOOLEAN)
  - `experience_min`, `experience_max`, `education_level`
  - `industry`, `match_tags` (TEXT[])
  - `is_active`, `is_featured`, `views_count`, `applications_count`

- [ ] `packages/db/schema/applications.ts` — NEW table:
  - `id`, `org_id`, `candidate_id`, `job_id`, `recruiter_id`
  - `status` (enum: applied → hired pipeline)
  - `cover_letter`, `match_score`, `match_explanation`, `notes`
  - `status_history` (JSONB)
  - Indexes on candidate_id, job_id, status

- [ ] `packages/db/schema/matches.ts` — NEW table:
  - `id`, `org_id`, `candidate_id`, `job_id`
  - `score` (INTEGER 0-100), `breakdown` (JSONB), `explanation`
  - UNIQUE(org_id, candidate_id, job_id)

- [ ] `packages/db/schema/quiz.ts` — NEW table:
  - `quiz_questions`: id, org_id, category, question, options (JSONB), weight, sort_order, is_active
  - `quiz_results`: id, org_id, recruiter_id, job_id, quiz_answers (JSONB), candidates (JSONB), total_scanned

### 1.2 — Visa Schema Enhancement
- [ ] Add `origin_country` to `visa_rules` (currently only `country` destination)
- [ ] Expand `visa_country` enum to all 29 countries (currently CH/EU/US/CA/UK only)
- [ ] Add `eligible_occupations` (TEXT[]), `fee_currency`, `min_salary`, `min_experience_years`
- [ ] Add `education_requirements`, `quota_limited`, `annual_quota`

### 1.3 — RLS Policy SQL Generation
- [ ] Write raw SQL for RLS policies on all Drizzle tables
- [ ] Every table: `WHERE org_id = current_setting('app.current_org_id')::uuid`
- [ ] Store in `packages/db/rls/` as versioned SQL files
- [ ] Create migration that enables RLS + applies policies
- [ ] Test RLS with multiple org contexts

### 1.4 — Drizzle Migrations
- [ ] Generate initial migration from complete schema
- [ ] Run against Neon staging branch
- [ ] Seed data: countries (29), visa rules (from existing seed), quiz questions
- [ ] Create `packages/db/seed.ts` using existing visa-scraper SEED_DATA

### 1.5 — Data Migration Script (Supabase → Neon)
- [ ] Write ETL script: read from Supabase, transform to Drizzle schema, write to Neon
- [ ] Map: candidates, recruiters → organisations + users + candidates
- [ ] Map: jobs, applications, matches
- [ ] Map: visa_requirements → visa_rules (new schema)
- [ ] Map: webhook_configs → webhook_endpoints
- [ ] Verify row counts + spot-check data integrity

**Deliverable:** Complete Drizzle schema, RLS policies, migrations run on Neon, seed data loaded.

---

## Phase 2 — Core Packages (Weeks 3-4)

**Goal:** Build all shared packages that services depend on.

### 2.1 — `packages/shared`
- [ ] Response envelope type: `{ data, meta: { cursor, total }, errors[] }`
- [ ] Error codes enum (auth, validation, rate_limit, billing, scrape)
- [ ] Cursor-based pagination utilities
- [ ] Request-ID generation + propagation helpers
- [ ] Date/time utilities
- [ ] Country codes + locale constants (from existing types)
- [ ] Zod schemas for all API request/response types

### 2.2 — `packages/auth`
- [ ] JWT generation + verification (access + refresh tokens)
- [ ] API key generation (crypto random) + HMAC-SHA256 hashing
- [ ] API key validation middleware
- [ ] MFA: TOTP generation + verification (speakeasy or otpauth)
- [ ] SSO: OAuth2 provider abstraction (Google, Microsoft, SAML)
- [ ] Session management (create, validate, revoke)
- [ ] Audit logging helper: `logAudit(org_id, user_id, action, resource, outcome, metadata)`
- [ ] Middleware: `requireAuth()`, `requireRole(role)`, `requireScope(scope)`
- [ ] Rate limiting: Upstash Redis sliding window (per API key)

### 2.3 — `packages/queue`
- [ ] Upstash Redis connection factory
- [ ] BullMQ queue definitions:
  - `scrape:high` (SLA <2min, Computer Use + on-demand)
  - `scrape:standard` (scheduled background)
  - `scrape:low` (bulk backfill)
  - `embed:process` (post-normalisation embeddings)
  - `webhook:deliver` (delivery with backoff)
- [ ] Job type definitions (TypeScript interfaces per queue)
- [ ] DLQ configuration (3 retries → dead letter)
- [ ] Queue event handlers (completed, failed, stalled)
- [ ] Resend alert integration on DLQ events
- [ ] BullMQ dashboard (bull-board) setup for VPS

### 2.4 — `packages/webhooks`
- [ ] Migrate + enhance `src/lib/webhooks.ts`
- [ ] HMAC-SHA256 payload signing
- [ ] Delivery engine with BullMQ queue integration
- [ ] Exponential backoff: 5 attempts over 24h (1min, 5min, 30min, 2h, 12h)
- [ ] Auto-disable endpoint after 5 consecutive failures
- [ ] Resend alert to tenant on disable
- [ ] Event types: visa_rule.created/updated/superseded, candidate.indexed, job.indexed/expired, match.completed, scrape.failed, billing.limit_reached/warning
- [ ] Delivery log retention (30-day TTL cleanup job)

### 2.5 — `packages/billing`
- [ ] Migrate + enhance `src/lib/stripe.ts`
- [ ] Stripe Customer creation + management
- [ ] Subscription CRUD (create, update, cancel, resume)
- [ ] Metered billing: track API calls → Stripe meter events
- [ ] Tier definitions with limits:
  - Starter: 10K calls/mo, 2 seats, 5 scrape sources
  - Pro: 100K calls/mo, 10 seats, unlimited sources
  - Enterprise: unlimited, custom SLA, white-label
- [ ] Usage tracking: increment counters per API call
- [ ] Limit enforcement middleware: `requireWithinLimits()`
- [ ] 80% usage warning webhook trigger
- [ ] Stripe webhook handlers: invoice.paid, invoice.payment_failed, customer.subscription.updated/deleted
- [ ] Stripe Customer Portal session creation

### 2.6 — `packages/embeddings`
- [ ] Gemini text-embedding-004 client (768-dim vectors)
- [ ] Batch embedding: 100 chunks per API call
- [ ] Chunking strategies:
  - CV: split by experience / education / skills / summary sections
  - Job descriptions: requirements block + full JD
  - Visa rules: per process step + full document
- [ ] Embedding queue consumer: reads from `embed:process`, generates vectors, writes to DB
- [ ] Content hash comparison: skip re-embedding if SHA-256 unchanged
- [ ] Rate limiting: respect Gemini API quotas

### 2.7 — `packages/matching`
- [ ] Hybrid search: pgvector cosine similarity + Postgres tsvector text search
- [ ] Combined scoring algorithm (weighted blend)
- [ ] Match response:
  - Overall score (0-1)
  - Skills overlap percentage
  - Visa eligibility flag + sponsorship requirement
  - Location compatibility score
  - Seniority match score
  - Missing skills gap list
- [ ] Bulk matching: batch candidate evaluation against single job
- [ ] Migrate existing Gemini match logic from `src/lib/gemini.ts` as fallback/enhancement

### 2.8 — `packages/storage`
- [ ] MinIO client (S3-compatible SDK)
- [ ] Bucket management: `raw-html`, `screenshots`, `cv-documents`, `scrape-archives`
- [ ] Upload helpers with content-type detection
- [ ] Presigned URL generation (for temporary access)
- [ ] Archive key generation: `{org_id}/{scrape_job_id}/{timestamp}.{ext}`
- [ ] Cleanup utilities (TTL-based expiration)

**Deliverable:** All 8 packages built, tested, exported. Each has unit tests + TypeScript types.

---

## Phase 3 — VPS Infrastructure (Week 5)

**Goal:** Docker Compose with all 7 services running on VPS.

### 3.1 — Docker Compose Foundation
- [ ] `infra/docker/docker-compose.yml` with 7 services
- [ ] Shared Docker network (`recruitment-net`)
- [ ] Volume mounts for MinIO data persistence
- [ ] Environment variable management (`.env` files per service)
- [ ] Health checks on all services

### 3.2 — Service Dockerfiles

**scraper** (`apps/scraper/Dockerfile`):
- [ ] Node.js 22 + Playwright + Chromium
- [ ] Bright Data proxy SDK
- [ ] BullMQ consumer (listens to scrape queues)
- [ ] Exposes no HTTP port (queue-driven only)

**crawl4ai** (`apps/crawl4ai/Dockerfile`):
- [ ] Python 3.12 + Crawl4AI
- [ ] Gemini API for LLM extraction
- [ ] FastAPI HTTP endpoint for internal calls
- [ ] Port 8001 internal only

**worker** (`apps/worker/Dockerfile`):
- [ ] Node.js 22 + BullMQ
- [ ] Processes: embed:process, webhook:deliver queues
- [ ] Neon DB connection for vector writes
- [ ] Exposes no HTTP port (queue-driven only)

**scheduler** (`apps/scheduler/Dockerfile`):
- [ ] Node.js 22 + node-cron
- [ ] Reads scrape_jobs table, dispatches to BullMQ queues
- [ ] Runs cron checks every minute
- [ ] Exposes no HTTP port

**minio**:
- [ ] Official MinIO image
- [ ] Port 9000 (API) + 9001 (Console)
- [ ] Persistent volume mount
- [ ] Auto-create buckets on startup

**cowork-agent** (`apps/cowork-agent/Dockerfile`):
- [ ] Node.js 22 + Anthropic SDK + Playwright
- [ ] Claude Computer Use orchestration
- [ ] BullMQ consumer (high-priority queue, type=computer_use)
- [ ] Session recording to MinIO

**nginx** (`infra/nginx/`):
- [ ] Reverse proxy for bull-board dashboard
- [ ] SSL termination via Certbot (Let's Encrypt)
- [ ] Basic auth on admin endpoints
- [ ] Rate limiting on proxy endpoints

### 3.3 — Bright Data Integration
- [ ] Bright Data account setup + proxy zone configuration
- [ ] Geo-rotation pools: CH, DE, FR, US
- [ ] Scraping Browser WebSocket endpoint config
- [ ] `apps/scraper/src/proxy.ts`:
  - Connect via `browser.connect(BRIGHT_DATA_WS_ENDPOINT)`
  - Rate limiting: max 1 req/3s per domain
  - Randomised delays: 2-5s between actions
  - IP rotation on 403/429/CAPTCHA
  - Screenshot on failure → MinIO

### 3.4 — VPS Provisioning
- [ ] Ubuntu VPS setup (your existing 187.77.138.237 or new)
- [ ] Docker + Docker Compose installation
- [ ] Firewall rules (80, 443, 22 only)
- [ ] SSH key authentication
- [ ] Docker secrets for sensitive env vars
- [ ] Nginx + Certbot SSL setup

**Deliverable:** `docker compose up` brings all 7 services online. Health checks pass.

---

## Phase 4 — Scraping Pipeline (Weeks 6-7)

**Goal:** Three-tier scraping engine producing normalised data.

### 4.1 — Playwright Scraper (`apps/scraper/`)
- [ ] BullMQ consumer: `scrape:high`, `scrape:standard`, `scrape:low`
- [ ] Bright Data Scraping Browser connection
- [ ] Human-like behaviour module:
  - Randomised delays (2-5s)
  - Scroll simulation
  - Viewport randomisation (1280x720 → 1920x1080)
  - Mouse movement patterns
  - Session reuse with refresh logic
- [ ] Target extractors:
  - LinkedIn profiles → candidate data
  - LinkedIn jobs → job data
  - Xing profiles
  - GitHub profiles (public repos → skills inference)
  - Behance portfolios
  - Talent directories
- [ ] Anti-detection:
  - Geo-targeted proxy pool per target
  - On CAPTCHA/block: rotate IP, wait 30-120s, retry 3x
  - Screenshot on failure → MinIO
- [ ] Output: normalised JSON → embedding queue
- [ ] Scrape log: write to scrape_log table (duration, records, errors, archive key)

### 4.2 — Crawl4AI Service (`apps/crawl4ai/`)
- [ ] FastAPI service with `/crawl` endpoint
- [ ] Gemini LLM extraction prompts per page type:
  - Immigration portals (USCIS, SEM, IRCC, EU Blue Card sites)
  - Job boards
  - Government visa pages
- [ ] CSS/XPath selector fallback for stable structures
- [ ] Sitemap-aware crawling for immigration portals
- [ ] Markdown extraction for legal text → chunking pipeline
- [ ] Migrate existing `visa-scraper.ts` logic + SEED_DATA
- [ ] Change detection:
  - SHA-256 hash of normalised content
  - On change: diff fields → visa_rule_history → trigger webhook
- [ ] BullMQ integration via HTTP trigger from scheduler

### 4.3 — Claude Computer Use Agent (`apps/cowork-agent/`)
- [ ] Anthropic SDK + Computer Use API integration
- [ ] BullMQ consumer: `scrape:high` where type=computer_use
- [ ] Cowork project per scrape domain
- [ ] Capabilities:
  - Multi-step immigration portal forms
  - Paginated talent directories
  - Login-walled content navigation
  - Dynamic React/Angular SPA interaction
- [ ] Visual navigation when CSS selectors fail
- [ ] Output: structured JSON → normaliser → embedding queue
- [ ] Session recording to MinIO for audit trail
- [ ] Fallback: on timeout/failure, queue to Playwright scraper

### 4.4 — Normaliser + Deduplication
- [ ] Normalisation layer (shared across all scrapers):
  - Standardise field names, date formats, currency codes
  - Clean HTML entities, extra whitespace
  - Validate against Zod schemas
- [ ] Content hash: SHA-256 of normalised JSON
- [ ] Cross-tenant dedup: same source_url shared across orgs
  - Embedding computed once, referenced by org_id
  - If hash unchanged, skip re-embedding
- [ ] Write to embedding_queue on new/changed content

### 4.5 — Scheduler (`apps/scheduler/`)
- [ ] node-cron job dispatcher
- [ ] Every minute: query scrape_jobs WHERE next_run_at <= now() AND status != 'paused'
- [ ] Dispatch to appropriate BullMQ queue based on:
  - `scrape_type` → scraper service selection
  - `priority` → queue selection (high/standard/low)
- [ ] Update `next_run_at` based on `schedule_cron`
- [ ] Respect per-org scrape_sources_limit from subscription

**Deliverable:** Scraping pipeline processes URLs end-to-end. Data lands in Neon with embeddings.

---

## Phase 5 — Embedding Pipeline (Week 7)

**Goal:** Automated vector generation + hybrid search.

### 5.1 — Embedding Worker (`apps/worker/`)
- [ ] BullMQ consumer: `embed:process` queue
- [ ] On job received:
  1. Read record from DB (candidate/job/visa_rule)
  2. Chunk content using strategy from `packages/embeddings`
  3. Generate 768-dim vector via Gemini text-embedding-004
  4. Write vector to `embedding` column
  5. Update embedding_queue status
- [ ] Batch processing: accumulate up to 100 chunks, single API call
- [ ] Error handling: retry 3x, then mark failed + alert
- [ ] Backlog monitoring: alert if pending > 1000

### 5.2 — Hybrid Search Implementation
- [ ] `packages/matching/src/search.ts`:
  - pgvector cosine similarity query
  - Postgres tsvector full-text search
  - Combined weighted score
- [ ] Search filters: country, skills, experience, visa_status, salary range
- [ ] Cursor-based pagination on results
- [ ] Per-org RLS enforcement via `SET app.current_org_id`

### 5.3 — IVFFlat Index Tuning
- [ ] Create IVFFlat indexes after initial data load (need sufficient rows)
- [ ] candidates: `USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- [ ] jobs: same
- [ ] Monitor query performance, adjust `lists` parameter
- [ ] Add HNSW index option for comparison benchmarking

**Deliverable:** Search query returns ranked results with sub-200ms latency.

---

## Phase 6 — Enterprise API Layer (Weeks 8-9)

**Goal:** Versioned REST API with OpenAPI spec, full auth, rate limiting.

### 6.1 — API App Setup (`apps/api/` — extend existing Next.js app)
- [ ] New route group: `src/app/api/v1/` for enterprise endpoints
- [ ] Middleware chain: CORS → rate limit → auth → RLS context → handler
- [ ] Response envelope wrapper: `{ data, meta, errors }`
- [ ] Request-ID middleware (generate + propagate)
- [ ] Error handling middleware (Zod validation errors → 400, auth → 401/403, etc.)

### 6.2 — Auth Endpoints
- [ ] `POST /api/v1/auth/login` — email + password → JWT pair
- [ ] `POST /api/v1/auth/refresh` — refresh token → new JWT pair
- [ ] `POST /api/v1/auth/logout` — revoke session
- [ ] `POST /api/v1/auth/mfa/verify` — TOTP verification
- [ ] `GET  /api/v1/auth/sso/:provider` — SSO initiation
- [ ] `POST /api/v1/auth/sso/:provider/callback` — SSO callback

### 6.3 — Resource Endpoints
**Candidates:**
- [ ] `GET  /api/v1/candidates` — filtered list, cursor pagination
- [ ] `GET  /api/v1/candidates/:id` — single candidate
- [ ] `POST /api/v1/candidates/search` — semantic search {query, filters}

**Jobs:**
- [ ] `GET  /api/v1/jobs` — filtered list
- [ ] `GET  /api/v1/jobs/:id` — single job
- [ ] `POST /api/v1/jobs/search` — semantic search

**Visa Rules:**
- [ ] `GET  /api/v1/visa-rules?country=&visa_type=` — filtered list
- [ ] `GET  /api/v1/visa-rules/:id` — single rule
- [ ] `GET  /api/v1/visa-rules/:id/history` — change history

**Matching:**
- [ ] `POST /api/v1/match` — {candidate_id|cv_text, job_id} → match result
- [ ] `POST /api/v1/match/bulk` — {candidate_ids[], job_id} → ranked shortlist

**Webhooks:**
- [ ] `GET    /api/v1/webhooks` — list org webhooks
- [ ] `POST   /api/v1/webhooks` — create endpoint
- [ ] `PUT    /api/v1/webhooks/:id` — update endpoint
- [ ] `DELETE /api/v1/webhooks/:id` — delete endpoint
- [ ] `POST   /api/v1/webhooks/:id/test` — send test event

**Admin (superadmin):**
- [ ] `GET  /api/v1/admin/tenants` — list all orgs
- [ ] `POST /api/v1/admin/tenants/:id/suspend` — suspend org
- [ ] `GET  /api/v1/admin/usage` — global usage stats
- [ ] `GET  /api/v1/admin/queues` — BullMQ queue stats

### 6.4 — OpenAPI Spec
- [ ] zod-to-openapi for auto-generated spec
- [ ] Swagger UI at `/api/v1/docs`
- [ ] Auto-deploy spec on build
- [ ] SDK generation: TypeScript client from OpenAPI spec

### 6.5 — Rate Limiting
- [ ] Upstash Redis sliding window
- [ ] Per API key limits:
  - Starter: 100 req/min
  - Pro: 1000 req/min
  - Enterprise: custom (configurable per org)
- [ ] Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [ ] 429 response with Retry-After header

### 6.6 — Idempotency
- [ ] Idempotency-Key header on all POST endpoints
- [ ] Store in Redis with 24h TTL
- [ ] Return cached response on duplicate key

**Deliverable:** Full API with OpenAPI docs, auth, rate limiting. Postman collection for testing.

---

## Phase 7 — Multi-Tenant Onboarding (Week 10)

**Goal:** Tenant lifecycle from signup to first scrape.

### 7.1 — Tenant Provisioning Flow
1. [ ] Create organisation → generate org_id
2. [ ] Create owner user → initial JWT
3. [ ] Provision API keys (default: 1 key with all scopes)
4. [ ] Configure default webhook endpoints (optional)
5. [ ] Select Stripe plan → create subscription
6. [ ] Activate scrape sources (select from available list)
7. [ ] First scrape triggers automatically

### 7.2 — Tenant Management API
- [ ] `POST /api/v1/tenants` — create org (superadmin or self-serve)
- [ ] `GET  /api/v1/tenants/:id` — org details
- [ ] `PUT  /api/v1/tenants/:id` — update config (white-label, data residency)
- [ ] API key management: create, list, revoke, rotate
- [ ] Seat management: invite user, update role, remove

### 7.3 — White-Label Configuration
- [ ] Per-org config: logo_url, primary_color, company_name, custom_domain, favicon_url
- [ ] Apply to API responses where applicable
- [ ] Custom domain verification + SSL provisioning

### 7.4 — Data Residency
- [ ] Per-org data residency flag (eu/us/ch/any)
- [ ] Query routing based on residency preference
- [ ] Neon branch per residency region (future)

**Deliverable:** Tenant can self-serve signup, configure, and start receiving data.

---

## Phase 8 — Webhook System (Week 10)

**Goal:** Production webhook delivery with reliability guarantees.

### 8.1 — Event Bus
- [ ] Publish events from all services via BullMQ `webhook:deliver` queue
- [ ] Event types (12 total):
  - `visa_rule.created`, `visa_rule.updated`, `visa_rule.superseded`
  - `candidate.indexed`, `job.indexed`, `job.expired`
  - `match.completed`
  - `scrape.failed`
  - `billing.limit_reached`, `billing.limit_warning`
- [ ] Fan-out: per event, query all subscribed endpoints, create delivery job per endpoint

### 8.2 — Delivery Engine
- [ ] HMAC-SHA256 payload signing (X-Signature-256 header)
- [ ] Exponential backoff: 1min → 5min → 30min → 2h → 12h
- [ ] After 5 failures: disable endpoint
- [ ] Resend alert to tenant admin on disable
- [ ] Delivery logs: 30-day retention, auto-cleanup cron

### 8.3 — Webhook Testing
- [ ] `POST /api/v1/webhooks/:id/test` — send sample event
- [ ] Webhook delivery log viewer in admin API
- [ ] Manual retry endpoint for failed deliveries

**Deliverable:** Webhooks fire reliably with retry, signing, and audit trail.

---

## Phase 9 — Billing Integration (Week 11)

**Goal:** Metered billing, usage enforcement, self-serve management.

### 9.1 — Stripe Products + Prices
- [ ] Create Stripe products: Starter, Pro, Enterprise
- [ ] Metered add-ons: extra API calls, extra seats, on-demand scrapes
- [ ] Configure Stripe meters for usage-based billing

### 9.2 — Usage Tracking
- [ ] API middleware: log every request to api_usage table
- [ ] Sync to Stripe meters in near-real-time (batch every 5 min)
- [ ] Dashboard: current usage vs limits
- [ ] 80% threshold → `billing.limit_warning` webhook

### 9.3 — Enforcement
- [ ] Middleware: check org's subscription status + limits before processing
- [ ] Soft limit (warning) at 80%, hard limit at 100%
- [ ] Grace period: 24h after hard limit before blocking
- [ ] Downgrade handling: reduce limits, pause excess scrape sources

### 9.4 — Customer Portal
- [ ] Stripe Customer Portal for self-serve plan management
- [ ] Upgrade/downgrade flows
- [ ] Invoice history
- [ ] Payment method management

**Deliverable:** Billing tracks usage, enforces limits, syncs with Stripe automatically.

---

## Phase 10 — Observability & Security (Week 12)

**Goal:** Production monitoring, alerting, security hardening.

### 10.1 — Structured Logging
- [ ] pino logger across all services
- [ ] Log fields: `trace_id`, `tenant_id`, `request_id`, `service`, `level`
- [ ] JSON output for log aggregation
- [ ] Log levels: error, warn, info, debug (configurable per service)

### 10.2 — Sentry Integration
- [ ] Sentry projects: api, scraper, worker, scheduler, cowork-agent
- [ ] Error grouping by tenant + service
- [ ] Performance monitoring (transaction tracing)
- [ ] Source maps upload on deploy

### 10.3 — Checkly Monitoring
- [ ] Synthetic monitors:
  - `/api/v1/health` (every 1 min)
  - `/api/v1/candidates` (every 5 min, with auth)
  - `/api/v1/visa-rules` (every 5 min)
- [ ] Alerting: PagerDuty or Slack webhook

### 10.4 — Resend Alerts
- [ ] DLQ spike (>10 messages in 5 min)
- [ ] Embedding backlog >1000
- [ ] API error rate >1% (5 min window)
- [ ] Scrape failure streak >5 consecutive
- [ ] Subscription payment failure

### 10.5 — Security Hardening
- [ ] CORS: allowlist of known origins
- [ ] CSP headers on all responses
- [ ] HSTS with 1-year max-age
- [ ] X-Content-Type-Options: nosniff
- [ ] API keys: plaintext never logged or returned after creation
- [ ] GDPR compliance:
  - Public data only, no PII contact scraping
  - Soft-delete + 30-day purge job
  - Per-tenant data residency flag
  - Data export endpoint for tenant
  - Data deletion endpoint (right to erasure)

**Deliverable:** Full observability stack. Alerts fire correctly. Security headers on all responses.

---

## Phase 11 — CI/CD Pipeline (Week 12)

**Goal:** Automated testing, building, and deployment.

### 11.1 — GitHub Actions: PR Workflow
```yaml
on: pull_request
jobs:
  - lint (ESLint + Prettier)
  - typecheck (tsc --noEmit per package)
  - unit-tests (Jest per package)
  - integration-tests (against Neon staging branch)
  - docker-build (verify all Dockerfiles build)
```

### 11.2 — GitHub Actions: Deploy Workflow
```yaml
on: push to main
jobs:
  1. Vercel deploy (apps/api) → preview URL
  2. Docker build + push → GitHub Container Registry
  3. SSH to VPS → docker compose pull → rolling restart
  4. Drizzle migrate on Neon production
  5. Checkly smoke tests
  6. Sentry release notification
```

### 11.3 — Staging Environment
- [ ] Neon staging branch (auto-created on PR)
- [ ] Vercel preview deployment per PR
- [ ] VPS staging: separate docker-compose with staging env vars

### 11.4 — Rollback Strategy
- [ ] Docker image tags: git SHA + `latest`
- [ ] VPS: `docker compose up -d --no-deps <service>` for individual rollback
- [ ] Neon: branch reset for DB rollback
- [ ] Vercel: instant rollback via dashboard

**Deliverable:** PR → automated checks. Merge → auto-deploy everywhere.

---

## Phase 12 — Integration Testing & Hardening (Week 13)

**Goal:** End-to-end flows work reliably.

### 12.1 — E2E Test Scenarios
- [ ] Tenant onboarding → API key → first scrape → data appears
- [ ] Scrape pipeline: URL → Playwright → normalise → embed → searchable
- [ ] Scrape pipeline: URL → Crawl4AI → normalise → embed → searchable
- [ ] Match flow: candidate search → match scoring → webhook delivery
- [ ] Visa rule change detection → history → webhook
- [ ] Billing: upgrade tier → limits increase → usage tracking
- [ ] Webhook: create → test → delivery → retry on failure → disable

### 12.2 — Load Testing
- [ ] k6 or Artillery load tests on API endpoints
- [ ] Target: 100 concurrent users, <200ms p95 latency
- [ ] Queue throughput: 1000 scrape jobs/hour
- [ ] Embedding throughput: 10,000 chunks/hour

### 12.3 — Failure Scenarios
- [ ] Redis down → graceful degradation
- [ ] Neon connection loss → retry with backoff
- [ ] MinIO unavailable → scrape continues, archive fails gracefully
- [ ] Bright Data proxy exhausted → failover to direct connection
- [ ] Gemini API rate limit → queue backpressure

### 12.4 — Data Integrity Verification
- [ ] Cross-tenant isolation: org A cannot read org B's data
- [ ] RLS policy audit: attempt bypass via direct SQL
- [ ] API key scope enforcement: scoped key cannot access out-of-scope endpoints
- [ ] Embedding consistency: re-embed same content → same vector

**Deliverable:** All E2E tests pass. Load test meets targets. Failure scenarios handled.

---

## Timeline Summary

| Phase | Name | Duration | Dependencies |
|-------|------|----------|-------------|
| 0 | Monorepo Foundation | Week 1 | None |
| 1 | Database & Schema | Week 2 | Phase 0 |
| 2 | Core Packages | Weeks 3-4 | Phase 1 |
| 3 | VPS Infrastructure | Week 5 | Phase 0 |
| 4 | Scraping Pipeline | Weeks 6-7 | Phases 2, 3 |
| 5 | Embedding Pipeline | Week 7 | Phase 2 |
| 6 | Enterprise API | Weeks 8-9 | Phases 2, 5 |
| 7 | Multi-Tenant Onboarding | Week 10 | Phase 6 |
| 8 | Webhook System | Week 10 | Phases 2, 6 |
| 9 | Billing Integration | Week 11 | Phases 6, 7 |
| 10 | Observability & Security | Week 12 | Phase 6 |
| 11 | CI/CD Pipeline | Week 12 | Phase 3 |
| 12 | Integration & Hardening | Week 13 | All |

**Total: 13 weeks to production-ready enterprise platform.**

Phases 3-5 can partially overlap with Phase 2 (infrastructure while packages are being built).
Phases 7-11 can be parallelized across team members.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| LinkedIn blocks scraping | High | Bright Data residential proxies + human-like behaviour + rate limiting |
| Claude Computer Use costs too high | Medium | Reserve for truly complex flows, optimize Playwright for 95% of cases |
| Neon cold start latency | Medium | Use Neon pooler, keep connections warm, consider provisioned compute |
| Single VPS is SPOF | High | Daily backups, MinIO replication, docker image versioning for quick recovery |
| Gemini API rate limits | Medium | Batch embedding calls, local queue backpressure, fallback to OpenAI embeddings |
| GDPR compliance gaps | High | Public data only, audit trail, data residency flags, deletion pipeline |
| Scope creep on scraper targets | Medium | Start with 5 sources, add incrementally based on tenant demand |

---

## Quick Wins (Can Start Immediately)

1. **Commit existing untracked files** — packages/db, billing API, recruiter API, etc.
2. **Complete the Drizzle schema gaps** — add missing fields identified in audit
3. **Set up pnpm workspaces** — minimal config, don't move files yet
4. **Create Neon project** — staging + production branches
5. **Run Drizzle migrations** on Neon staging
