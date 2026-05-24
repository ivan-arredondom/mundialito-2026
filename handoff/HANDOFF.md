# Bracket Editor Redesign — Implementation Spec

## Goal
Ship three changes to the bracket editor (`app/brackets/[id]/`):

1. **Sticky stage header** — replace the current `←/title/countdown/progress-bars/tab-row` stack with a single sticky header that includes a chevron-pill stage breadcrumb.
2. **Match card with stepper** — replace the input + tiny 0–3 chip pills inside `GroupPredictions` with a real card layout and `[−] [n] [+]` steppers.
3. **Full group-stage view with live predicted standings** — group cards become accordions that show the 6 matches AND a live standings strip computed from the user's picks (top 2 gold, best-3rd orange, others dim).

Reference designs:
- `handoff/bracket-editor/01-sticky-header.png` — sticky header (desktop)
- `handoff/bracket-editor/02-stepper-card.png` — match card option A
- `handoff/bracket-editor/03-group-view.png` — full group-stage view (desktop + mobile)

The reference React components are in the project root (`bracket-shared.jsx`, `bracket-chrome.jsx`, `bracket-match-cards.jsx`, `bracket-group-view.jsx`) — copy structure and CSS values from them, but rewrite as Tailwind classes in the codebase's style.

---

## 1 · Sticky stage header

### Replaces
The current header block in `app/brackets/[id]/bracket-editor.tsx`:

```tsx
<Link href="/dashboard">← All Submissions</Link>
<h1>{bracketName}</h1>
{canEdit && <div className="border-red-300 bg-red-50…"><CountdownText /></div>}
<ProgressBar … 72 group … />
<ProgressBar … 32 knockout … />
<div className="flex gap-1 mb-6 overflow-x-auto">{ALL_TABS.map(…)}</div>
```

All five blocks become one sticky header.

### Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ ← ALL SUBMISSIONS   Rafael FC          ⏱ Locks in 20d 17h  18/104   │
│ ╭─────────────╮ › ╭──────╮ › ╭──────╮ › ╭──────╮ › ╭─────╮ › …      │
│ │ GROUP 18/72 │   │R32 0/16│  │R16 0/8│  │QF 0/4 │  │SF 0/2│        │
│ ╰─────────────╯   ╰──────╯   ╰──────╯   ╰──────╯   ╰─────╯          │
└─────────────────────────────────────────────────────────────────────┘
```

- **Row 1** — back link (left), bracket name (left), countdown pill + total pick count (right). The "X of 104 picks" total is `groupPickCount + koPickCount` against `72 + 32 = 104`.
- **Row 2** — `ChevronStages`: 7 pills (`GROUP`, `R32`, `R16`, `QF`, `SF`, `3RD`, `FINAL`) separated by `›`. Each pill shows its label + `done/total` in Geist Mono. Clicking a pill is the same as clicking the old tab buttons (sets `activeTab`).
- The whole header is `sticky top-0 z-30 bg-white border-b border-gray-200`.

### Stage totals (positional)
```ts
const STAGES = [
  { key: 'GROUP', label: 'GROUP', total: 72, flex: 2.2 },
  { key: 'R32',   label: 'R32',   total: 16, flex: 1.2 },
  { key: 'R16',   label: 'R16',   total: 8,  flex: 1   },
  { key: 'QF',    label: 'QF',    total: 4,  flex: 1   },
  { key: 'SF',    label: 'SF',    total: 2,  flex: 1   },
  { key: '3RD',   label: '3RD',   total: 1,  flex: 0.9 },
  { key: 'FINAL', label: 'FINAL', total: 1,  flex: 0.9 },
] as const
```

`done` for `GROUP` = `groupPickCount`. For each KO stage, count entries in `winnerPicks` whose `matchId` is in that stage's `matchNumbers` (use `KNOCKOUT_STAGES` from `@/lib/bracket-structure`; map `3RD` ↔ `THIRD`).

### Pill states (one component, three visual states)
- **Active** — white bg, `border-[#cc0000]` 1.5px, label in red, `done/total` in muted red. Behind the label, a `bg-red-50` fill bar fills left→right by `done/total`.
- **Done** (`done >= total && total > 0`) — `bg-[#f5c518]` (gold), 1px gold-700 border, black text + a black `✓`.
- **Inactive incomplete** — `bg-[#f1f3f6]`, `border-gray-300`, gray text. Still shows the soft-red progress fill.

### Mobile
On `< md`, hide the back link and the "18 of 104 picks" caption. Keep the title, countdown pill, and the stage row. The chevron row should scroll horizontally (`overflow-x-auto`) before it shrinks pills to unreadable.

### Where the code lives
- New component `app/brackets/[id]/stage-header.tsx` — exports `StageHeader` and is rendered at the top of `BracketEditor` in place of the five removed blocks.
- Optional internal helper `<ChevronStages />` inside the same file.

### Props
```ts
type StageHeaderProps = {
  bracketName: string
  canEdit: boolean
  groupPickCount: number
  winnerPicks: Record<number, number>   // for per-stage KO counts
  activeTab: Tab
  onTabChange: (t: Tab) => void
}
```

Compute per-stage `done` inside the component so `BracketEditor` stays small.

---

## 2 · Match card with stepper (option A)

### Replaces
The match row inside `app/brackets/[id]/group-predictions.tsx`: today it renders a flat `flex` row per match with two `<input type=number>` score fields + a tiny "0 1 2 3" chip row. Replace with a card per match.

### Layout (per match)
```
┌──────────────────────────────────────────────────────────┐
│ GROUP B · MD2                       Tue 16 Jun · 15:00   │
│  ┌──────────┐  ┌───┬───┬───┐ : ┌───┬───┬───┐  ┌─────────┐│
│  │🇨🇦 Canada │  │ − │ 1 │ + │   │ − │ 0 │ + │  │Qatar 🇶🇦 ││
│  │   CAN    │  └───┴───┴───┘   └───┴───┴───┘  │   QAT   ││
│  └──────────┘                                  └─────────┘│
│  ↑ Tap +/− to adjust                              ✓ saved │
└──────────────────────────────────────────────────────────┘
```

- Border `border border-gray-200 rounded-2xl bg-white`, padding `p-4`.
- Header row: `GROUP {code} · MD{n}` left in `text-[10px] font-extrabold tracking-widest text-gray-500 uppercase`; date+time right in `text-[10px] text-gray-400 font-semibold`. Compute matchday from kickoff date within the group (the 1st, 3rd, 5th match per group is MD1; 2nd/4th/6th is MD2/MD3 — or just sort by kickoff and assign MD1/2/3 in pairs).
- Stepper component (each side):

  ```tsx
  <div className="flex items-stretch h-9 rounded-lg border border-gray-200 overflow-hidden">
    <button onClick={dec} className="w-7 bg-gray-50 text-gray-500 text-base font-extrabold">−</button>
    <span className="w-8 text-center leading-9 text-base font-black font-mono">{value ?? '–'}</span>
    <button onClick={inc} className="w-7 bg-gray-50 text-gray-500 text-base font-extrabold">+</button>
  </div>
  ```

  - Empty state shows `–` in `text-gray-300`.
  - Clamp value to `0..20` (same as the current input's max).
  - Each tap saves immediately (no blur required) — call the existing `save(matchId)` after updating local state. Keep the same upsert and `onPredSaved` plumbing.
- Footer row: italic hint left, save indicator right. `↑ Tap +/− to adjust` once the pick is saved, otherwise `Estimate until kickoff`.

### Mobile
- Cards stack to 1 column (`grid-cols-1`); 2 columns on `md:`.
- Hit targets must be **≥ 44px** — bump the stepper buttons to `w-10 h-11` on mobile. The current `w-7 h-9` is fine for desktop.

### Don't break
- Server flow (Supabase upsert in `score_predictions`) is unchanged.
- `SaveIndicator` and the `onPredSaved` callback still drive the parent's `scorePreds` state — that's what `predictGroupStandings` depends on. Keep them.
- The `disabled={!canEdit}` path: when locked, render the stepper as static text (no `−/+` buttons) instead of a disabled control.

---

## 3 · Full group-stage view with live predicted standings

### Replaces
`group-predictions.tsx` currently renders a flat 2-column grid of bare `border-gray-200 rounded-xl p-4` cards titled "Group X" with the matches inside. Add three things:

1. A **view toggle** at the top: `[ By group ] [ By matchday ]` (only "By group" needs to work this milestone — "By matchday" can be a stub that flips state but renders the same grouping in matchday order; we'll wire it next).
2. Each group becomes an **accordion** — collapsed by default, except one starts expanded. Expanding shows the 6 match cards + the standings strip.
3. A **live predicted standings strip** under the matches of each expanded group, computed from the parent's `standings` prop (already calculated in `BracketEditor` via `predictGroupStandings`).

### Expanded group card

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──┐  GROUP                                                 │
│  │B │  🇨🇦🇧🇦🇶🇦🇨🇭  Canada · Bosnia & H. · Qatar · Switzerland │
│  └──┘                              3 of 6 matches picked     │
│                                                              │
│  [ match card ]   [ match card ]                             │
│  [ match card ]   [ match card ]                             │
│  [ match card ]   [ match card ]                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ LIVE PREDICTED STANDINGS   updates as you pick · top 2 │  │
│  │ # 🏳 Team            P W D L GD  PTS                   │  │
│  │ 1 🇨🇦 Canada          2 2 0 0 +2   6   (gold ribbon)    │  │
│  │ 2 🇨🇭 Switzerland     2 1 0 1 +1   3   (gold ribbon)    │  │
│  │ 3 🇧🇦 Bosnia & H.     1 0 0 1 −1   0   (orange ribbon)  │  │
│  │ 4 🇶🇦 Qatar           2 0 0 2 −2   0   (dim)            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Collapsed group card

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──┐  🇧🇷🇲🇦🇳🇱🇨🇴  Brazil · Morocco · Netherlands · Colombia  4/6  ▰▰▰▰▱▱  ›   │
│  │C │                                                                              │
│  └──┘                                                                              │
└──────────────────────────────────────────────────────────────┘
```

A single row: square code badge → flags → team names (truncate on mobile) → `n/6` count → thin red progress bar → caret. Whole row is the toggle.

### Standings strip — data wiring

The parent (`BracketEditor`) already passes `standings: GroupStanding[]` shaped:
```ts
{ team_id, team_code, team_name, played, won, drawn, lost, gf, ga, gd, points }
```

Pass `standings` down to `GroupPredictions`. Inside, group by the standings' team's group code (each `GroupStanding`'s team belongs to one group — look it up via `groupMatches[0].group_code` for that team's group). For each group:
- Sort by `points DESC, gd DESC, gf DESC`.
- Position 1–2 → **gold** square (`bg-[#f5c518]`).
- Position 3 → **orange** square (`bg-orange-400`) IF this team is in `bestThirds` (also already computed in `BracketEditor`); else dim.
- Position 4 → no fill.

The number cells should be `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`). Pts in red (`text-[#cc0000] font-mono font-black`).

A small caption beside the title: `updates as you pick · top 2 advance, 3rd may qualify`.

### Accordion behavior
- Local state `{ [groupCode: string]: boolean }`, default `{ B: true }` (first group with picks, or first alphabetically).
- Only one expanded at a time? **No** — multiple allowed; users will compare. But default just one open.
- Persist open state in `localStorage` keyed by bracket id so a refresh doesn't collapse everything.

### Mobile
On `< md`:
- Group card is full-width (`grid-cols-1`).
- Standings strip rows use the compact 5-col layout: `rank · flag · team · GD · PTS` (drop P/W/D/L columns).

---

## What NOT to change

- Routes, server actions, Supabase schema, `score_predictions`/`winner_picks` tables.
- `lib/standings.ts` — already computes what we need.
- `KnockoutPicker` — out of scope for this round.
- `Toast` and conflict logic — keep as is.

---

## Files Claude Code should touch

- ✏️ `app/brackets/[id]/bracket-editor.tsx` — remove the five top blocks; render `<StageHeader …>`; pass `standings` + `bestThirds` into `<GroupPredictions />`.
- ✨ `app/brackets/[id]/stage-header.tsx` — new sticky header + chevron pills.
- ✏️ `app/brackets/[id]/group-predictions.tsx` — view toggle, accordion group cards, new match card with stepper, standings strip.
- (No backend changes.)

---

## What to paste into Claude Code

This file plus the three reference PNGs in this folder. Also drop in `bracket-chrome.jsx`, `bracket-match-cards.jsx`, and `bracket-group-view.jsx` from the project root if Claude Code wants to read the reference React directly — values like the gold (`#f5c518`), the gray scale (`#e5e7eb` / `#6b7280` / `#9ca3af`), and the pill geometry are easiest to lift from there.

Codebase patterns to follow:
- Tailwind only (no inline `style={{}}` — except where computing a width %).
- Brand red is `#cc0000` (hardcoded throughout the app), gray scale via Tailwind `gray-*`.
- Geist + Geist Mono are already loaded in `app/layout.tsx`.
- `flagSrc` from `@/lib/flags` for flag URLs.
