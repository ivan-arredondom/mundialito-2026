-- ============================================================
-- 0011_group_visibility.sql  –  Control which groups appear in global leaderboard
-- ============================================================

alter table groups
  add column if not exists show_in_global boolean not null default true;
