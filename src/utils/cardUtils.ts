import type { CardCode, Rank, Suit } from '@engine/types'

const SUIT_SYMBOLS: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }

export function parseCardCode(code: CardCode): { rank: Rank; suit: Suit } {
  const suit = code.slice(-1) as Suit
  const rank = code.slice(0, -1) as Rank
  return { rank, suit }
}

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit]
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'H' || suit === 'D'
}

export function sortHand(cards: CardCode[]): CardCode[] {
  const order: Record<Rank, number> = {
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
  const suitOrder: Record<Suit, number> = { S: 0, H: 1, D: 2, C: 3 }
  return [...cards].sort((a, b) => {
    const ca = parseCardCode(a)
    const cb = parseCardCode(b)
    if (suitOrder[ca.suit] !== suitOrder[cb.suit]) return suitOrder[ca.suit] - suitOrder[cb.suit]
    return order[ca.rank] - order[cb.rank]
  })
}
