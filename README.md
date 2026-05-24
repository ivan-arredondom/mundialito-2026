# Mundialito 2026

A FIFA World Cup 2026 score prediction pool for a group of friends in San Diego. Built to replicate the experience of [mundialsd.com](https://mundialsd.com).

**Live:** [mundialito-2026.vercel.app](https://mundialito-2026.vercel.app)

---

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + Geist / Geist Mono fonts
- **Supabase** — Postgres + Auth + Realtime + Edge Functions
- **Netlify** — deployment + scheduled cron for results sync

---

## Features

- **Auth** — signup, login, forgot/reset password
- **Bracket editor** — group stage score predictions with `[−] n [+]` steppers; knockout winner picks per round; auto-save on every tap; view by group (accordion) or by matchday; live predicted standings strip per group showing who advances
- **Sticky stage header** — chevron breadcrumb across all 7 stages with per-stage pick counts and progress fill
- **Schedule** — all 104 matches with local kickoff times, group + knockout tabs, flags, 3-letter team codes
- **Live scoring** — in-progress match overlays (period, minute, score) via Supabase Realtime; fed by a Supabase Edge Function that runs every 15 min during the tournament
- **Leaderboard** — group tab with per-group ranking + global tab across all paid groups
- **Prize pool** — entry fee, per-person or per-bracket, configurable platform fee %, prize splits editor; dedicated `/prizes` page
- **PWA** — web app manifest, add-to-home-screen guide (iOS + Android), bottom nav bar on mobile
- **Share** — invite pill on leaderboard that copies invite code or deep link; pre-fills group code on signup
- **Admin panel** — global settings, groups CRUD, user management, results sync trigger
- **Mod panel** — member management (promote/demote, mark paid, remove), prize settings per group

---

## Local Development

```bash
npm install
cp .env.local.example .env.local   # fill in the vars below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required env vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_POOL_LOCK_AT=2026-06-11T00:00:00Z
FOOTBALL_DATA_API_KEY
SYNC_SECRET
```

---

## Database

Migrations live in `supabase/migrations/`. Run them in order in the Supabase SQL editor.

| Migration | What it adds |
|---|---|
| 0001_init | Core schema + RLS |
| 0002_scoring | Scoring functions + leaderboard view |
| 0003_bracket_structure | Match connectivity + knockout_winner_picks |
| 0004_scoring_v2 | Rewritten scoring from knockout_winner_picks |
| 0005_groups | Groups + group_memberships + signup trigger |
| 0007_admin | is_admin / is_global_mod + app_settings |
| 0008_group_settings | max_brackets_per_user + max_members |
| 0009_payment | paid boolean on group_memberships |
| 0010_prizes | entry_fee, fee_per, platform_fee_pct, prize_splits |
| 0011_group_visibility | show_in_global boolean on groups |
| 0012_match_scores | Live scores table + Realtime |

Seed teams + fixtures (run once, or after any team change):

```
POST /api/admin/seed
x-sync-secret: <SYNC_SECRET>
```

---

## Scoring

| Scenario | Points |
|---|---|
| Exact group stage score | 5 |
| Correct result (W/D/L) | 3 |
| R32 / R16 correct pick | 3 |
| QF / SF correct pick | 5 |
| 3rd place correct pick | 3 |
| Final: reach + champion | 5 + 5 |

---

## Key Directories

```
app/                        # Next.js App Router pages + API routes
  brackets/[id]/            # Bracket editor (stage-header, group-predictions, knockout-picker)
  dashboard/                # My brackets list
  leaderboard/              # Group + global tabs
  prizes/                   # Prize pool page
  admin/                    # Admin panel
  mod/                      # Mod panel
  api/                      # Server-side API routes
components/                 # Shared UI (nav, countdown, toast, save-indicator, …)
lib/                        # Shared logic (standings, scoring, bracket structure, flags, …)
supabase/
  migrations/               # SQL migrations
  functions/sync-scores/    # Edge Function — live scores (BSD primary, FD fallback)
netlify/functions/          # Netlify scheduled function — hourly results sync
```

---

## Deployment

Deployed on Vercel (primary) with Netlify as the cron host for hourly results sync. Set all env vars in both platforms. The Supabase Edge Function (`sync-scores`) runs on pg_cron every 15 minutes from June 11 – July 19 2026 and is already scheduled via `supabase/cron_setup.sql`.
