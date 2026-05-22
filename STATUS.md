# Mundialito 2026 — Project Status

**Last updated:** 2026-05-22  
**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + Supabase (Auth + Postgres)  
**Supabase:** `https://ksozjzzsivsopgnnczay.supabase.co`  
**Goal:** FIFA World Cup 2026 score prediction pool for San Diego friends (replicating mundialsd.com).

> For file structure, component specs, and implementation gotchas → see `CODEBASE.md`

---

## Current State

All core features are built and wired to live Supabase data:

- **Auth** — login, signup, forgot/reset password (all working)
- **Database** — 48 real WC2026 teams, 104 real fixtures (72 group + 32 knockout) seeded from football-data.org via `/api/admin/seed`
- **Bracket editor** — group score predictions + knockout winner picks, TBD resolution, conflict detection, auto-save, kickoff countdown per match
- **Dashboard** — create/delete brackets, rank/points/exact stats
- **Schedule** — all 104 matches with local kickoff times
- **Leaderboard** — global ranking
- **Results sync** — `/api/results/sync` (POST, protected by `SYNC_SECRET`); Netlify cron runs every hour
- **Data reset** — `/api/admin/seed` (POST, same secret) — wipes and re-seeds all teams + matches from API; safe to re-run

---

## What's Next

### Immediate (in order)

- **Admin portal — users section** — group users by their group (collapsible per group, ungrouped users in their own section)
- **Schedule page redesign** — two tabs (Group Stage / Knockouts), card layout with flags + local times; reference `images/UI inspiration/`
- improve mobile bracket editor layout
- **Git initial commit** — `git add -A && git commit -m "Initial commit — Mundialito 2026 MVP"` (`.env.local` is gitignored ✓)
- **Netlify deploy** — push to GitHub → netlify.com → import project; build auto-detected from `netlify.toml`; add all env vars; add Netlify URL to Supabase Auth redirect URLs

### Recently completed
- **Mod nav tab** — `/mod` page created; `is_global_mod` users see "Mod" link, `is_admin` users see "Admin" link (split from single `isPrivileged` flag)
- **Nav privilege badge flicker fix** — profile now re-fetched inside `onAuthStateChange` so links appear immediately after login
- **Leaderboard** — group members always shown (even with 0 brackets/points); medal icons for top 3; bracket count per user; falls back to global view if not in a group
- **Mobile responsiveness** — hamburger nav, responsive hero, schedule row layout reworked, dashboard form stacks on mobile, group predictions time column hidden on small screens

### Backlog

- Payment tracking / paid bracket status (Venmo $50 flow)
- Prize pool computation (55/30/15% split, 9% fee)
- EXACT score count on dashboard (needs live match results)
- **Admin portal — remaining subsystem items:**
  - Group mods [Medium-Hard] — `role` in `group_memberships`; mods set per-user limits, approve paid status
  - Payment approval gate [Medium-Hard] — `paid` boolean on `group_memberships`; excludes unpaid from prize rankings

---

## Env Vars (needed in `.env.local` AND Netlify)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_POOL_LOCK_AT=2026-06-11T00:00:00Z
FOOTBALL_DATA_API_KEY          ← set ✓ (also add to Netlify before deploy)
SYNC_SECRET                    ← set ✓ (also add to Netlify)
DB_PASSWORD                    ← local migration script only, skip in Netlify
```

**Note:** `POOL_LOCK_AT` (midnight UTC Jun 11) is the pick lock — 19h before the first actual kickoff (7 PM UTC Jun 11, MEX vs RSA). This is intentional.
