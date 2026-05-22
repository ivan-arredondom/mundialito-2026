-- ============================================================
-- 0005_groups.sql  –  Groups / divisions + memberships
-- ============================================================

-- GROUPS (created by admins; users join via invite code at signup)
create table groups (
  id serial primary key,
  name text not null,
  code text not null unique,   -- invite code users enter at signup
  created_at timestamptz not null default now()
);

alter table groups enable row level security;
-- anyone can read (needed for client-side code validation at signup)
create policy "groups: public read"
  on groups for select using (true);
-- insert/update/delete restricted to service role only

-- GROUP MEMBERSHIPS
create table group_memberships (
  group_id int not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',  -- 'member' | 'mod'
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table group_memberships enable row level security;
create policy "group_memberships: member read own"
  on group_memberships for select using (auth.uid() = user_id);
create policy "group_memberships: member insert own"
  on group_memberships for insert with check (auth.uid() = user_id);

-- Update handle_new_user trigger to also create group membership when
-- a group_code is passed in user metadata at signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_group_code text;
  v_group_id int;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  v_group_code := new.raw_user_meta_data->>'group_code';
  if v_group_code is not null then
    select id into v_group_id from public.groups where code = v_group_code;
    if v_group_id is not null then
      insert into public.group_memberships (group_id, user_id)
      values (v_group_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

-- Seed initial group
insert into groups (name, code) values ('Testing Group', 'testingGroup');
