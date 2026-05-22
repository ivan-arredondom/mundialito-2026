-- ============================================================
-- 0007_admin.sql  –  Admin roles + global app settings
-- ============================================================

-- Add admin flags to profiles
alter table profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_global_mod boolean not null default false;

-- Global app settings (single-row config table)
create table app_settings (
  id int primary key default 1 check (id = 1),  -- enforces single row
  allow_registrations boolean not null default true,
  max_brackets_per_user int not null default 3
);

alter table app_settings enable row level security;
-- anyone can read (signup needs to check allow_registrations)
create policy "app_settings: public read"
  on app_settings for select using (true);
-- only service role can write

-- Seed default settings
insert into app_settings (id, allow_registrations, max_brackets_per_user)
values (1, true, 3)
on conflict (id) do nothing;
