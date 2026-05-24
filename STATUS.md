# Mundialito 2026 — Project Status

**Last updated:** 2026-05-23  
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
- **Schedule** — all 104 matches with local kickoff times, two tabs (Group Stage / Knockouts), flags, 3-letter team codes on mobile
- **Leaderboard** — group tab (per-group ranking, stacks multiple groups if in more than one) + Global tab (all paid groups, admin-controllable visibility); no-submission section
- **Prize pool** — entry fee, per-person or per-bracket, platform fee % (admin-only, max 10%), prize splits editor in mod panel; dedicated `/prizes` page; paid-only rankings; stacks multiple groups
- **Admin panel** — global settings, groups CRUD (show_in_global toggle, platform fee), user management, users grouped by group; Join button to enter any group; Sync Results button
- **Mod panel** — group member management (promote/demote, remove, mark paid/unpaid); prize settings (entry fee, fee_per, splits); global mods see all groups, group mods see their own
- **Results sync** — `/api/results/sync` (POST, protected by `SYNC_SECRET`); Netlify cron runs every hour; manual Sync button in admin panel
- **Data reset** — `/api/admin/seed` (POST, same secret) — wipes and re-seeds all teams + matches from API; safe to re-run
- **PWA** — web app manifest, add-to-home-screen guide (iOS + Android), bottom navigation bar on mobile
- **Multi-group membership** — admin can join multiple groups via admin panel; leaderboard and prizes stack all groups for multi-group users

---

## Pending Migrations

Run these in Supabase SQL editor if not already done:

- `0009_payment.sql` — adds `paid boolean` to `group_memberships`
- `0010_prizes.sql` — adds `entry_fee`, `fee_per`, `platform_fee_pct`, `prize_splits` to `groups`
- `0011_group_visibility.sql` — adds `show_in_global boolean` to `groups`

---

## What's Next

### Immediate (in order)

- **Netlify deploy** — push to GitHub → netlify.com → import project; build auto-detected from `netlify.toml`; add all env vars; add Netlify URL to Supabase Auth redirect URLs

### Backlog

- Results sync fallback provider — primary is football-data.org; considering bzzoiro.com as fallback for live scores (need to verify their match/score endpoints)
- Results page (low priority)
- Group mods setting per-user bracket limits per-group (currently global only)
- Multi-group for regular users — DB supports it (composite PK), but signup only allows one group; would need post-signup join flow + UI audit

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
