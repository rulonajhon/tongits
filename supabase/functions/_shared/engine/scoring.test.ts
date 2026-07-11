import { describe, expect, it } from 'vitest'
import { computeFightResults, computeMeldOutResults, handValue } from './scoring.ts'

describe('handValue', () => {
  it('sums card point values', () => {
    expect(handValue(['AS', '5H', 'KD'])).toBe(1 + 5 + 10)
  })

  it('is zero for an empty hand', () => {
    expect(handValue([])).toBe(0)
  })
})

describe('computeMeldOutResults', () => {
  it('winner collects the sum of losers hand values', () => {
    const results = computeMeldOutResults(
      'p1',
      [
        { playerId: 'p1', unmeldedCards: [] },
        { playerId: 'p2', unmeldedCards: ['5H', 'KD'] },
        { playerId: 'p3', unmeldedCards: ['AS'] },
      ],
      'meld_out',
    )
    const winner = results.find((r) => r.playerId === 'p1')!
    const p2 = results.find((r) => r.playerId === 'p2')!
    const p3 = results.find((r) => r.playerId === 'p3')!
    expect(winner.isWinner).toBe(true)
    expect(winner.score).toBe(15 + 1)
    expect(p2.score).toBe(-15)
    expect(p3.score).toBe(-1)
  })

  it('doubles payouts on a Tongits win', () => {
    const results = computeMeldOutResults(
      'p1',
      [
        { playerId: 'p1', unmeldedCards: [] },
        { playerId: 'p2', unmeldedCards: ['5H'] },
      ],
      'tongits',
    )
    const winner = results.find((r) => r.playerId === 'p1')!
    expect(winner.score).toBe(10)
  })
})

describe('computeFightResults', () => {
  it('lowest hand value wins and collects from opponents', () => {
    const results = computeFightResults([
      { playerId: 'p1', unmeldedCards: ['AS'] },
      { playerId: 'p2', unmeldedCards: ['KD', 'QH'] },
      { playerId: 'p3', unmeldedCards: ['5H'] },
    ])
    const winner = results.find((r) => r.isWinner)
    expect(winner?.playerId).toBe('p1')
    expect(winner?.score).toBe(20 + 5)
  })

  it('is a draw when tied for lowest', () => {
    const results = computeFightResults([
      { playerId: 'p1', unmeldedCards: ['5H'] },
      { playerId: 'p2', unmeldedCards: ['5S'] },
      { playerId: 'p3', unmeldedCards: ['KD'] },
    ])
    expect(results.every((r) => !r.isWinner)).toBe(true)
    expect(results.every((r) => r.score === 0)).toBe(true)
  })

  it('doubles the payout when the player who called the fight loses it', () => {
    const results = computeFightResults(
      [
        { playerId: 'p1', unmeldedCards: ['AS'] }, // lowest — actual winner
        { playerId: 'p2', unmeldedCards: ['5H'] }, // called the fight, guessed wrong
        { playerId: 'p3', unmeldedCards: ['KD'] },
      ],
      'p2',
    )
    const winner = results.find((r) => r.isWinner)!
    const caller = results.find((r) => r.playerId === 'p2')!
    const other = results.find((r) => r.playerId === 'p3')!
    expect(winner.playerId).toBe('p1')
    expect(caller.score).toBe(-10) // 5 doubled
    expect(other.score).toBe(-10) // KD = 10, not doubled
    expect(winner.score).toBe(10 + 10)
  })

  it('does not penalize the caller when they correctly call the fight and win', () => {
    const results = computeFightResults(
      [
        { playerId: 'p1', unmeldedCards: ['AS'] }, // called the fight and has the lowest hand
        { playerId: 'p2', unmeldedCards: ['5H'] },
        { playerId: 'p3', unmeldedCards: ['KD'] },
      ],
      'p1',
    )
    const winner = results.find((r) => r.isWinner)!
    expect(winner.playerId).toBe('p1')
    expect(winner.score).toBe(5 + 10)
    expect(results.find((r) => r.playerId === 'p2')?.score).toBe(-5)
  })

  it('does not penalize a fight caller on a tie', () => {
    const results = computeFightResults(
      [
        { playerId: 'p1', unmeldedCards: ['5H'] },
        { playerId: 'p2', unmeldedCards: ['5S'] },
        { playerId: 'p3', unmeldedCards: ['KD'] },
      ],
      'p1',
    )
    expect(results.every((r) => r.score === 0)).toBe(true)
  })
})
