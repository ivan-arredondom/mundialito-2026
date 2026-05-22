-- ============================================================
-- 0010_prizes.sql  –  Prize pool settings per group
-- ============================================================

alter table groups
  add column if not exists entry_fee    numeric(10,2) not null default 50,
  add column if not exists fee_per      text          not null default 'person',  -- 'person' | 'bracket'
  add column if not exists platform_fee_pct numeric(4,2) not null default 5,     -- admin-only, max 10
  add column if not exists prize_splits jsonb         not null default '[{"place":1,"pct":55},{"place":2,"pct":30},{"place":3,"pct":15}]';
