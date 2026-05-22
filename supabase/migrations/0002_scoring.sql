-- ============================================================
-- 0002_scoring.sql  –  Scoring functions + leaderboard view
-- ============================================================

-- bracket_scores: cached point totals, refreshed by trigger
create table bracket_scores (
  bracket_id uuid primary key references brackets(id) on delete cascade,
  points int not null default 0,
  updated_at timestamptz not null default now()
);

-- Compute all points for a bracket
create or replace function compute_bracket_points(p_bracket_id uuid)
returns int language sql stable as $$
  select
    coalesce(group_pts, 0) + coalesce(adv_pts, 0)
  from (
    -- Group-stage score predictions
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
    -- Knockout advancement bonuses
    -- R32: 3 pts — team advanced from groups
    select sum(
      case ap.stage
        when 'R32'      then 3
        when 'R16'      then 3
        when 'QF'       then 5
        when 'SF'       then 5
        when 'FINAL'    then 5
        when 'CHAMPION' then 5
        else 0
      end
    ) as adv_pts
    from advancement_predictions ap
    where ap.bracket_id = p_bracket_id
      and exists (
        -- Team actually reached this stage
        select 1 from matches m
        where m.status = 'FINISHED'
          and m.stage = (
            case ap.stage
              when 'R32'      then 'GROUP'::match_stage  -- advanced = appeared in R32
              when 'R16'      then 'R32'::match_stage
              when 'QF'       then 'R16'::match_stage
              when 'SF'       then 'QF'::match_stage
              when 'FINAL'    then 'SF'::match_stage
              when 'CHAMPION' then 'FINAL'::match_stage
            end
          )
          and (m.home_team_id = ap.team_id or m.away_team_id = ap.team_id)
      )
  ) a
$$;

-- Refresh bracket_scores for a given bracket
create or replace function refresh_bracket_score(p_bracket_id uuid)
returns void language plpgsql as $$
begin
  insert into bracket_scores (bracket_id, points, updated_at)
  values (p_bracket_id, compute_bracket_points(p_bracket_id), now())
  on conflict (bracket_id) do update
    set points = excluded.points,
        updated_at = excluded.updated_at;
end;
$$;

-- Trigger: refresh affected brackets when a match result is updated
create or replace function trg_match_finished()
returns trigger language plpgsql as $$
begin
  if new.status = 'FINISHED' and (old.status <> 'FINISHED' or old.home_score is distinct from new.home_score or old.away_score is distinct from new.away_score) then
    perform refresh_bracket_score(b.id)
    from brackets b
    join score_predictions sp on sp.bracket_id = b.id
    where sp.match_id = new.id

    union

    select refresh_bracket_score(b.id)
    from brackets b
    join advancement_predictions ap on ap.bracket_id = b.id
    join teams t on t.id = ap.team_id
    where new.home_team_id = t.id or new.away_team_id = t.id;
  end if;
  return new;
end;
$$;

create trigger match_finished_trg
  after update on matches
  for each row execute procedure trg_match_finished();

-- Leaderboard view
create or replace view leaderboard as
select
  bs.bracket_id,
  p.display_name,
  b.name as bracket_name,
  bs.points,
  rank() over (order by bs.points desc, b.created_at asc) as rank
from bracket_scores bs
join brackets b on b.id = bs.bracket_id
join profiles p on p.id = b.user_id
order by rank;
