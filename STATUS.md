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
- **Bracket editor** — group score predictions + knockout winner picks, TBD resolution, conflict detection, auto-save, kickoff countdown per match, quick-pick 0–3 buttons on mobile
- **Dashboard** — create/delete brackets, rank/points/exact stats
- **Schedule** — all 104 matches with local kickoff times, two tabs (Group Stage / Knockouts), flags
- **Leaderboard** — group-scoped ranking; all members shown (even with 0 brackets); no-submission section at bottom
- **Admin panel** — global settings, groups CRUD, user management (admin/global-mod toggles), users grouped by group with collapsible sections
- **Mod panel** — group member management (promote/demote, remove, mark paid/unpaid); global mods see all groups, group mods see their own
- **Results sync** — `/api/results/sync` (POST, protected by `SYNC_SECRET`); Netlify cron runs every hour
- **Data reset** — `/api/admin/seed` (POST, same secret) — wipes and re-seeds all teams + matches from API; safe to re-run

---

## What's Next

### Immediate (in order)

- **Netlify deploy** — push to GitHub → netlify.com → import project; build auto-detected from `netlify.toml`; add all env vars; add Netlify URL to Supabase Auth redirect URLs

### Backlog

- Payment tracking — `paid` column exists on `group_memberships` (migration 0009), mods can toggle it per member; still TODO: exclude unpaid from prize rankings
- Prize pool computation (55/30/15% split, 9% fee)
- Live score sync not possible on free football-data.org tier — results will be manual or hourly batch only
- Results page (low priority)
- Group mods setting per-user bracket limits per-group (currently global only)

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
