-- Group-stage fixtures for WC2026
-- Each group: matchday 1 (pairs 1v4, 2v3), matchday 2 (1v3, 2v4), matchday 3 (1v2, 3v4)
-- Kickoff times are approximate placeholders; the sync job will overwrite with real data.

do $$
declare
  grp record;
  t1 smallint; t2 smallint; t3 smallint; t4 smallint;
  base_date date := '2026-06-11';
  day_offset int;
begin
  for grp in
    select group_code, array_agg(id order by id) as ids
    from teams
    where group_code is not null
    group by group_code
    order by group_code
  loop
    t1 := grp.ids[1]; t2 := grp.ids[2]; t3 := grp.ids[3]; t4 := grp.ids[4];
    -- Groups A-L spread across ~21 days (3 matchdays, 7 days apart)
    day_offset := (ascii(grp.group_code) - ascii('A'));

    -- Matchday 1
    insert into matches (stage, group_code, home_team_id, away_team_id, kickoff_at)
    values
      ('GROUP', grp.group_code, t1, t4, (base_date + day_offset * interval '1 day') + interval '18 hours'),
      ('GROUP', grp.group_code, t2, t3, (base_date + day_offset * interval '1 day') + interval '21 hours');

    -- Matchday 2
    insert into matches (stage, group_code, home_team_id, away_team_id, kickoff_at)
    values
      ('GROUP', grp.group_code, t1, t3, (base_date + (day_offset + 3) * interval '1 day') + interval '18 hours'),
      ('GROUP', grp.group_code, t2, t4, (base_date + (day_offset + 3) * interval '1 day') + interval '21 hours');

    -- Matchday 3 (simultaneous)
    insert into matches (stage, group_code, home_team_id, away_team_id, kickoff_at)
    values
      ('GROUP', grp.group_code, t1, t2, (base_date + (day_offset + 6) * interval '1 day') + interval '20 hours'),
      ('GROUP', grp.group_code, t3, t4, (base_date + (day_offset + 6) * interval '1 day') + interval '20 hours');
  end loop;
end;
$$;

-- Knockout placeholder matches (team IDs unknown until groups finish)
-- R32: 16 matches
insert into matches (stage, kickoff_at) values
  ('R32', '2026-07-04 18:00:00Z'), ('R32', '2026-07-04 21:00:00Z'),
  ('R32', '2026-07-05 18:00:00Z'), ('R32', '2026-07-05 21:00:00Z'),
  ('R32', '2026-07-06 18:00:00Z'), ('R32', '2026-07-06 21:00:00Z'),
  ('R32', '2026-07-07 18:00:00Z'), ('R32', '2026-07-07 21:00:00Z'),
  ('R32', '2026-07-08 18:00:00Z'), ('R32', '2026-07-08 21:00:00Z'),
  ('R32', '2026-07-09 18:00:00Z'), ('R32', '2026-07-09 21:00:00Z'),
  ('R32', '2026-07-10 18:00:00Z'), ('R32', '2026-07-10 21:00:00Z'),
  ('R32', '2026-07-11 18:00:00Z'), ('R32', '2026-07-11 21:00:00Z');

-- R16: 8 matches
insert into matches (stage, kickoff_at) values
  ('R16', '2026-07-14 18:00:00Z'), ('R16', '2026-07-14 21:00:00Z'),
  ('R16', '2026-07-15 18:00:00Z'), ('R16', '2026-07-15 21:00:00Z'),
  ('R16', '2026-07-16 18:00:00Z'), ('R16', '2026-07-16 21:00:00Z'),
  ('R16', '2026-07-17 18:00:00Z'), ('R16', '2026-07-17 21:00:00Z');

-- QF: 4 matches
insert into matches (stage, kickoff_at) values
  ('QF', '2026-07-19 18:00:00Z'), ('QF', '2026-07-19 21:00:00Z'),
  ('QF', '2026-07-20 18:00:00Z'), ('QF', '2026-07-20 21:00:00Z');

-- SF: 2 matches
insert into matches (stage, kickoff_at) values
  ('SF', '2026-07-23 20:00:00Z'),
  ('SF', '2026-07-24 20:00:00Z');

-- 3rd place + Final
insert into matches (stage, kickoff_at) values
  ('THIRD', '2026-07-26 18:00:00Z'),
  ('FINAL', '2026-07-26 21:00:00Z');
