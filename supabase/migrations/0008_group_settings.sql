-- ============================================================
-- 0008_group_settings.sql  –  Per-group limits
-- ============================================================

-- null = fall back to global app_settings value
alter table groups
  add column if not exists max_brackets_per_user int,
  add column if not exists max_members int;
