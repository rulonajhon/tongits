-- All game-mutating writes happen exclusively in Edge Functions using the
-- service-role key, which bypasses RLS entirely. Every table below is
-- therefore SELECT-only for authenticated clients — no client INSERT/UPDATE/
-- DELETE policy exists on any of them except `profiles`.

alter table public.profiles enable row level security;
create policy "profiles are publicly readable" on public.profiles
  for select using (true);
create policy "users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

alter table public.rooms enable row level security;
create policy "members can view their rooms" on public.rooms
  for select using (public.is_room_member(id) or host_id = auth.uid());

alter table public.room_players enable row level security;
create policy "members can view their room roster" on public.room_players
  for select using (public.is_room_member(room_id));

alter table public.games enable row level security;
create policy "members can view their games" on public.games
  for select using (public.is_room_member(room_id));

alter table public.game_players enable row level security;
create policy "members can view their game roster" on public.game_players
  for select using (public.is_game_member(game_id));

-- The one table where hiding rows is load-bearing: a player must never be
-- able to SELECT another player's hand.
alter table public.player_hands enable row level security;
create policy "players can view only their own hand" on public.player_hands
  for select using (player_id = auth.uid());

alter table public.melds enable row level security;
create policy "members can view melds" on public.melds
  for select using (public.is_game_member(game_id));

alter table public.moves enable row level security;
create policy "members can view the move log" on public.moves
  for select using (public.is_game_member(game_id));

alter table public.game_results enable row level security;
create policy "members can view results" on public.game_results
  for select using (public.is_game_member(game_id));
