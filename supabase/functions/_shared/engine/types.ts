export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

/** Card code, e.g. "AS", "10H", "KD". */
export type CardCode = string

export interface Card {
  rank: Rank
  suit: Suit
  code: CardCode
}

export type MeldType = 'set' | 'run'

/** A meld as it exists on the table — no DB metadata, just the shape the engine reasons about. */
export interface TableMeld {
  id: string
  ownerId: string
  type: MeldType
  cards: CardCode[]
}

export interface EngineHand {
  playerId: string
  cards: CardCode[]
  /** True once this player has discarded at least once this round (disqualifies a Tongits declare). */
  hasDiscarded: boolean
}

export interface EngineGameState {
  deck: CardCode[]
  discardPile: CardCode[]
  melds: TableMeld[]
  hands: EngineHand[]
  /** Seat order, e.g. [player0, player1, player2]; turn advances through this cyclically. */
  playerOrder: string[]
  currentTurnPlayerId: string
  /** Whether the current player has already drawn this turn. */
  hasDrawnThisTurn: boolean
  status: 'dealing' | 'playing' | 'fight' | 'finished'
}

export interface WinResult {
  winnerId: string | null
  winType: 'meld_out' | 'tongits' | 'fight' | 'draw'
  /** Per-player unmelded hand value at the moment the game ended, for scoring/display. */
  finalHands: Array<{ playerId: string; cards: CardCode[] }>
}

export class EngineError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'EngineError'
    this.code = code
  }
}
