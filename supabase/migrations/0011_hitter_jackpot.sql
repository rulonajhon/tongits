-- "Hitter" jackpot system: a separate pooled pot, funded by a per-hand
-- contribution, that only pays out when the same player wins
-- `required_consecutive_wins` hands in a row (default 2). This is
-- independent of the existing per-hand win-streak payout multiplier on
-- room_players (which multiplies a player's own hand winnings) — the
-- jackpot is a shared pool paid out as a lump sum on top of normal scoring.
-- Reuses room_players.total_score as the payout ledger; this app has no
-- separate coin/wallet system.
alter table public.rooms add column current_hitter_player_id uuid references public.profiles (id);
alter table public.rooms add column hitter_win_streak int not null default 0;
alter table public.rooms add column required_consecutive_wins int not null default 2;
alter table public.rooms add column jackpot_amount int not null default 0;
alter table public.rooms add column jackpot_starting_amount int not null default 0;
alter table public.rooms add column ante_per_player int not null default 0;
alter table public.rooms add column jackpot_contribution_per_hand int not null default 0;
alter table public.rooms add column jackpot_contribution_mode text not null default 'fixed_per_hand'
  check (jackpot_contribution_mode in ('ante_per_player', 'fixed_per_hand', 'manual'));
alter table public.rooms add column jackpot_reset_mode text not null default 'reset_to_base'
  check (jackpot_reset_mode in ('reset_to_zero', 'reset_to_base'));
alter table public.rooms add column hitter_updated_at timestamptz;
alter table public.rooms add column jackpot_version int not null default 0;

-- One row per hand that had an official winner. The unique constraint on
-- game_id is the idempotency guard: a hand can only ever produce one Hitter
-- transition, so a retried/duplicate settlement attempt can never award the
-- jackpot twice — it simply fails to insert a second row (see
-- apply_game_action's `on conflict (game_id) do nothing` below).
create table public.hitter_history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  game_id uuid not null references public.games (id),
  hand_winner_player_id uuid references public.profiles (id),
  previous_hitter_player_id uuid references public.profiles (id),
  new_hitter_player_id uuid references public.profiles (id),
  previous_streak int not null,
  new_streak int not null,
  jackpot_before int not null,
  jackpot_after int not null,
  jackpot_awarded boolean not null default false,
  jackpot_winner_player_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (game_id)
);

alter table public.hitter_history enable row level security;
create policy "members can view their room's hitter history" on public.hitter_history
  for select using (public.is_room_member(room_id));

-- Jackpot contribution happens once per new hand, before dealing, per the
-- room's configured mode. Folded into start_game (already the single choke
-- point for both a room's first hand and every rematch in it).
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
  v_mode text;
begin
  if (select status from public.rooms where id = p_room_id) <> 'waiting' then
    raise exception 'room_not_waiting';
  end if;

  if (select count(*) from public.room_players where room_id = p_room_id) <> 3 then
    raise exception 'room_not_full';
  end if;

  select jackpot_contribution_mode into v_mode from public.rooms where id = p_room_id;

  if v_mode = 'ante_per_player' then
    update public.room_players
    set total_score = total_score - (select ante_per_player from public.rooms where id = p_room_id)
    where room_id = p_room_id;

    update public.rooms
    set
      jackpot_amount = jackpot_amount + (ante_per_player * (select count(*) from public.room_players where room_id = p_room_id)),
      jackpot_version = jackpot_version + 1
    where id = p_room_id;
  elsif v_mode = 'fixed_per_hand' then
    update public.rooms
    set
      jackpot_amount = jackpot_amount + jackpot_contribution_per_hand,
      jackpot_version = jackpot_version + 1
    where id = p_room_id;
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

  -- Room-level cumulative score + win streak, persisted across rematches.
  for v_item in select * from jsonb_array_elements(coalesce(p_patch -> 'room_player_updates', '[]'::jsonb))
  loop
    update public.room_players
    set
      total_score = total_score + (v_item ->> 'score_delta')::int + coalesce((v_item ->> 'jackpot_delta')::int, 0),
      win_streak = (v_item ->> 'win_streak')::int
    where room_id = v_game.room_id and player_id = (v_item ->> 'player_id')::uuid;
  end loop;

  -- Hitter jackpot state transition, computed by the edge function and
  -- applied here in the same version-gated transaction as the rest of the
  -- hand settlement — this is what makes it impossible to double-process.
  if p_patch ? 'room' then
    update public.rooms
    set
      current_hitter_player_id = case
        when p_patch -> 'room' ? 'current_hitter_player_id'
          then nullif(p_patch -> 'room' ->> 'current_hitter_player_id', '')::uuid
        else current_hitter_player_id
      end,
      hitter_win_streak = coalesce((p_patch -> 'room' ->> 'hitter_win_streak')::int, hitter_win_streak),
      jackpot_amount = coalesce((p_patch -> 'room' ->> 'jackpot_amount')::int, jackpot_amount),
      hitter_updated_at = coalesce((p_patch -> 'room' ->> 'hitter_updated_at')::timestamptz, hitter_updated_at),
      jackpot_version = jackpot_version + 1
    where id = v_game.room_id;
  end if;

  if p_patch ? 'hitter_history' then
    insert into public.hitter_history (
      room_id, game_id, hand_winner_player_id, previous_hitter_player_id, new_hitter_player_id,
      previous_streak, new_streak, jackpot_before, jackpot_after, jackpot_awarded, jackpot_winner_player_id
    )
    values (
      v_game.room_id,
      p_game_id,
      nullif(p_patch -> 'hitter_history' ->> 'hand_winner_player_id', '')::uuid,
      nullif(p_patch -> 'hitter_history' ->> 'previous_hitter_player_id', '')::uuid,
      nullif(p_patch -> 'hitter_history' ->> 'new_hitter_player_id', '')::uuid,
      (p_patch -> 'hitter_history' ->> 'previous_streak')::int,
      (p_patch -> 'hitter_history' ->> 'new_streak')::int,
      (p_patch -> 'hitter_history' ->> 'jackpot_before')::int,
      (p_patch -> 'hitter_history' ->> 'jackpot_after')::int,
      (p_patch -> 'hitter_history' ->> 'jackpot_awarded')::boolean,
      nullif(p_patch -> 'hitter_history' ->> 'jackpot_winner_player_id', '')::uuid
    )
    on conflict (game_id) do nothing;
  end if;

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
