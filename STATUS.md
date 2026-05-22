# Mundialito 2026 — Project Status

**Last updated:** 2026-05-21  
**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + Supabase (Auth + Postgres)  
**Repo:** `c:\Users\Jesus\Documents\GitHub\mundialito-2026`  
**Goal:** Replicate mundialsd.com — a FIFA World Cup 2026 score prediction pool for San Diego friends.

---

## What Has Been Built

### Infrastructure
- Next.js 16 app scaffolded with TypeScript + Tailwind, builds cleanly (`npm run build` passes)
- Supabase project connected: `https://ksozjzzsivsopgnnczay.supabase.co`
- `.env.local` has all keys wired up (URL, anon key, service role key, DB password)
- All migrations and seeds have been run successfully in Supabase SQL Editor

### Database (live in Supabase — current schema)
- `profiles` — auto-created on signup via trigger, stores `display_name`
- `teams` — 48 WC2026 teams seeded across Groups A–L, `flag_url` column populated with emoji (not used by UI — UI uses `lib/flags.ts` CDN images instead)
- `matches` — 104 total: 72 group-stage + 32 knockout; includes `match_number`, `slot_a`, `slot_b`, `feed_a_match_id`, `feed_b_match_id` (from migration 0003); backfilled by `bracket_connectivity.sql`
- `brackets` — one user can have many named brackets
- `score_predictions` — per-bracket score pick for each group-stage match
- `knockout_winner_picks` — per-bracket per-match winner pick for knockout rounds (replaced `advancement_predictions`)
- `bracket_scores` — cached point totals, refreshed by DB trigger on match result update or pick change
- `leaderboard` view — ranks all brackets by points
- RLS enabled on all sensitive tables; teams/matches are public read

### Scoring engine (DB + JS mirror)
- Group stage: exact score = **5 pts**, correct result (W/D/L) = **3 pts**
- Knockout: per-match winner picks — R32 = 3 pts, R16 = 3 pts, QF = 5 pts, SF = 5 pts, THIRD = 3 pts, FINAL = 5 pts reach + 5 pts champion = 10 pts
- `compute_bracket_points(bracket_id)` SQL function (migration 0004)
- `lib/scoring.ts` — JS mirror of scoring constants

### Auth pages (all working)
| Route | Status |
|---|---|
| `/login` | Login form — hold-to-reveal eye icon + "Forgot password?" link |
| `/signup` | Signup form — hold-to-reveal eye icon on password field |
| `/forgot-password` | Email → `supabase.auth.resetPasswordForEmail()`, shows green confirmation |
| `/reset-password` | New password form (via magic link) → `supabase.auth.updateUser()` |

**Note:** Disable "Confirm email" in Supabase dashboard → Authentication → Email if you want dev signups to work immediately.

### Pages (all working)
| Route | Status |
|---|---|
| `/` | Landing page — red/gold hero, live countdown to June 11 lock, points table |
| `/dashboard` | YOUR SUBMISSIONS — inline create form, delete with confirm, RANK/POINTS/EXACT stats, pick counts |
| `/brackets/[id]` | Full bracket editor with GROUP tab (group cards) + knockout tabs (R32–FINAL) |
| `/schedule` | All 104 matches, grouped by stage, times in user's local timezone |
| `/results` | Finished matches with final scores |
| `/leaderboard` | Global ranking of all brackets |
| `/api/brackets/create` | POST — creates a named bracket for the authed user |
| `/api/results/sync` | POST — fetches from football-data.org, upserts match results |

