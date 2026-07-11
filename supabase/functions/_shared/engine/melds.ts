import { RANK_ORDER, parseCard } from './deck.ts'
import type { CardCode, MeldType } from './types.ts'

export interface MeldValidationResult {
  valid: boolean
  reason?: string
}

/** A set: 3-4 cards, same rank, distinct suits. */
export function isValidSet(cards: CardCode[]): MeldValidationResult {
  if (cards.length < 3 || cards.length > 4) {
    return { valid: false, reason: 'A set must have 3 or 4 cards' }
  }
  const parsed = cards.map(parseCard)
  const rank = parsed[0].rank
  if (!parsed.every((c) => c.rank === rank)) {
    return { valid: false, reason: 'All cards in a set must share the same rank' }
  }
  const suits = new Set(parsed.map((c) => c.suit))
  if (suits.size !== parsed.length) {
    return { valid: false, reason: 'A set cannot contain duplicate suits' }
  }
  return { valid: true }
}

/** A run: 3+ consecutive ranks, same suit, ace-low only (no Q-K-A wraparound). */
export function isValidRun(cards: CardCode[]): MeldValidationResult {
  if (cards.length < 3) {
    return { valid: false, reason: 'A run must have at least 3 cards' }
  }
  const parsed = cards.map(parseCard)
  const suit = parsed[0].suit
  if (!parsed.every((c) => c.suit === suit)) {
    return { valid: false, reason: 'All cards in a run must share the same suit' }
  }
  const orders = parsed.map((c) => RANK_ORDER[c.rank]).sort((a, b) => a - b)
  for (let i = 1; i < orders.length; i++) {
    if (orders[i] === orders[i - 1]) {
      return { valid: false, reason: 'A run cannot contain duplicate ranks' }
    }
    if (orders[i] !== orders[i - 1] + 1) {
      return { valid: false, reason: 'A run must be consecutive ranks (ace-low only, no wraparound)' }
    }
  }
  return { valid: true }
}

export function isValidMeld(type: MeldType, cards: CardCode[]): MeldValidationResult {
  return type === 'set' ? isValidSet(cards) : isValidRun(cards)
}

/**
 * Sapaw: attaching `addedCards` to an existing meld's cards must still form a valid
 * meld of the same type. Extra cards for a set beyond 4 are always invalid.
 */
export function isValidSapaw(
  meldType: MeldType,
  existingCards: CardCode[],
  addedCards: CardCode[],
): MeldValidationResult {
  if (addedCards.length === 0) {
    return { valid: false, reason: 'Must add at least one card' }
  }
  const combined = [...existingCards, ...addedCards]
  const uniqueCombined = new Set(combined)
  if (uniqueCombined.size !== combined.length) {
    return { valid: false, reason: 'Cannot add a duplicate card to a meld' }
  }
  return isValidMeld(meldType, combined)
}
