export type RoomStatus = 'waiting' | 'in_progress' | 'completed'

export type JackpotContributionMode = 'ante_per_player' | 'fixed_per_hand' | 'manual'
export type JackpotResetMode = 'reset_to_zero' | 'reset_to_base'

export interface Room {
  id: string
  roomNumber: string
  inviteCode: string
  hostId: string
  status: RoomStatus
  maxPlayers: number
  createdAt: string
  /** The "Hitter" jackpot system — see RULES.md. */
  currentHitterPlayerId: string | null
  hitterWinStreak: number
  requiredConsecutiveWins: number
  jackpotAmount: number
  jackpotStartingAmount: number
  antePerPlayer: number
  jackpotContributionPerHand: number
  jackpotContributionMode: JackpotContributionMode
  jackpotResetMode: JackpotResetMode
  hitterUpdatedAt: string | null
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
