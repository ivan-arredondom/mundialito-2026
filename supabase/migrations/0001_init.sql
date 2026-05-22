-- ============================================================
-- 0001_init.sql  –  Core schema + RLS for Mundialito 2026
-- ============================================================

-- PROFILES (extends auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "profiles: owner read/write"
  on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: public read display_name"
  on profiles for select using (true);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure handle_new_user();

-- TEAMS
create table teams (
  id smallserial primary key,
  code text not null unique,   -- 'ARG', 'USA', …
  name text not null,
  group_code char(1),          -- 'A'..'L', null for playoff teams
  flag_url text
);

-- MATCHES
create type match_stage as enum ('GROUP','R32','R16','QF','SF','THIRD','FINAL');
create type match_status as enum ('SCHEDULED','IN_PLAY','FINISHED');

create table matches (
  id serial primary key,
  external_id text unique,
  stage match_stage not null,
  group_code char(1),
  home_team_id smallint references teams(id),
  away_team_id smallint references teams(id),
  kickoff_at timestamptz not null,
  home_score smallint,
  away_score smallint,
  status match_status not null default 'SCHEDULED'
);

-- BRACKETS
create table brackets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table brackets enable row level security;
create policy "brackets: owner full access"
  on brackets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "brackets: public read after lock"
  on brackets for select
  using (now() >= '2026-06-11T00:00:00Z'::timestamptz);

-- SCORE PREDICTIONS (group stage only)
create table score_predictions (
  bracket_id uuid not null references brackets(id) on delete cascade,
  match_id int not null references matches(id) on delete cascade,
  home_score smallint not null,
  away_score smallint not null,
  primary key (bracket_id, match_id)
);

alter table score_predictions enable row level security;
create policy "score_predictions: owner full access"
  on score_predictions for all
  using (exists (select 1 from brackets b where b.id = bracket_id and b.user_id = auth.uid()))
  with check (exists (select 1 from brackets b where b.id = bracket_id and b.user_id = auth.uid()));
create policy "score_predictions: public read after lock"
  on score_predictions for select
  using (now() >= '2026-06-11T00:00:00Z'::timestamptz);

-- ADVANCEMENT PREDICTIONS (knockout bracket picks)
create type knockout_stage as enum ('R32','R16','QF','SF','FINAL','CHAMPION');

create table advancement_predictions (
  bracket_id uuid not null references brackets(id) on delete cascade,
  team_id smallint not null references teams(id) on delete cascade,
  stage knockout_stage not null,
  primary key (bracket_id, team_id, stage)
);

alter table advancement_predictions enable row level security;
create policy "advancement_predictions: owner full access"
  on advancement_predictions for all
  using (exists (select 1 from brackets b where b.id = bracket_id and b.user_id = auth.uid()))
  with check (exists (select 1 from brackets b where b.id = bracket_id and b.user_id = auth.uid()));
create policy "advancement_predictions: public read after lock"
  on advancement_predictions for select
  using (now() >= '2026-06-11T00:00:00Z'::timestamptz);
