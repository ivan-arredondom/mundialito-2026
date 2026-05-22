-- ============================================================
-- 0003_bracket_structure.sql
-- Adds bracket connectivity to matches and replaces the
-- set-based advancement_predictions with per-match winner picks.
-- ============================================================

-- 1. Extend matches with bracket-connectivity columns
alter table matches
  add column if not exists match_number   int unique,
  add column if not exists slot_a         text,   -- e.g. '1A', '2B', '3rd-1'  (R32 only)
  add column if not exists slot_b         text,   -- e.g. '1C', '2D', '3rd-2'  (R32 only)
  add column if not exists feed_a_match_id int references matches(id),  -- R16+
  add column if not exists feed_b_match_id int references matches(id);  -- R16+

-- 2. New per-match knockout winner picks (replaces advancement_predictions)
create table if not exists knockout_winner_picks (
  bracket_id    uuid     not null references brackets(id) on delete cascade,
  match_id      int      not null references matches(id)  on delete cascade,
  winner_team_id smallint not null references teams(id),
  primary key (bracket_id, match_id)
);

alter table knockout_winner_picks enable row level security;

create policy "knockout_winner_picks: owner full access"
  on knockout_winner_picks for all
  using  (exists (select 1 from brackets b where b.id = bracket_id and b.user_id = auth.uid()))
  with check (exists (select 1 from brackets b where b.id = bracket_id and b.user_id = auth.uid()));

create policy "knockout_winner_picks: public read after lock"
  on knockout_winner_picks for select
  using (now() >= '2026-06-11T00:00:00Z'::timestamptz);

-- 3. Drop old set-based advancement predictions (no production data yet)
drop table if exists advancement_predictions;
drop type  if exists knockout_stage;
