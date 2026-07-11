import type { Card, CardCode, Rank, Suit } from './types.ts'

export const SUITS: Suit[] = ['S', 'H', 'D', 'C']
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

/** Ace-low only: A=1 ... K=13, no wraparound past K. */
export const RANK_ORDER: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
}

/** Point value for scoring: A=1, 2-10=face, J/Q/K=10. */
export const RANK_VALUE: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 10,
  Q: 10,
  K: 10,
}

export function formatCard(rank: Rank, suit: Suit): CardCode {
  return `${rank}${suit}`
}

export function parseCard(code: CardCode): Card {
  const suit = code.slice(-1) as Suit
  const rank = code.slice(0, -1) as Rank
  if (!SUITS.includes(suit) || RANK_ORDER[rank] === undefined) {
    throw new Error(`Invalid card code: ${code}`)
  }
  return { rank, suit, code }
}

export function cardValue(code: CardCode): number {
  return RANK_VALUE[parseCard(code).rank]
}

export function buildDeck(): CardCode[] {
  const deck: CardCode[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(formatCard(rank, suit))
    }
  }
  return deck
}

/** Fisher-Yates shuffle using crypto-strength randomness. Does not mutate input. */
export function shuffleDeck(deck: CardCode[]): CardCode[] {
  const result = [...deck]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(cryptoRandom() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  // Available in both Deno and modern browsers.
  crypto.getRandomValues(buf)
  return buf[0] / 0x100000000
}
