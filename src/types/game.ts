import type { CardCode, MeldType } from '@engine/types'

export type { Card, CardCode, MeldType, Rank, Suit } from '@engine/types'

export interface Meld {
  id: string
  gameId: string
  ownerId: string
  type: MeldType
  cards: CardCode[]
  isSapaw: boolean
  createdAt: string
}

export type GameStatus = 'dealing' | 'playing' | 'fight' | 'finished'

export type WinType = 'meld_out' | 'tongits' | 'fight' | 'draw'

export interface GamePlayerPublic {
  gameId: string
  playerId: string
  seat: number
  handCount: number
  score: number
  isConnected: boolean
  username: string
  avatarUrl: string | null
}

export interface GameStateRow {
  id: string
  roomId: string
  status: GameStatus
  currentTurnPlayerId: string | null
  turnNumber: number
  hasDrawnThisTurn: boolean
  version: number
  discardPile: CardCode[]
  drawPileCount: number
  dealerId: string
  winnerId: string | null
  winType: WinType | null
  startedAt: string
  endedAt: string | null
  /** When the current draw/discard phase expires — see useTurnTimer. */
  turnDeadline: string | null
}

export type GameActionType =
  | 'draw'
  | 'discard'
  | 'meld'
  | 'sapaw'
  | 'call_tongits'
  | 'call_fight'
  | 'claim_timeout'

export interface DrawActionPayload {
  action: 'draw'
}

export interface DiscardActionPayload {
  action: 'discard'
  card: CardCode
}

export interface MeldActionPayload {
  action: 'meld'
  type: MeldType
  cards: CardCode[]
}

export interface SapawActionPayload {
  action: 'sapaw'
  meldId: string
  cards: CardCode[]
}

export interface CallTongitsActionPayload {
  action: 'call_tongits'
  /** Final melds/sapaws consuming the whole hand in one shot. */
  melds: Array<{ type: MeldType; cards: CardCode[] } | { meldId: string; cards: CardCode[] }>
}

export interface CallFightActionPayload {
  action: 'call_fight'
}

export interface ClaimTimeoutActionPayload {
  action: 'claim_timeout'
}

export type GameActionPayload =
  | DrawActionPayload
  | DiscardActionPayload
  | MeldActionPayload
  | SapawActionPayload
  | CallTongitsActionPayload
  | CallFightActionPayload
  | ClaimTimeoutActionPayload

export interface PlayerResult {
  playerId: string
  score: number
  isWinner: boolean
  handValue: number
  breakdown: string
}

export interface GameResults {
  gameId: string
  results: PlayerResult[]
}
