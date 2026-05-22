# Mundialito 2026 — Codebase Reference

> Quick-start context for new sessions. See `STATUS.md` for current state and TODOs.

---

## Key Files

```
app/
  page.tsx                          # Landing page (red/gold hero, countdown, points table)
  (auth)/login/page.tsx             # Login — eye icon + forgot-password link
  (auth)/signup/page.tsx            # Signup — eye icon on password
  (auth)/forgot-password/page.tsx   # Forgot password
  (auth)/reset-password/page.tsx    # Reset password (via magic link)
  dashboard/page.tsx                # Server shell — loads brackets + leaderboard
  dashboard/submissions-client.tsx  # Client — YOUR SUBMISSIONS UI (create/delete/list)
  brackets/[id]/page.tsx            # Server shell — loads all bracket data
  brackets/[id]/bracket-editor.tsx  # Client root — tab bar, progress bars, state owner
  brackets/[id]/group-predictions.tsx  # Group stage grid (flag + score inputs + 0-3 quick-pick buttons)
  brackets/[id]/knockout-picker.tsx    # Knockout per-match cards (flag + pick buttons)
  schedule/page.tsx                 # Two-tab schedule (Group Stage / Knockouts), flags, local times
  results/page.tsx                  # Finished matches (low priority)
  leaderboard/page.tsx              # Group-scoped leaderboard; all members shown; no-submission section
  admin/page.tsx                    # Server shell — admin-only guard
  admin/admin-client.tsx            # Admin UI — settings, groups CRUD, users grouped by group
  mod/page.tsx                      # Server shell — loads groups for current mod
  mod/mod-client.tsx                # Mod UI — collapsible group cards, member promote/demote/remove
  api/brackets/create/route.ts      # POST — create bracket for authed user
  api/results/sync/route.ts         # POST — football-data.org results ingest (hourly cron)
  api/admin/seed/route.ts           # POST — full reset + re-seed from football-data.org API
  api/admin/settings/route.ts       # PATCH — update app_settings
  api/admin/groups/route.ts         # GET/POST/PATCH/DELETE — group management
  api/admin/members/route.ts        # GET/PATCH/DELETE — group member management (admin only)
  api/admin/users/route.ts          # GET/PATCH/DELETE — user management (admin only)
  api/mod/members/route.ts          # GET/PATCH/DELETE — group member management (mod or admin)
lib/
  supabase/client.ts                # Browser Supabase client
  supabase/server.ts                # Server Supabase client (cookie-based, for server components + API routes)
  supabase/admin.ts                 # createAdminClient() — service role, bypasses RLS
  require-role.ts                   # requireAdmin() / requireMod() — server-side auth guards with redirect
  lock.ts                           # POOL_LOCK_AT, isLocked()
  scoring.ts                        # STAGE_POINTS, scoreGroupMatch (JS mirror of SQL)
  football-data.ts                  # fetchWC2026Matches(), fetchWC2026Teams()
  bracket-structure.ts              # R32_SLOTS, KNOCKOUT_FEEDS, KNOCKOUT_STAGES, THIRD_MATCH_NUMBER, GROUP_CODES
  standings.ts                      # Pure TS: predictGroupStandings, predictBestThirds, resolveSlot, resolveKnockoutTeams, findConflicts
  flags.ts                          # flagSrc(teamCode) → flagcdn.com URL for all 48 real WC2026 codes
components/
  nav.tsx                           # Top nav — auth-aware, hamburger on mobile, Mod/Admin links by role
  countdown.tsx                     # Default: big 4-block; CountdownText: compact banner text
  local-time.tsx                    # Timezone-aware time display (safe SSR/hydration pattern)
  save-indicator.tsx                # idle/saving/saved with 2s auto-reset
  toast.tsx                         # Dismissible red fixed-position banner
supabase/
  migrations/0001_init.sql          # Core schema + RLS
  migrations/0002_scoring.sql       # Scoring functions + leaderboard view
  migrations/0003_bracket_structure.sql  # match connectivity + knockout_winner_picks
  migrations/0004_scoring_v2.sql    # Rewritten scoring from knockout_winner_picks
  migrations/0005_groups.sql        # groups + group_memberships tables + handle_new_user trigger update
  migrations/0007_admin.sql         # is_admin / is_global_mod on profiles + app_settings table
  migrations/0008_group_settings.sql  # max_brackets_per_user + max_members on groups
  seed/matches.sql                  # Original placeholder fixtures (superseded by /api/admin/seed)
netlify/
  functions/sync-results.mts        # Netlify scheduled function — calls /api/results/sync every hour
netlify.toml                        # Build config (command + @netlify/plugin-nextjs)
images/UI inspiration/              # group.png, R32.png, R16.png, QF.png, SF.png, 3rd.png, Final.png, submissions.png
```

---

## Database Schema (live)

- `profiles` — auto-created on signup via trigger; `display_name`, `is_admin`, `is_global_mod`
- `teams` — 48 real WC2026 qualified teams; `code` matches football-data.org TLA; `flag_url` unused by UI
- `matches` — 104 total: 72 GROUP + 32 knockout; `match_number` (1–104), `slot_a/b` (R32 only), `feed_a/b_match_id` (R16+); `external_id` = football-data.org match ID
- `brackets` — one user can have many named brackets
- `score_predictions` — per-bracket score pick for each group-stage match
- `knockout_winner_picks` — per-bracket per-match winner pick for knockout rounds
- `bracket_scores` — cached point totals; refreshed by DB trigger on result update or pick change
- `groups` — created by admins; `code` is the invite code users enter at signup
- `group_memberships` — `(group_id, user_id, role)` where role is `'member'` or `'mod'`; auto-inserted on signup if a valid `group_code` is in user metadata
- `app_settings` — single-row config: `allow_registrations`, `max_brackets_per_user`
- `leaderboard` view — ranks all brackets by points

