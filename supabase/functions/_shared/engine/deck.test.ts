import { describe, expect, it } from 'vitest'
import { buildDeck, cardValue, formatCard, parseCard, shuffleDeck } from './deck.ts'

describe('deck', () => {
  it('builds 52 unique cards', () => {
    const deck = buildDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck).size).toBe(52)
  })

  it('shuffles without losing or duplicating cards', () => {
    const deck = buildDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(52)
    expect([...shuffled].sort()).toEqual([...deck].sort())
  })

  it('round-trips card codes', () => {
    const card = parseCard('10H')
    expect(card).toEqual({ rank: '10', suit: 'H', code: '10H' })
    expect(formatCard('10', 'H')).toBe('10H')
  })

  it('rejects invalid card codes', () => {
    expect(() => parseCard('1Z')).toThrow()
  })

  it('computes point values: ace=1, face cards=10', () => {
    expect(cardValue('AS')).toBe(1)
    expect(cardValue('7D')).toBe(7)
    expect(cardValue('10C')).toBe(10)
    expect(cardValue('KH')).toBe(10)
    expect(cardValue('QH')).toBe(10)
    expect(cardValue('JH')).toBe(10)
  })
})
