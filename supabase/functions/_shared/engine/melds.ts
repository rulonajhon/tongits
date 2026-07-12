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

/** True if `cards` forms a valid brand-new set OR run — type-agnostic check. */
export function isValidNewMeld(cards: CardCode[]): MeldValidationResult {
  const setResult = isValidSet(cards)
  if (setResult.valid) return setResult
  const runResult = isValidRun(cards)
  if (runResult.valid) return runResult
  return { valid: false, reason: 'Not a valid set or run' }
}

/**
 * Hand cards that could contribute to at least one brand-new set or run
 * together with `topDiscard` — used to hint which cards are relevant before
 * the player has finished selecting a combination. Only ever looks at the
 * given hand and the single discard card, never any other player's cards.
 */
export function discardMeldEligibleCards(topDiscard: CardCode, hand: CardCode[]): Set<CardCode> {
  const eligible = new Set<CardCode>()
  const discard = parseCard(topDiscard)

  // Set candidates: every hand card sharing the discard's rank is guaranteed
  // a different suit (a real deck never has two copies of the same card in
  // play at once), so any 2+ of them combine legally with the discard card.
  const rankMates = hand.filter((c) => parseCard(c).rank === discard.rank)
  if (rankMates.length >= 2) {
    for (const c of rankMates) eligible.add(c)
  }

  // Run candidates: same-suit hand cards forming a consecutive chain that
  // touches the discard's rank on either side.
  const suitMates = hand.filter((c) => parseCard(c).suit === discard.suit)
  const orderToCard = new Map(suitMates.map((c) => [RANK_ORDER[parseCard(c).rank], c]))
  const pivot = RANK_ORDER[discard.rank]

  const below: CardCode[] = []
  for (let order = pivot - 1; orderToCard.has(order); order--) below.push(orderToCard.get(order)!)

  const above: CardCode[] = []
  for (let order = pivot + 1; orderToCard.has(order); order++) above.push(orderToCard.get(order)!)

  if (below.length + above.length >= 2) {
    for (const c of below) eligible.add(c)
    for (const c of above) eligible.add(c)
  }

  return eligible
}

/** Whether the player has any legal way to take the top discard card into a new meld right now. */
export function canTakeDiscard(topDiscard: CardCode, hand: CardCode[]): boolean {
  return discardMeldEligibleCards(topDiscard, hand).size > 0
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