RLS enabled on all sensitive tables; `teams`, `matches`, `groups`, and `app_settings` are public read. `group_memberships` is readable by the member themselves only — use `createAdminClient()` to read other members.

---

## Scoring

- Group stage: exact score = **5 pts**, correct result (W/D/L) = **3 pts**
- Knockout per-match picks: R32 = 3 pts, R16 = 3 pts, QF = 5 pts, SF = 5 pts, THIRD = 3 pts, FINAL = 5 pts reach + 5 pts champion = **10 pts**
- SQL: `compute_bracket_points(bracket_id)` in migration 0004
- JS mirror: `lib/scoring.ts`

---

## Team Codes (real WC2026 qualifiers)

football-data.org TLA codes used throughout the codebase:

| Confederation | Codes |
|---|---|
| CONCACAF | USA, MEX, CAN, PAN, HAI, CUW |
| CONMEBOL | ARG, BRA, URY, COL, ECU, PAR |
| UEFA | FRA, ESP, ENG, GER, POR, NED, BEL, CRO, TUR, CZE, AUT, NOR, SUI, SWE, SCO, BIH |
| AFC | JPN, KOR, IRN, IRQ, KSA, QAT, AUS, NZL, JOR, UZB |
| CAF | MAR, SEN, EGY, CIV, RSA, GHA, ALG, COD, TUN, CPV |

**TLA alias:** matches API uses `CUR` for Curaçao; teams API uses `CUW`. The seed route maps `CUR → CUW`.

---

## Data Pipeline

### `/api/admin/seed` (full reset — run once or after team changes)
1. Deletes score_predictions, knockout_winner_picks, bracket_scores, all matches, all teams
2. Fetches 48 real teams from football-data.org → inserts with correct group codes
3. Fetches 72 group stage matches → inserts with real team IDs + kickoff times
4. Assigns group match_numbers 1–72 (sorted by group_code then kickoff_at)
5. Fetches 32 knockout matches → inserts in stage order (R32→FINAL), assigns match_numbers 73–104
6. Sets R32 slot_a/slot_b (FIFA bracket draw order)
7. Sets feed_a/b_match_id for R16, QF, SF, THIRD, FINAL using match_number → db_id map

### `/api/results/sync` (hourly, updates scores)
- Protected by `x-sync-secret` header
- For GROUP matches: finds existing row by home_team_id + away_team_id, updates kickoff_at + scores
- For knockout matches: upserts by external_id

---

## Implementation Notes

### Next.js 16 specifics
- `params` is a Promise: `async function Page({ params }: { params: Promise<{ id: string }> })` → `const { id } = await params`
- Same for `searchParams`: `{ searchParams: Promise<{ tab?: string }> }` → `const { tab } = await searchParams`
- Read `node_modules/next/dist/docs/` before using unfamiliar APIs

### Admin / Mod authorization pattern
- **Server components**: use `requireAdmin()` or `requireMod()` from `lib/require-role.ts` — redirects if unauthorized
- **API routes**: define a local `assertAdmin()` or `assertGroupMod(groupId)` that returns `user | null`; check at the top of each handler
- **`createAdminClient()`** from `lib/supabase/admin.ts` uses the service role key and bypasses RLS — use for all cross-user data reads/writes in API routes and server components
- **`requireMod()`** allows: `is_admin`, `is_global_mod`, OR `role: 'mod'` in any group membership
- **Nav Mod link**: shown when `is_global_mod` OR group membership `role === 'mod'`

### RLS and pre-tournament data access
- `brackets` are RLS-protected and only publicly readable after the lock date — use `createAdminClient()` on the leaderboard page to read brackets before June 11
- `group_memberships` is readable only by the member themselves — use `createAdminClient()` in API routes to read other members of a group

### Supabase FK joins
- FK joins (e.g. `home_team:teams!matches_home_team_id_fkey(...)`) are inferred as arrays by TypeScript but return single objects at runtime.
- Cast: `(raw ?? []) as unknown as Array<{ home_team: {...}; away_team: {...} }>`
- Always guard: `m.home_team && m.away_team` before accessing properties — join returns null if FK is null.

### Flag images
- Flag emojis do NOT render on Windows — always use `flagSrc(teamCode)` from `lib/flags.ts` → `flagcdn.com` CDN `<img>`
- `flag_url` column in `teams` is unused by UI

### Standings computation
- `predictGroupStandings` takes `ScorePrediction[]` (match_id, home_score, away_score)
- `resolveKnockoutTeams` handles THIRD (match #103) using SF losers, not winners
- `findConflicts` needs the complete `winnerPicks` record across all stages

### TypeScript: KNOCKOUT_STAGES
- `KNOCKOUT_STAGES` is `as const` — use `(stage.matchNumbers as readonly number[]).includes(n)`

### bracket-editor.tsx tab → stage mapping
- Tab keys: `'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'FINAL'`
- `KNOCKOUT_STAGES` uses `'THIRD'` (not `'3RD'`) — editor maps `activeTab === '3RD'` → `s.key === 'THIRD'`

### Countdown vs lock time
- `POOL_LOCK_AT = 2026-06-11T00:00:00Z` (midnight UTC) — when picks lock
- First match: MEX vs RSA at `2026-06-11T19:00:00Z` — 19h after lock. Intentional.
