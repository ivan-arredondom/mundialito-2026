-- Live match scores table — written by the sync-scores Edge Function.
-- match_id links to matches.id when BSD has real team names (populated during tournament).
create table if not exists public.match_scores (
  event_id        text        primary key,
  match_id        integer     references public.matches(id) on delete set null,
  home_team       text        not null,
  away_team       text        not null,
  home_score      integer,
  away_score      integer,
  home_score_ht   integer,
  away_score_ht   integer,
  status          text        not null default 'SCHEDULED',
  period          text,
  current_minute  integer,
  group_name      text,
  round           text,
  event_date      timestamptz not null,
  last_updated    timestamptz,
  data_source     text        not null default 'bsd',
  synced_at       timestamptz not null default now()
);

create index if not exists match_scores_status_idx    on public.match_scores(status);
create index if not exists match_scores_event_date_idx on public.match_scores(event_date);
create index if not exists match_scores_match_id_idx  on public.match_scores(match_id);

alter table public.match_scores enable row level security;
create policy "match_scores_public_read" on public.match_scores for select using (true);

-- Enable Realtime so the frontend can subscribe to live score changes.
alter publication supabase_realtime add table public.match_scores;
