create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null,
  invite_code text not null default encode(gen_random_bytes(6), 'hex'),
  host_id uuid not null references public.profiles (id),
  status text not null default 'waiting' check (status in ('waiting', 'in_progress', 'completed')),
  max_players smallint not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Room numbers only need to be unique among rooms that are still active.
create unique index rooms_active_room_number_idx on public.rooms (room_number)
  where status <> 'completed';

create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  seat smallint not null,
  is_host boolean not null default false,
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, player_id),
  unique (room_id, seat)
);
