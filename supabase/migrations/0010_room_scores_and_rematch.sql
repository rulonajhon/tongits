-- Room-level state that persists across rematches in the same room:
-- - total_score: cumulative score across every round played in this room
-- - win_streak: consecutive personal round wins (any non-win resets it to 0)
-- A player's Nth consecutive win multiplies that round's payout — see
-- MAX_STREAK_MULTIPLIER in the shared engine's scoring.ts.
alter table public.room_players add column total_score int not null default 0;
alter table public.room_players add column win_streak int not null default 0;

create or replace function public.apply_game_action(
  p_game_id uuid,
  p_expected_version int,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_item jsonb;
begin
  update public.games
  set
    status = coalesce(p_patch -> 'game' ->> 'status', status),
    current_turn_player_id = case
      when p_patch -> 'game' ? 'current_turn_player_id'
        then nullif(p_patch -> 'game' ->> 'current_turn_player_id', '')::uuid
      else current_turn_player_id
    end,
    turn_number = coalesce((p_patch -> 'game' ->> 'turn_number')::int, turn_number),
    has_drawn_this_turn = coalesce((p_patch -> 'game' ->> 'has_drawn_this_turn')::boolean, has_drawn_this_turn),
    turn_deadline = case
      when p_patch -> 'game' ? 'turn_deadline'
        then nullif(p_patch -> 'game' ->> 'turn_deadline', '')::timestamptz
      else turn_deadline
    end,
    version = version + 1,
    deck = coalesce(p_patch -> 'game' -> 'deck', deck),
    discard_pile = coalesce(p_patch -> 'game' -> 'discard_pile', discard_pile),
    winner_id = case
      when p_patch -> 'game' ? 'winner_id'
        then nullif(p_patch -> 'game' ->> 'winner_id', '')::uuid
      else winner_id
    end,
    win_type = coalesce(p_patch -> 'game' ->> 'win_type', win_type),
    ended_at = case
      when p_patch -> 'game' ? 'ended_at'
        then nullif(p_patch -> 'game' ->> 'ended_at', '')::timestamptz
      else ended_at
    end
  where id = p_game_id and version = p_expected_version
  returning * into v_game;

  if not found then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_patch -> 'hands', '[]'::jsonb))
  loop
    insert into public.player_hands (game_id, player_id, cards, updated_at)
    values (p_game_id, (v_item ->> 'player_id')::uuid, v_item -> 'cards', now())
    on conflict (game_id, player_id)
    do update set cards = excluded.cards, updated_at = now();
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_patch -> 'hand_counts', '[]'::jsonb))
  loop
    update public.game_players
    set hand_count = (v_item ->> 'hand_count')::int
    where game_id = p_game_id and player_id = (v_item ->> 'player_id')::uuid;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_patch -> 'discarded_players', '[]'::jsonb))
  loop
    update public.game_players
    set has_discarded = true
    where game_id = p_game_id and player_id = (v_item #>> '{}')::uuid;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_patch -> 'melds_insert', '[]'::jsonb))
  loop
    insert into public.melds (id, game_id, owner_id, type, cards, is_sapaw)
    values (
      (v_item ->> 'id')::uuid,
      p_game_id,
      (v_item ->> 'owner_id')::uuid,
      v_item ->> 'type',
      v_item -> 'cards',
      false
    );
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_patch -> 'melds_update', '[]'::jsonb))
  loop
    update public.melds
    set cards = v_item -> 'cards', is_sapaw = true
    where id = (v_item ->> 'id')::uuid and game_id = p_game_id;
  end loop;

  if p_patch ? 'move' then
    insert into public.moves (game_id, player_id, action, payload)
    values (
      p_game_id,
      (p_patch -> 'move' ->> 'player_id')::uuid,
      p_patch -> 'move' ->> 'action',
      coalesce(p_patch -> 'move' -> 'payload', '{}'::jsonb)
    );
  end if;

  if p_patch ? 'results' then
    insert into public.game_results (game_id, results)
    values (p_game_id, p_patch -> 'results');

    for v_item in select * from jsonb_array_elements(p_patch -> 'results')
    loop
      update public.game_players
      set score = score + (v_item ->> 'score')::int
      where game_id = p_game_id and player_id = (v_item ->> 'player_id')::uuid;
    end loop;
  end if;

  -- Room-level cumulative score + win streak, persisted across rematches.
  for v_item in select * from jsonb_array_elements(coalesce(p_patch -> 'room_player_updates', '[]'::jsonb))
  loop
    update public.room_players
    set
      total_score = total_score + (v_item ->> 'score_delta')::int,
      win_streak = (v_item ->> 'win_streak')::int
    where room_id = v_game.room_id and player_id = (v_item ->> 'player_id')::uuid;
  end loop;

  -- Once a round ends, the room goes back to 'waiting' so the same three
  -- players can start another round (rematch) without re-joining.
  if p_patch -> 'game' ->> 'status' = 'finished' then
    update public.rooms set status = 'waiting', updated_at = now() where id = v_game.room_id;
  end if;

  return jsonb_build_object('game', to_jsonb(v_game));
end;
$$;

revoke all on function public.apply_game_action(uuid, int, jsonb) from public;
grant execute on function public.apply_game_action(uuid, int, jsonb) to service_role;
