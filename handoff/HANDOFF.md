# Share Group Code — Implementation Spec

## Goal
Let any user in a group invite friends by sharing the group's invite code from the **Leaderboard** page (`app/leaderboard/page.tsx`).

See `share-button-reference.png` in this folder for the visual target.

---

## Placement

**On the Leaderboard, mobile and desktop:**
- An outline-style **"Share"** pill button sits on the right end of the group's `<h2>` title row.
- Same button on both viewports — only spacing changes.
- Visible only when the user is in at least one group (i.e. when the group tab/sections render). Not in the Global tab.
- One button **per group section** when the user belongs to multiple groups.

```
┌──────────────────────────────────────────────┐
│  Maradona FC                  [ ↗ Share ]    │
│  ──────────────────────────────────────────  │
│  🥇 Ana Reyes          Lucky 13        42    │
│  🥈 Tomás López        Tornadoes       38    │
│   …                                          │
└──────────────────────────────────────────────┘
```

### Styling
- Outline button: `border: 1.5px solid #cc0000`, text color `#cc0000`, white background
- Padding: `5px 12px` (mobile), `6px 14px` (desktop)
- `rounded-full`, `text-xs font-bold` (mobile) / `text-sm font-bold` (desktop)
- Icon: upload-arrow share glyph, 13–14px, gap 6px from label
- Hover: invert to filled red background, white text

---

## Share Sheet (modal)

Tapping/clicking **Share** opens a bottom sheet on mobile and a centered modal on desktop. Reuse the existing **`components/install-guide.tsx`** pattern (full-width sheet on mobile, scrim, drag handle, "Got it" close).

### Contents
1. Title: `Invite to {group.name}`
2. Subtitle: `Anyone with this code can join your group at signup.`
3. **Code block** (large): `INVITE CODE` label + monospace `{group.code}` at 22px font-weight 900 + black "Copy" button on the right.
4. **Link row** (smaller, muted gray): link icon + `mundialito.app/signup?code={group.code}` + "Copy link" affordance.
5. **Primary action**:
   - Mobile: red full-width `Share via…` button — calls `navigator.share({ title, text, url })` if available, otherwise falls back to copy.
   - Desktop: red `Share via email` button — opens `mailto:?subject=&body=` with the link.

### Share payload
```ts
{
  title: `Join my Mundialito pool`,
  text: `Join "${group.name}" on Mundialito — code ${group.code}`,
  url: `https://mundialito.app/signup?code=${group.code}`,
}
```

### Copy-confirmation
After a successful copy, briefly swap the button label to `Copied!` for ~1.2s. Reuse the `<Toast>` component or a local `useState` flag — your call.

---

## Implementation notes

### New component
Create `components/share-group-button.tsx`:
```tsx
'use client'
type Props = { groupName: string; groupCode: string }
export default function ShareGroupButton({ groupName, groupCode }: Props) {
  // outline pill + bottom-sheet modal exactly like install-guide.tsx
}
```

Mirror the structure of `install-guide.tsx`:
- Local `open` state
- Fixed-position overlay with scrim + click-outside-to-close
- `rounded-t-2xl` sheet on mobile; promote to centered `rounded-2xl` modal at `md:` breakpoint
- Close on `Escape` key

### Where to render
In `app/leaderboard/page.tsx`, inside the group tab block:

```tsx
{groupBoards.map(({ groupId, groupName, ranked, noSubmissionUsers, groupCode }) => (
  <div key={groupId}>
    <div className="flex items-center justify-between mb-4 border-b pb-2">
      <h2 className="text-base font-black text-gray-700">{groupName}</h2>
      <ShareGroupButton groupName={groupName} groupCode={groupCode} />
    </div>
    <RankedTable ranked={ranked} showGroupCol={false} />
    {/* … */}
  </div>
))}
```

> Currently the `<h2>` only renders when `groupBoards.length > 1`. The button needs to render unconditionally — refactor so the header (`{groupName}` + Share button) shows for **every** group, even when there's only one.

### Data
`groupCode` isn't currently passed to the leaderboard page — `myGroups` only includes `id` and `name`. Update the membership query:

```ts
.select('group_id, groups(name, code)')
```

…and thread `code` through `myGroups` → `groupBoards`.

### Signup deep link
`app/(auth)/signup/page.tsx` already accepts `groupCode` from local state. Wire it to read `?code=` from the URL on mount and prefill the field.

```tsx
const params = useSearchParams()
useEffect(() => {
  const c = params.get('code')
  if (c) setGroupCode(c)
}, [params])
```

### Accessibility
- The Share pill: `aria-label="Share {groupName} invite code"`
- Modal: `role="dialog"`, `aria-modal="true"`, focus trap, return focus to trigger on close
- Code block: announce copy success via `aria-live="polite"` span

---

## Files Claude Code should touch
- ✏️ `app/leaderboard/page.tsx` — query, render header row with button
- ✨ `components/share-group-button.tsx` — new component
- ✏️ `app/(auth)/signup/page.tsx` — prefill `?code=` query param

## What to paste into Claude Code
This `HANDOFF.md` file + the reference screenshot. Both are enough — Claude Code can look at `install-guide.tsx` for the bottom-sheet pattern and `leaderboard/page.tsx` for the surrounding code.
