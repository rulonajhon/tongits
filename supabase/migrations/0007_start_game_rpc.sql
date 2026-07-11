-- Atomically transitions a full room into a started game. Called by the
-- `start-game` Edge Function, which computes the shuffle/deal client-side
-- (using the shared TS engine) and passes the result in for persistence.
-- p_hands shape: [{ "player_id": uuid, "seat": int, "cards": [cardCode, ...] }, ...]
create or replace function public.start_game(
  p_room_id uuid,
  p_dealer_id uuid,
  p_deck jsonb,
  p_hands jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
  v_hand jsonb;
begin
  if (select status from public.rooms where id = p_room_id) <> 'waiting' then
    raise exception 'room_not_waiting';
  end if;

  if (select count(*) from public.room_players where room_id = p_room_id) <> 3 then
    raise exception 'room_not_full';
  end if;

  insert into public.games (room_id, status, current_turn_player_id, turn_number, version, deck, discard_pile, dealer_id, started_at)
  values (p_room_id, 'playing', p_dealer_id, 0, 0, p_deck, '[]'::jsonb, p_dealer_id, now())
  returning id into v_game_id;

  for v_hand in select * from jsonb_array_elements(p_hands)
  loop
    insert into public.game_players (game_id, player_id, seat, hand_count, score, is_connected)
    values (
      v_game_id,
      (v_hand ->> 'player_id')::uuid,
      (v_hand ->> 'seat')::smallint,
      jsonb_array_length(v_hand -> 'cards'),
      0,
      true
    );

    insert into public.player_hands (game_id, player_id, cards)
    values (v_game_id, (v_hand ->> 'player_id')::uuid, v_hand -> 'cards');
  end loop;

  update public.rooms set status = 'in_progress', updated_at = now() where id = p_room_id;

  return v_game_id;
end;
$$;

revoke all on function public.start_game(uuid, uuid, jsonb, jsonb) from public;
grant execute on function public.start_game(uuid, uuid, jsonb, jsonb) to service_role;
