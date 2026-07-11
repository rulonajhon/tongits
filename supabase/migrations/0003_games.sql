create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  status text not null default 'dealing' check (status in ('dealing', 'playing', 'fight', 'finished')),
  current_turn_player_id uuid references public.profiles (id),
  turn_number int not null default 0,
  has_drawn_this_turn boolean not null default true,
  -- Optimistic-concurrency guard: every mutation increments this; writes are
  -- gated on "WHERE version = expected_version" (see apply_game_action).
  version int not null default 0,
  deck jsonb not null default '[]'::jsonb,
  discard_pile jsonb not null default '[]'::jsonb,
  dealer_id uuid not null references public.profiles (id),
  winner_id uuid references public.profiles (id),
  win_type text check (win_type in ('meld_out', 'tongits', 'fight', 'draw')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index games_room_id_idx on public.games (room_id);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  seat smallint not null,
  hand_count int not null default 0,
  score int not null default 0,
  is_connected boolean not null default true,
  -- True once this player has discarded at least once this round — the
  -- engine uses this to tell a Tongits win (zero discards) apart from an
  -- ordinary meld-out win.
  has_discarded boolean not null default false,
  unique (game_id, player_id)
);

-- Card contents are only ever readable by the owning player (see RLS policies)
-- and are never added to the realtime publication.
create table public.player_hands (
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create table public.melds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  owner_id uuid not null references public.profiles (id),
  type text not null check (type in ('set', 'run')),
  cards jsonb not null,
  is_sapaw boolean not null default false,
  created_at timestamptz not null default now()
);

create index melds_game_id_idx on public.melds (game_id);

-- Server-side audit log of every validated action; also the source clients
-- listen to (over realtime) to know when to re-fetch their own hand.
create table public.moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index moves_game_id_idx on public.moves (game_id);

create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  results jsonb not null,
  created_at timestamptz not null default now()
);