### Library files
- `lib/supabase/client.ts` — Browser Supabase client
- `lib/supabase/server.ts` — Server Supabase client
- `lib/lock.ts` — `POOL_LOCK_AT`, `isLocked()`
- `lib/scoring.ts` — `STAGE_POINTS`, `scoreGroupMatch`, `scoreAdvancement`
- `lib/football-data.ts` — API client for football-data.org
- `lib/bracket-structure.ts` — `R32_SLOTS`, `KNOCKOUT_FEEDS`, `KNOCKOUT_STAGES`, `THIRD_MATCH_NUMBER`, `GROUP_CODES`
- `lib/standings.ts` — pure TS computation functions (no DB calls):
  - `predictGroupStandings(scores, matches, teams)` → standings per group (pts→GD→GF→H2H→team_id)
  - `predictBestThirds(standings)` → 8 best 3rd-place team_ids in rank order
  - `resolveSlot(slot, standings, bestThirds)` → team_id or null for slot labels like '1A', '2B', '3rd-3'
  - `resolveKnockoutTeams(match, allKnockoutMatches, standings, bestThirds, winnerPicks)` → `{ teamA, teamB }` — memoized recursive resolver; handles THIRD (#103) loser logic
  - `findConflicts(knockoutMatches, winnerPicks, standings, bestThirds)` → array of conflicts where saved pick is no longer a valid team
  - Exported types: `ScorePrediction`, `GroupStanding`, `GroupMatch`, `KnockoutMatch` (includes optional `kickoff_at`)
- `lib/flags.ts` — `flagSrc(teamCode)` → `https://flagcdn.com/w20/{iso}.png` for all 48 FIFA team codes

### Components
- `components/nav.tsx` — Top nav (auth-aware)
- `components/countdown.tsx` — Default export: big 4-block countdown for landing page; named export `CountdownText`: compact "Bracket locks in Xd Yh Zm" for banners
- `components/local-time.tsx` — Timezone-aware time display
- `components/save-indicator.tsx` — Props: `status: 'idle' | 'saving' | 'saved'`; 'saved' auto-resets to 'idle' after 2s
- `components/toast.tsx` — Fixed-position dismissible red banner; Props: `messages: string[]; onDismiss: () => void`; renders nothing when messages is empty

### Bracket editor (current implementation)
The bracket editor at `/brackets/[id]` is fully implemented:

**`app/brackets/[id]/page.tsx`** (server component):
- Loads bracket info, 72 group matches (with `home_team` and `away_team` joined, including `flag_url`), 32 knockout matches (with `match_number`, `slot_a`, `slot_b`, `feed_a_match_id`, `feed_b_match_id`, `kickoff_at`), `score_predictions`, `knockout_winner_picks`, and all teams
- Passes everything to `BracketEditor` client component
- Note: `groupMatchesRaw` is cast `as unknown as Array<{...}>` because Supabase types show FK joins as arrays but runtime returns single objects

**`app/brackets/[id]/bracket-editor.tsx`** (client component — the root):
- Owns `scorePreds` and `winnerPicks` state (initialized from server props)
- Computes in `useMemo`: `standings` (via `predictGroupStandings`), `bestThirds`, `conflicts` (via `findConflicts`), `groupPickCount`, `koPickCount`
- Tab bar: GROUP | R32 | R16 | QF | SF | 3RD | FINAL (active = red filled)
- Two progress bars: "X / 72 group stage matches" and "X / 32 knockout picks"
- Countdown banner (light red box with `<CountdownText />`)
- Passes `onPredSaved` and `onPickSaved` callbacks to children so state stays live
- Passes `conflictMatchIds: Set<number>` to `KnockoutPicker` for red borders
- Renders `<Toast>` for conflict warnings

**`app/brackets/[id]/group-predictions.tsx`** (client component):
- 2-column grid of group cards (GROUP A–L)
- Each match row: date | home team (flag img + name, right-aligned) | score inputs | away team (flag img + name)
- Flag images from `flagSrc(team.code)` → `flagcdn.com` CDN (not emoji — emoji don't render on Windows)
- Per-match `SaveIndicator` (saving/saved state)
- `onBlur` auto-save to `score_predictions`
- Props: `bracketId`, `matches`, `initialPredictions`, `canEdit`, `onPredSaved`

**`app/brackets/[id]/knockout-picker.tsx`** (client component):
- 2-column grid of per-match cards
- Each card: stage/match_number header + kickoff date | TeamSlot × 2 with VS | two pick buttons | status text
- `TeamSlot`: flag img + code + name (or "?" + "TBD" if unresolved)
- Pick buttons: flag img + code + name; selected = red filled
- TBD helper message: "Complete group stage predictions..." for R32, "Pick a winner in the previous round..." for R16+
- Conflict state: red border on card
- Saves to `knockout_winner_picks` on click; calls `onPickSaved` to update parent state
- Props: `bracketId`, `stageMatches`, `allKnockoutMatches`, `teamsById`, `winnerPicks`, `standings`, `bestThirds`, `canEdit`, `onPickSaved`, `conflictMatchIds`

### Dashboard (current implementation)
**`app/dashboard/page.tsx`** (server component):
- Loads user's brackets with `bracket_scores`, `score_predictions` (count), `knockout_winner_picks` (count)
- Loads leaderboard for rank lookup
- Passes to `SubmissionsClient`

**`app/dashboard/submissions-client.tsx`** (client component):
- Countdown banner at top (gray box with 🕐 + `<CountdownText />`)
- Inline new bracket form (text input + "+ NEW SUBMISSION" red button → POST `/api/brackets/create` → redirect to new bracket)
- Per-bracket cards: name + Delete link | RANK / POINTS / EXACT stat columns | "Group: X/72 · Knockout: X/32" helper | full-width red "OPEN PREDICTIONS" button
- Delete uses browser Supabase client + `window.confirm()` dialog; removes from local state after
- EXACT is hardcoded to 0 (no matches have results yet — implement when tournament starts)

### Results ingest
- `lib/football-data.ts` — client for football-data.org API
- `/api/results/sync` route protected by `SYNC_SECRET` header
- `vercel.json` Cron configured to hit it every 15 min during tournament
- **football-data.org API key NOT yet added** — needs `FOOTBALL_DATA_API_KEY` in `.env.local`

---

## What Needs To Be Done Next

### IMMEDIATE — Medium priority (in order)

#### 1. Schedule page redesign
Reference: `images/UI inspiration/` (there may not be a specific screenshot; model after the bracket editor style)  
File: `app/schedule/page.tsx`  
- Two tabs: Group Stage / Knockouts
- Card-based layout matching overall app style
- Use `components/local-time.tsx` for kickoff display
- Show flag images using `flagSrc(team.code)` from `lib/flags.ts`

#### 2. Leaderboard improvements
File: `app/leaderboard/page.tsx`  
- Medal icons for top 3 (gold/silver/bronze)
- Add avg-pts column
- Show bracket count per user

#### 3. football-data.org API key
- Get free key at football-data.org
- Add `FOOTBALL_DATA_API_KEY` to `.env.local` and Vercel env vars
- Test `/api/results/sync` manually with `curl -X POST http://localhost:3000/api/results/sync -H "x-sync-secret: YOUR_SYNC_SECRET"`

#### 4. Seed real WC2026 fixtures
- Once API key is in, run sync route to overwrite placeholder match times with real kickoff times

#### 5. Git initial commit
- No commits yet; `.env.local` is gitignored (good)
- Run: `git add -A && git commit -m "Initial commit — Mundialito 2026 MVP"`

#### 6. Vercel deployment
- Push to GitHub, connect to Vercel
- Add all env vars (see list below)

### FUTURE / Out of scope for now
- Invite code gating (`SanDiego`) on signup
- Payment tracking / paid bracket status (Venmo $50 flow)
- Prize pool computation (55/30/15% split, 9% fee)
- Private groups / sub-leagues
- Admin UI for manual result entry
- EXACT score count on dashboard (implement when matches have results: compare `score_predictions` against finished match scores)

---

## Key Files

```
app/
  page.tsx                                  # Landing page (red/gold hero, countdown, points table)
  (auth)/login/page.tsx                     # Login — eye icon + forgot-password link
  (auth)/signup/page.tsx                    # Signup — eye icon on password
  (auth)/forgot-password/page.tsx           # Forgot password
  (auth)/reset-password/page.tsx            # Reset password (via magic link)
  dashboard/page.tsx                        # Server shell — loads brackets + leaderboard
  dashboard/submissions-client.tsx          # Client — YOUR SUBMISSIONS UI (create/delete/list)
  brackets/new/page.tsx                     # Legacy create page (may be removed later)
  brackets/[id]/page.tsx                    # Server shell — loads all bracket data
  brackets/[id]/bracket-editor.tsx          # Client root — tab bar, progress bars, state owner
  brackets/[id]/group-predictions.tsx       # Group stage 2-col grid (flag img + name + score inputs)
  brackets/[id]/knockout-picker.tsx         # Knockout per-match cards (flag img + pick buttons)
  schedule/page.tsx                         # Match schedule — NEEDS REDESIGN
  results/page.tsx                          # Finished matches (low priority)
  leaderboard/page.tsx                      # Global leaderboard — NEEDS IMPROVEMENTS
  api/brackets/create/route.ts              # POST — create bracket for authed user
  api/results/sync/route.ts                 # POST — football-data.org ingest
lib/
  supabase/client.ts                        # Browser Supabase client
  supabase/server.ts                        # Server Supabase client
  lock.ts                                   # POOL_LOCK_AT, isLocked()
  scoring.ts                                # STAGE_POINTS, scoreGroupMatch (JS mirror of SQL)
  football-data.ts                          # football-data.org API client
  bracket-structure.ts                      # R32_SLOTS, KNOCKOUT_FEEDS, KNOCKOUT_STAGES, THIRD_MATCH_NUMBER, GROUP_CODES
  standings.ts                              # Pure TS: predictGroupStandings, predictBestThirds, resolveSlot, resolveKnockoutTeams, findConflicts
  flags.ts                                  # flagSrc(teamCode) → flagcdn.com URL for all 48 FIFA codes
components/
  nav.tsx                                   # Top nav
  countdown.tsx                             # Default: big 4-block; CountdownText: compact banner text
  local-time.tsx                            # Timezone-aware time
  save-indicator.tsx                        # idle/saving/saved with 2s auto-reset
  toast.tsx                                 # Dismissible red fixed-position banner
supabase/
  migrations/0001_init.sql                  # Core schema + RLS (teams has flag_url text column)
  migrations/0002_scoring.sql               # Original scoring functions + leaderboard view
  migrations/0003_bracket_structure.sql     # match connectivity columns + knockout_winner_picks table
  migrations/0004_scoring_v2.sql            # Rewritten scoring from knockout_winner_picks
  seed/teams.sql                            # 48 teams (codes: USA, PAN, HAI, JAM, MEX, BOL, CAN, NZL, ARG, CHI, PER, AUS, FRA, MAR, BEL, ESP, BRA, URU, COL, ECU, ENG, SER, NED, ISL, GER, JPN, KOR, SAU, POR, CZE, TUR, GRE, NGA, CIV, SEN, EGY, CRO, SVK, ROM, HUN, MEX2, QAT, IRN, IRQ, CAM, MLI, GAB, RSA)
  seed/matches.sql                          # 104 fixture placeholders (72 GROUP + 32 knockout)
  seed/bracket_connectivity.sql             # Backfills match_number, slot_a/b, feed_a/b_match_id
  seed/flags.sql                            # Flag emojis in flag_url column (not used by UI)
images/
  UI inspiration/group.png                  # Reference: group stage tab layout
  UI inspiration/R32.png                    # Reference: R32 match cards layout
  UI inspiration/R16.png                    # Reference: R16 match cards layout (clearest reference for knockout cards)
  UI inspiration/QF.png                     # Reference: QF match cards
  UI inspiration/SF.png                     # Reference: SF match cards
  UI inspiration/3rd.png                    # Reference: 3rd-place match card
  UI inspiration/Final.png                  # Reference: Final match card
  UI inspiration/nothing-picked.png         # Reference: TBD state / nothing picked yet
  UI inspiration/submissions.png            # Reference: dashboard/submissions list layout
.env.local                                  # All secrets (gitignored)
vercel.json                                 # Cron: hits /api/results/sync every 15 min
mundialitorules.pdf                         # Original pool rules document
```

---

## Env Vars (needed in .env.local AND Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_POOL_LOCK_AT=2026-06-11T00:00:00Z
FOOTBALL_DATA_API_KEY          ← NOT YET SET
SYNC_SECRET                    ← set to a random string
DB_PASSWORD                    ← for migration script only
```

---

## Important Implementation Notes (for new chat context)

### Next.js 16 specifics
- `params` in page components is a `Promise`: `async function Page({ params }: { params: Promise<{ id: string }> })` then `const { id } = await params`
- Read `node_modules/next/dist/docs/` before making changes if unsure about an API

### Supabase FK joins
- When selecting joined tables via FK (e.g. `home_team:teams!matches_home_team_id_fkey(...)`), TypeScript infers the result as an array, but at runtime it's a single object (many-to-one FK).
- Cast through `unknown`: `(raw ?? []) as unknown as Array<{ home_team: {...}; away_team: {...} }>`

### Flag images
- Flag emojis (🇺🇸) do NOT render as flag images on Windows — they display as two-letter text (e.g. "US").
- Always use `flagSrc(teamCode)` from `lib/flags.ts` to get a `flagcdn.com` CDN URL, and render as `<img>`.
- `flag_url` column in the `teams` table still stores emoji values but the UI ignores it.

### Standings computation
- `predictGroupStandings` takes `ScorePrediction[]` (the `scorePreds` state), not the raw DB format. Each prediction has `match_id`, `home_score`, `away_score`.
- `resolveKnockoutTeams` is memoized internally using a `Map` per call. It handles THIRD (match #103) specially by using losers of SF matches instead of winners.
- `findConflicts` must be called with the complete `winnerPicks` record (all stages), not per-stage.

### TypeScript gotcha with KNOCKOUT_STAGES
- `KNOCKOUT_STAGES` is `as const`, so `matchNumbers` is a readonly literal tuple.
- Use `(stage.matchNumbers as readonly number[]).includes(match.match_number)` to avoid TS error.

### `bracket-editor.tsx` tab → stage mapping
- Tab keys are `'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'FINAL'`
- KNOCKOUT_STAGES uses `'THIRD'` (not `'3RD'`) — the editor maps `activeTab === '3RD'` → `s.key === 'THIRD'`
