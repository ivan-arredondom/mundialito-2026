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
  brackets/[id]/group-predictions.tsx  # Group stage grid (flag + score inputs + kickoff countdown)
  brackets/[id]/knockout-picker.tsx    # Knockout per-match cards (flag + pick buttons)
  schedule/page.tsx                 # Match schedule (NEEDS REDESIGN)
  results/page.tsx                  # Finished matches (low priority)
  leaderboard/page.tsx              # Global leaderboard (NEEDS IMPROVEMENTS)
  api/brackets/create/route.ts      # POST — create bracket for authed user
  api/results/sync/route.ts         # POST — football-data.org results ingest (hourly cron)
  api/admin/seed/route.ts           # POST — full reset + re-seed from football-data.org API
lib/
  supabase/client.ts                # Browser Supabase client
  supabase/server.ts                # Server Supabase client
  lock.ts                           # POOL_LOCK_AT, isLocked()
  scoring.ts                        # STAGE_POINTS, scoreGroupMatch (JS mirror of SQL)
  football-data.ts                  # fetchWC2026Matches(), fetchWC2026Teams()
  bracket-structure.ts              # R32_SLOTS, KNOCKOUT_FEEDS, KNOCKOUT_STAGES, THIRD_MATCH_NUMBER, GROUP_CODES
  standings.ts                      # Pure TS: predictGroupStandings, predictBestThirds, resolveSlot, resolveKnockoutTeams, findConflicts
  flags.ts                          # flagSrc(teamCode) → flagcdn.com URL for all 48 real WC2026 codes
components/
  nav.tsx                           # Top nav (auth-aware)
  countdown.tsx                     # Default: big 4-block; CountdownText: compact banner text
  local-time.tsx                    # Timezone-aware time display (safe SSR/hydration pattern)
  save-indicator.tsx                # idle/saving/saved with 2s auto-reset
  toast.tsx                         # Dismissible red fixed-position banner
supabase/
  migrations/0001_init.sql          # Core schema + RLS
  migrations/0002_scoring.sql       # Scoring functions + leaderboard view
  migrations/0003_bracket_structure.sql  # match connectivity + knockout_winner_picks
  migrations/0004_scoring_v2.sql    # Rewritten scoring from knockout_winner_picks
  seed/matches.sql                  # Original placeholder fixtures (superseded by /api/admin/seed)
  seed/bracket_connectivity.sql     # Reference for slot/feed logic (now inlined in seed route)
netlify/
  functions/sync-results.mts        # Netlify scheduled function — calls /api/results/sync every hour
netlify.toml                        # Build config (command + @netlify/plugin-nextjs)
images/UI inspiration/              # group.png, R32.png, R16.png, QF.png, SF.png, 3rd.png, Final.png, submissions.png
```

---

## Database Schema (live)

- `profiles` — auto-created on signup via trigger, stores `display_name`
- `teams` — 48 real WC2026 qualified teams; `code` matches football-data.org TLA; `flag_url` unused by UI
- `matches` — 104 total: 72 GROUP + 32 knockout; `match_number` (1–104), `slot_a/b` (R32 only), `feed_a/b_match_id` (R16+); `external_id` = football-data.org match ID
- `brackets` — one user can have many named brackets
- `score_predictions` — per-bracket score pick for each group-stage match
- `knockout_winner_picks` — per-bracket per-match winner pick for knockout rounds
- `bracket_scores` — cached point totals; refreshed by DB trigger on result update or pick change
- `leaderboard` view — ranks all brackets by points

RLS enabled on all sensitive tables; `teams` and `matches` are public read.

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
- Read `node_modules/next/dist/docs/` before using unfamiliar APIs

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
