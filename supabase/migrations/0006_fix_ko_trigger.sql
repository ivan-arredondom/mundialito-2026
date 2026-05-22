-- Fix trg_ko_pick_changed: skip score refresh when the bracket no longer exists
-- (happens during cascade-delete of a user's data)
create or replace function trg_ko_pick_changed()
returns trigger language plpgsql as $$
declare
  v_bracket_id uuid := coalesce(new.bracket_id, old.bracket_id);
begin
  if exists (select 1 from brackets where id = v_bracket_id) then
    perform refresh_bracket_score(v_bracket_id);
  end if;
  return coalesce(new, old);
end;
$$;
