-- ============================================================
-- 0009_payment.sql  –  Payment tracking per group membership
-- ============================================================

alter table group_memberships
  add column if not exists paid boolean not null default false;
