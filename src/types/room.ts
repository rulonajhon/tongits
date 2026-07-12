export type RoomStatus = 'waiting' | 'in_progress' | 'completed'

export interface Room {
  id: string
  roomNumber: string
  inviteCode: string
  hostId: string
  status: RoomStatus
  maxPlayers: number
  createdAt: string
}

export interface RoomPlayer {
  id: string
  roomId: string
  playerId: string
  seat: number
  isHost: boolean
  isConnected: boolean
  joinedAt: string
  username: string
  avatarUrl: string | null
  /** Cumulative score across every round played in this room (persists across rematches). */
  totalScore: number
  /** Consecutive round wins — any non-win resets this to 0. */
  winStreak: number
}
