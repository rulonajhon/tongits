-- Applies one pre-validated turn action atomically. All Tongits rule
-- validation (turn ownership, meld/run/sapaw legality, Tongits-declare
-- legality) happens in TypeScript in the `game-action` Edge Function using
-- the shared engine *before* this is ever called — this function's only job
-- is to persist the resulting patch as a single transaction, gated by an
-- optimistic-concurrency check on games.version so concurrent/duplicate
-- submissions can never both apply.
--
-- p_patch shape (all fields optional except where noted):
-- {
--   "game": {                                   -- required
--     "status": "playing" | "fight" | "finished",
--     "current_turn_player_id": uuid | null,
--     "turn_number": int,
--     "has_drawn_this_turn": bool,
--     "deck": [cardCode, ...],
--     "discard_pile": [cardCode, ...],
--     "winner_id": uuid | null,
--     "win_type": "meld_out" | "tongits" | "fight" | "draw" | null,
--     "ended_at": timestamptz | null
--   },
--   "hands": [{ "player_id": uuid, "cards": [cardCode, ...] }, ...],
--   "hand_counts": [{ "player_id": uuid, "hand_count": int }, ...],
--   "melds_insert": [{ "id": uuid, "owner_id": uuid, "type": "set"|"run", "cards": [...] }, ...],
--   "melds_update": [{ "id": uuid, "cards": [cardCode, ...] }, ...],
--   "move": { "player_id": uuid, "action": string, "payload": jsonb },
--   "results": [{ "player_id": uuid, "score": int, "is_winner": bool, "hand_value": int, "breakdown": string }, ...]
-- }
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

  return jsonb_build_object('game', to_jsonb(v_game));
end;
$$;

revoke all on function public.apply_game_action(uuid, int, jsonb) from public;
grant execute on function public.apply_game_action(uuid, int, jsonb) to service_role;
