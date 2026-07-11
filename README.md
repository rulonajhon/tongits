# Tongits

A multiplayer Tongits (Filipino card game, Tongits Go–inspired) web app.
React + TypeScript + Vite + Tailwind + Framer Motion + Zustand on the
frontend; Supabase (Postgres, Auth, Realtime, Edge Functions) on the
backend. See [RULES.md](./RULES.md) for the exact ruleset enforced
server-side.

This is a **playable MVP**: auth, lobby, room creation/joining, a waiting
room, and one complete, server-authoritative 3-player Tongits round with
real-time sync. Deep reconnection (AI takeover) and most of the
"future expansion" feature list are architected for but not built — see
[Future Extensions](#future-extensions) below.

## Architecture at a glance

- **Server authority.** All game-mutating writes happen only inside
  Supabase Edge Functions (`supabase/functions/*`) using the service-role
  key. Row Level Security blocks every client `INSERT`/`UPDATE`/`DELETE` on
  game tables — clients only ever `SELECT`.
- **Shared rules engine.** `supabase/functions/_shared/engine/` is pure,
  dependency-free TypeScript (deck, meld/run/sapaw validation, scoring, win
  detection). It's imported directly by the Edge Functions (authoritative)
  and by the frontend via the `@engine` alias (for optimistic UI hints
  only — the server copy is what's actually enforced). It's unit-tested
  with Vitest independent of any database.
- **Hiding hands.** `player_hands` is deliberately never added to the
  Realtime publication. Clients re-fetch their own hand (RLS-restricted to
  `player_id = auth.uid()`) whenever a non-sensitive table change tells
  them something happened — opponents' hand sizes are broadcast via
  `game_players.hand_count`, never their contents.
- **Concurrency.** Every game action goes through a single
  `apply_game_action` Postgres RPC gated by an optimistic-concurrency
  `version` column on `games` (`WHERE id = $1 AND version = $2`). Rule
  validation happens in TypeScript beforehand; the RPC's only job is to
  persist the resulting patch atomically. A losing race gets a `409
  version_conflict` and can safely retry.

## Project layout

```
src/                        Frontend (Vite + React)
  services/supabase/        Typed wrappers around the Supabase client & Edge Functions
  stores/                   Zustand stores (auth, lobby, room, game)
  hooks/                    useAuth, usePresence, useRoomChannel, useGameChannel, useSound
  components/{ui,lobby,room,game}/
  pages/                    LoginPage, RegisterPage, LobbyPage, WaitingRoomPage, GamePage
  types/                    Hand-written mirror of the DB schema + game/room types

supabase/
  migrations/                Schema, RLS policies, realtime publication, RPCs
  functions/
    _shared/engine/          The rules engine (deck, melds, scoring, actions, dealing)
    create-room/ join-room/ start-game/ game-action/
```

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`, or via your package manager) — needed to apply migrations and deploy Edge Functions

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com/dashboard), then
grab the **Project URL** and **anon public key** from Project Settings →
API.

### 3. Configure environment variables

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 4. Apply the database migrations

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates every table, RLS policy, the realtime publication, the
`handle_new_user` signup trigger, and the `start_game` / `apply_game_action`
RPCs. (If you'd rather not install the CLI, you can paste each file in
`supabase/migrations/`, in order, into the Supabase SQL Editor instead.)

### 5. Deploy the Edge Functions

```bash
supabase functions deploy create-room
supabase functions deploy join-room
supabase functions deploy start-game
supabase functions deploy game-action
```

These run with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` already
available as built-in Edge Function secrets — no extra config needed.

### 6. Enable email auth

In the Supabase dashboard under Authentication → Providers, email sign-up
is on by default. For local dev without email confirmation, you can turn
off "Confirm email" under Authentication → Settings.

### 7. Run it

```bash
npm run dev
```

Open three browser sessions (or profiles) to play a full 3-player round
end-to-end.

## Testing

```bash
npm test         # Vitest — the rules engine's full unit test suite
npm run build    # tsc -b && vite build
```

The engine tests (deck integrity, set/run/sapaw validation including
ace-low-only enforcement, scoring math, fight/showdown comparison, full
turn-action flows including win detection) run without any database or
network access.

## Future Extensions

The schema and architecture were designed so these have an obvious home
without a rewrite:

| Feature | Hook point |
|---|---|
| Reconnection + AI takeover | `game_players.is_connected` is already tracked; add a scheduled Edge Function or `pg_cron` job to detect a stale connection and either wait or hand the seat to a bot player |
| Rematch | `games.room_id` isn't unique — a room can host multiple `games` rows; add a "Rematch" action that calls `start-game` again |
| Bot players | Bots are just another caller of `game-action` with a service-role-issued action — no schema change needed |
| Ranked mode / Leaderboard | `game_results` already has a durable per-game score record; aggregate it into a `profiles.rating` or a materialized view |
| Coins / Daily rewards | Add a `wallets` table and debit/credit it from within `apply_game_action` alongside `game_players.score` |
| Friends list / Private chat | New `friendships` / `messages` tables with the same RLS pattern used throughout |
| Spectator mode | Add a `spectate` RLS policy variant that exposes `game_players`/`melds`/`moves` (never `player_hands`) to non-participants |
| Custom avatars | `profiles.avatar_url` already exists; add Supabase Storage upload |

## Security notes

- Never commit `.env` (already gitignored) — it holds the anon key, which
  is safe to ship to the browser, but keep the **service-role key** out of
  the frontend entirely; it only ever belongs in Edge Function secrets.
- All RLS policies are additive-only SELECT policies (see
  `supabase/migrations/0005_rls_policies.sql`) — there is intentionally no
  client-side write path to any game table.
