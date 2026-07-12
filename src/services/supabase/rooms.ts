import { supabase } from './client'
import type { Room, RoomPlayer } from '@/types/room'

export interface CreateRoomResult {
  roomId: string
  roomNumber: string
  inviteCode: string
}

export async function createRoom(): Promise<CreateRoomResult> {
  const { data, error } = await supabase.functions.invoke<CreateRoomResult>('create-room', { body: {} })
  if (error) throw error
  if (!data) throw new Error('No response from create-room')
  return data
}

export async function joinRoomByNumber(roomNumber: string): Promise<{ roomId: string }> {
  const { data, error } = await supabase.functions.invoke<{ roomId: string }>('join-room', {
    body: { roomNumber },
  })
  if (error) throw error
  if (!data) throw new Error('No response from join-room')
  return data
}

export async function startGame(roomId: string): Promise<{ gameId: string }> {
  const { data, error } = await supabase.functions.invoke<{ gameId: string }>('start-game', {
    body: { roomId },
  })
  if (error) throw error
  if (!data) throw new Error('No response from start-game')
  return data
}

/** Removes the caller from the room. Only allowed while the room isn't mid-round. */
export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('leave-room', { body: { roomId } })
  if (error) throw error
}

export async function fetchRoom(roomId: string): Promise<Room> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single()
  if (error) throw error
  return {
    id: data.id,
    roomNumber: data.room_number,
    inviteCode: data.invite_code,
    hostId: data.host_id,
    status: data.status,
    maxPlayers: data.max_players,
    createdAt: data.created_at,
  }
}

interface RoomPlayerRow {
  id: string
  room_id: string
  player_id: string
  seat: number
  is_host: boolean
  is_connected: boolean
  joined_at: string
  total_score: number
  win_streak: number
  profiles: { username: string; avatar_url: string | null } | null
}

export async function fetchRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select(
      'id, room_id, player_id, seat, is_host, is_connected, joined_at, total_score, win_streak, profiles(username, avatar_url)',
    )
    .eq('room_id', roomId)
    .order('seat', { ascending: true })

  if (error) throw error

  return ((data ?? []) as unknown as RoomPlayerRow[]).map((row) => ({
    id: row.id,
    roomId: row.room_id,
    playerId: row.player_id,
    seat: row.seat,
    isHost: row.is_host,
    isConnected: row.is_connected,
    joinedAt: row.joined_at,
    username: row.profiles?.username ?? 'Player',
    avatarUrl: row.profiles?.avatar_url ?? null,
    totalScore: row.total_score,
    winStreak: row.win_streak,
  }))
}
