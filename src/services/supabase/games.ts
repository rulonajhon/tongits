import { supabase } from './client'
import type { CardCode } from '@engine/types'
import type {
  GameActionPayload,
  GamePlayerPublic,
  GameResults,
  GameStateRow,
  Meld,
  PlayerResult,
} from '@/types/game'

export interface GameActionResponse {
  ok: boolean
  game: unknown
  drawnCard?: CardCode
}

export async function sendGameAction(gameId: string, payload: GameActionPayload): Promise<GameActionResponse> {
  const { data, error } = await supabase.functions.invoke<GameActionResponse>('game-action', {
    body: { gameId, ...payload },
  })
  if (error) throw error
  if (!data) throw new Error('No response from game-action')
  return data
}

/** Used by the waiting room: once a room flips to 'in_progress', find the game it started. */
export async function fetchLatestGameIdForRoom(roomId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('games')
    .select('id')
    .eq('room_id', roomId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function fetchGame(gameId: string): Promise<GameStateRow> {
  const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single()
  if (error) throw error
  return {
    id: data.id,
    roomId: data.room_id,
    status: data.status,
    currentTurnPlayerId: data.current_turn_player_id,
    turnNumber: data.turn_number,
    hasDrawnThisTurn: data.has_drawn_this_turn,
    version: data.version,
    discardPile: (data.discard_pile as unknown as CardCode[]) ?? [],
    drawPileCount: ((data.deck as unknown as CardCode[]) ?? []).length,
    dealerId: data.dealer_id,
    winnerId: data.winner_id,
    winType: data.win_type,
    startedAt: data.started_at,
    endedAt: data.ended_at,
  }
}

interface GamePlayerRow {
  game_id: string
  player_id: string
  seat: number
  hand_count: number
  score: number
  is_connected: boolean
  profiles: { username: string; avatar_url: string | null } | null
}

export async function fetchGamePlayers(gameId: string): Promise<GamePlayerPublic[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select('game_id, player_id, seat, hand_count, score, is_connected, profiles(username, avatar_url)')
    .eq('game_id', gameId)
    .order('seat', { ascending: true })
  if (error) throw error

  return ((data ?? []) as unknown as GamePlayerRow[]).map((row) => ({
    gameId: row.game_id,
    playerId: row.player_id,
    seat: row.seat,
    handCount: row.hand_count,
    score: row.score,
    isConnected: row.is_connected,
    username: row.profiles?.username ?? 'Player',
    avatarUrl: row.profiles?.avatar_url ?? null,
  }))
}

export async function fetchOwnHand(gameId: string, playerId: string): Promise<CardCode[]> {
  const { data, error } = await supabase
    .from('player_hands')
    .select('cards')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .maybeSingle()
  if (error) throw error
  return (data?.cards as unknown as CardCode[]) ?? []
}

export async function fetchMelds(gameId: string): Promise<Meld[]> {
  const { data, error } = await supabase.from('melds').select('*').eq('game_id', gameId)
  if (error) throw error
  return (data ?? []).map((m) => ({
    id: m.id,
    gameId: m.game_id,
    ownerId: m.owner_id,
    type: m.type,
    cards: m.cards as unknown as CardCode[],
    isSapaw: m.is_sapaw,
    createdAt: m.created_at,
  }))
}

interface PlayerResultRow {
  player_id: string
  score: number
  is_winner: boolean
  hand_value: number
  breakdown: string
}

export async function fetchGameResults(gameId: string): Promise<GameResults | null> {
  const { data, error } = await supabase
    .from('game_results')
    .select('*')
    .eq('game_id', gameId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const rows = data.results as unknown as PlayerResultRow[]
  const results: PlayerResult[] = rows.map((r) => ({
    playerId: r.player_id,
    score: r.score,
    isWinner: r.is_winner,
    handValue: r.hand_value,
    breakdown: r.breakdown,
  }))
  return { gameId: data.game_id, results }
}
