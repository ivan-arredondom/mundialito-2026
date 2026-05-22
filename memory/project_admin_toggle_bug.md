---
name: admin-toggle-bug
description: Admin panel Global Mod toggle silently fails — DB not updated, needs investigation
metadata:
  type: project
---

The "Global Mod" toggle button in the admin panel (`/admin` → Users section) does not persist to the DB. The button turns blue via optimistic update and flashes "made global mod", but `is_global_mod` stays `false` in the database.

**What we know:**
- The `is_global_mod` column exists on `profiles` (migration 0007_admin.sql applied)
- Direct REST PATCH via service role key works correctly (confirmed by curl test)
- The API route (`app/api/admin/users/route.ts`) code looks correct — uses `createAdminClient()` and the PATCH handler is properly structured
- The toggle functions (`toggleAdmin`, `toggleGlobalMod`) never checked `res.ok` — this was fixed; they now revert optimistic state and show the real error on failure
- "Ivan" (id: 0a149696-1457-4279-ba17-fba981afed1c) was manually set to `is_global_mod: true` via curl as a test; nav correctly shows Mod link for that user

**Next step to diagnose:**
Test the admin panel toggle with the new error handling in place. The black flash notification will now show the actual API error (e.g. "Error: Forbidden" or "Error: 500") instead of fake success. Once the error text is known, fix the root cause.

**Why:** The route's `assertAdmin()` function is the most likely culprit — it may be failing to read the session cookie in the PATCH context, returning null and causing a 403.
