import { buildDeck, shuffleDeck } from './deck.ts'
import type { EngineGameState } from './types.ts'

const HAND_SIZE = 12

export interface DealResult {
  state: EngineGameState
  hands: Record<string, string[]>
}

/**
 * Deals 12 cards to each player in `playerOrder`, then gives the dealer one
 * extra card as their turn-start draw. The dealer acts first.
 */
export function dealNewGame(playerOrder: string[], dealerId: string): DealResult {
  if (!playerOrder.includes(dealerId)) {
    throw new Error('Dealer must be one of the players')
  }
  let deck = shuffleDeck(buildDeck())

  const hands: Record<string, string[]> = {}
  for (const playerId of playerOrder) {
    hands[playerId] = deck.splice(0, HAND_SIZE)
  }
  // Dealer's turn-start draw, dealt face down along with everyone else's hand.
  hands[dealerId].push(deck.pop()!)

  const state: EngineGameState = {
    deck,
    discardPile: [],
    melds: [],
    hands: playerOrder.map((playerId) => ({
      playerId,
      cards: [...hands[playerId]],
      hasDiscarded: false,
    })),
    playerOrder: [...playerOrder],
    currentTurnPlayerId: dealerId,
    hasDrawnThisTurn: true,
    status: 'playing',
  }

  return { state, hands }
}
