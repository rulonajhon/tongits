-- Non-sensitive tables only. `player_hands` is intentionally never added
-- here — clients re-fetch their own hand via an authenticated SELECT
-- whenever one of these broadcasts tells them something changed.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.melds;
alter publication supabase_realtime add table public.moves;
