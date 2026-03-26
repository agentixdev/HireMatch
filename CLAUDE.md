# HireMatch — Project Instructions

## Overview
AI-powered recruitment platform. Two-sided marketplace: job seekers (candidates) and recruiters (employers).
Matchmaker quiz + AI CV parsing + visa compliance across 29 countries.

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS
- Supabase (auth + DB + storage)
- Gemini 2.5 Flash (CV parsing, JD parsing, match scoring)
- Stripe (recruiter billing)
- next-intl (i18n — 20 locales)
- Vercel hosting

## Key Architecture
- `src/app/[locale]/` — all pages use next-intl locale routing
- `src/lib/gemini.ts` — AI functions (CV parse, JD parse, match)
- `src/lib/supabase.ts` — browser client
- `src/lib/supabase-server.ts` — server client + service client
- `src/lib/webhooks.ts` — ATS webhook delivery
- `src/types/index.ts` — all TypeScript types
- `supabase/migrations/` — SQL migrations
- `messages/` — i18n JSON files per locale
- VPS scraper for visa data runs on 187.77.138.237 (agent-browser)

## Monetization
- Candidates: always free
- Recruiters: free (3 jobs, 10 views) → Pro $99/mo → Enterprise $499/mo → Agency $999/mo

## Countries (29)
US, CA, GB, CH, DE, FR, ES, IT, NL, BE, AT, PT, IE, SE, DK, NO, FI, PL, CZ, RO, IN, MX, BR, AR, CN, JP, KR, VN, PH

## Deploy
- Vercel Git integration (auto-deploy on push to master)
- Repo: github.com/agentixdev/HireMatch
