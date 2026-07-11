import { cardValue, parseCard } from './deck.ts'
import type { CardCode } from './types.ts'

/**
 * Picks a reasonable card to discard automatically when a player's turn
 * timer expires. Prefers a card that isn't part of any same-rank pair/set
 * in hand (a "single"), choosing the highest point value among those —
 * the card least likely to still be useful. Falls back to the highest-value
 * card overall if the whole hand happens to be paired up.
 */
export function pickAutoDiscard(hand: CardCode[]): CardCode {
  if (hand.length === 0) {
    throw new Error('Cannot pick a discard from an empty hand')
  }

  const byRank = new Map<string, CardCode[]>()
  for (const code of hand) {
    const rank = parseCard(code).rank
    byRank.set(rank, [...(byRank.get(rank) ?? []), code])
  }

  const singles = [...byRank.values()].filter((cards) => cards.length === 1).map((cards) => cards[0])
  const pool = singles.length > 0 ? singles : hand

  return pool.reduce((highest, code) => (cardValue(code) > cardValue(highest) ? code : highest), pool[0])
}
