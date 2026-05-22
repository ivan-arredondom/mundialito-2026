-- ============================================================
-- 0004_scoring_v2.sql
-- Rewrites scoring to use knockout_winner_picks (match-based)
-- instead of the old set-based advancement_predictions.
-- ============================================================

-- Scoring map:
--   Correct R32 winner  → 3 pts  (team advances to R16)
--   Correct R16 winner  → 3 pts  (team advances to QF)
--   Correct QF  winner  → 5 pts  (team advances to SF)
--   Correct SF  winner  → 5 pts  (team advances to Final)
--   Correct 3rd winner  → 3 pts  (3rd-place bonus)
--   Correct Final winner→ 10 pts (5 for reaching final + 5 Champion)
--
-- Total max for predicting the champion all the way: 3+3+5+5+10 = 26 pts
-- (same ceiling as the original set-based model)

create or replace function compute_bracket_points(p_bracket_id uuid)
returns int language sql stable as $$
  select
    coalesce(group_pts, 0) + coalesce(ko_pts, 0)
  from (
    -- Group stage: exact score = 5 pts, correct result = 3 pts
    select sum(
      case
        when sp.home_score = m.home_score and sp.away_score = m.away_score then 5
        when sign(sp.home_score - sp.away_score) = sign(m.home_score - m.away_score) then 3
        else 0
      end
    ) as group_pts
    from score_predictions sp
    join matches m on m.id = sp.match_id
    where sp.bracket_id = p_bracket_id
      and m.stage = 'GROUP'
      and m.status = 'FINISHED'
  ) g,
  (
    -- Knockout: points only when pick matches actual match winner
    select sum(
      case m.stage
        when 'R32'   then 3
        when 'R16'   then 3
        when 'QF'    then 5
        when 'SF'    then 5
        when 'THIRD' then 3
        when 'FINAL' then 10   -- 5 for reaching final + 5 Champion
        else 0
      end
    ) as ko_pts
    from knockout_winner_picks kwp
    join matches m on m.id = kwp.match_id
    -- derive actual winner: higher score wins (no draws in knockout)
    cross join lateral (
      select case
        when m.home_score > m.away_score then m.home_team_id
        else m.away_team_id
      end as actual_winner
    ) w
    where kwp.bracket_id    = p_bracket_id
      and m.status          = 'FINISHED'
      and m.home_score      is not null
      and m.away_score      is not null
      and kwp.winner_team_id = w.actual_winner
  ) k
$$;

-- Refresh function unchanged
create or replace function refresh_bracket_score(p_bracket_id uuid)
returns void language plpgsql as $$
begin
  insert into bracket_scores (bracket_id, points, updated_at)
  values (p_bracket_id, compute_bracket_points(p_bracket_id), now())
  on conflict (bracket_id) do update
    set points     = excluded.points,
        updated_at = excluded.updated_at;
end;
$$;

-- Trigger: fire when a match result changes (refreshes all brackets with picks for this match)
create or replace function trg_match_finished()
returns trigger language plpgsql as $$
begin
  if new.status = 'FINISHED' and (
    old.status <> 'FINISHED'
    or old.home_score is distinct from new.home_score
    or old.away_score is distinct from new.away_score
  ) then
    -- Group stage pickers
    perform refresh_bracket_score(b.id)
    from brackets b
    join score_predictions sp on sp.bracket_id = b.id
    where sp.match_id = new.id;

    -- Knockout pickers
    perform refresh_bracket_score(b.id)
    from brackets b
    join knockout_winner_picks kwp on kwp.bracket_id = b.id
    where kwp.match_id = new.id;
  end if;
  return new;
end;
$$;

-- Re-create trigger (replace old one)
drop trigger if exists match_finished_trg on matches;
create trigger match_finished_trg
  after update on matches
  for each row execute procedure trg_match_finished();

-- Trigger: refresh when a user changes a knockout pick (in case match is already finished)
create or replace function trg_ko_pick_changed()
returns trigger language plpgsql as $$
declare
  v_bracket_id uuid := coalesce(new.bracket_id, old.bracket_id);
begin
  perform refresh_bracket_score(v_bracket_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists ko_pick_changed_trg on knockout_winner_picks;
create trigger ko_pick_changed_trg
  after insert or update or delete on knockout_winner_picks
  for each row execute procedure trg_ko_pick_changed();
