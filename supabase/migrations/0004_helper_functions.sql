-- SECURITY DEFINER + table ownership lets these bypass RLS on the tables they
-- query, which is what avoids infinite recursion when a table's own RLS
-- policy calls one of these helpers.
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_players
    where room_id = p_room_id and player_id = auth.uid()
  );
$$;

create or replace function public.is_game_member(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.game_players
    where game_id = p_game_id and player_id = auth.uid()
  );
$$;
