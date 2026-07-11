-- Adds a server-authoritative per-phase turn timer (30s to draw, 30s to
-- discard). The deadline is just a timestamp column — there's no persistent
-- process ticking it down. Instead, any connected client may call the
-- `claim_timeout` game-action once its local countdown reaches zero; the
-- edge function independently re-checks the real deadline against its own
-- clock before doing anything, so a client can never force an early
-- timeout, and concurrent claims from multiple clients are safe by the same
-- optimistic-concurrency (version) mechanism every other action already uses.
alter table public.games add column turn_deadline timestamptz;

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

  insert into public.games (room_id, status, current_turn_player_id, turn_number, version, deck, discard_pile, dealer_id, started_at, turn_deadline)
  values (p_room_id, 'playing', p_dealer_id, 0, 0, p_deck, '[]'::jsonb, p_dealer_id, now(), now() + interval '30 seconds')
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

  return jsonb_build_object('game', to_jsonb(v_game));
end;
$$;

revoke all on function public.apply_game_action(uuid, int, jsonb) from public;
grant execute on function public.apply_game_action(uuid, int, jsonb) to service_role;
