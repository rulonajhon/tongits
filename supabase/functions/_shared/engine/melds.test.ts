import { describe, expect, it } from 'vitest'
import { canTakeDiscard, discardMeldEligibleCards, isValidNewMeld, isValidRun, isValidSapaw, isValidSet } from './melds.ts'

describe('isValidSet', () => {
  it('accepts 3 same-rank cards of distinct suits', () => {
    expect(isValidSet(['7S', '7H', '7D']).valid).toBe(true)
  })

  it('accepts 4 same-rank cards', () => {
    expect(isValidSet(['7S', '7H', '7D', '7C']).valid).toBe(true)
  })

  it('rejects fewer than 3 cards', () => {
    expect(isValidSet(['7S', '7H']).valid).toBe(false)
  })

  it('rejects mixed ranks', () => {
    expect(isValidSet(['7S', '7H', '8D']).valid).toBe(false)
  })

  it('rejects duplicate suits', () => {
    expect(isValidSet(['7S', '7S', '7D']).valid).toBe(false)
  })
})

describe('isValidRun', () => {
  it('accepts 3 consecutive same-suit cards', () => {
    expect(isValidRun(['4H', '5H', '6H']).valid).toBe(true)
  })

  it('accepts an ace-low run', () => {
    expect(isValidRun(['AS', '2S', '3S']).valid).toBe(true)
  })

  it('rejects Q-K-A wraparound (ace-low only)', () => {
    expect(isValidRun(['QS', 'KS', 'AS']).valid).toBe(false)
  })

  it('rejects mixed suits', () => {
    expect(isValidRun(['4H', '5S', '6H']).valid).toBe(false)
  })

  it('rejects non-consecutive ranks', () => {
    expect(isValidRun(['4H', '6H', '8H']).valid).toBe(false)
  })

  it('rejects duplicate ranks', () => {
    expect(isValidRun(['4H', '4H', '5H']).valid).toBe(false)
  })
})

describe('isValidSapaw', () => {
  it('allows extending a 3-card set to 4', () => {
    const result = isValidSapaw('set', ['7S', '7H', '7D'], ['7C'])
    expect(result.valid).toBe(true)
  })

  it('rejects extending a set beyond 4', () => {
    // Not reachable with real suits (max 4), but a bad duplicate add should fail.
    const result = isValidSapaw('set', ['7S', '7H', '7D', '7C'], ['7S'])
    expect(result.valid).toBe(false)
  })

  it('allows extending a run at either end', () => {
    expect(isValidSapaw('run', ['4H', '5H', '6H'], ['7H']).valid).toBe(true)
    expect(isValidSapaw('run', ['4H', '5H', '6H'], ['3H']).valid).toBe(true)
  })

  it('rejects a sapaw that does not connect', () => {
    expect(isValidSapaw('run', ['4H', '5H', '6H'], ['9H']).valid).toBe(false)
  })
})

describe('isValidNewMeld', () => {
  it('accepts a valid set', () => {
    expect(isValidNewMeld(['7S', '7H', '7D']).valid).toBe(true)
  })

  it('accepts a valid run', () => {
    expect(isValidNewMeld(['4H', '5H', '6H']).valid).toBe(true)
  })

  it('rejects something that is neither', () => {
    expect(isValidNewMeld(['7S', '8H', '9D']).valid).toBe(false)
  })
})

describe('discardMeldEligibleCards', () => {
  it('highlights rank-mates that can form a set with the discard', () => {
    const eligible = discardMeldEligibleCards('7H', ['7S', '7D', '2C'])
    expect(eligible).toEqual(new Set(['7S', '7D']))
  })

  it('does not highlight a lone rank-mate — a set needs at least two supporting cards', () => {
    const eligible = discardMeldEligibleCards('7H', ['7S', '2C'])
    expect(eligible.has('7S')).toBe(false)
  })

  it('highlights same-suit cards forming a consecutive chain touching the discard', () => {
    const eligible = discardMeldEligibleCards('7H', ['5H', '6H', 'KC'])
    expect(eligible).toEqual(new Set(['5H', '6H']))
  })

  it('highlights a chain straddling the discard on both sides', () => {
    const eligible = discardMeldEligibleCards('7H', ['6H', '8H'])
    expect(eligible).toEqual(new Set(['6H', '8H']))
  })

  it('does not highlight a lone non-consecutive same-suit card', () => {
    const eligible = discardMeldEligibleCards('7H', ['4H', '5H'])
    expect(eligible.size).toBe(0)
  })

  it('does not highlight mismatched-suit cards even at an adjacent rank', () => {
    const eligible = discardMeldEligibleCards('7H', ['5H', '6S'])
    expect(eligible.has('6S')).toBe(false)
  })

  it('combines set and run candidates from the same hand', () => {
    const eligible = discardMeldEligibleCards('7H', ['7S', '7D', '5H', '6H', '2C'])
    expect(eligible).toEqual(new Set(['7S', '7D', '5H', '6H']))
  })
})

describe('canTakeDiscard', () => {
  it('is true when a valid set is possible', () => {
    expect(canTakeDiscard('7H', ['7S', '7D'])).toBe(true)
  })

  it('is true when a valid run is possible', () => {
    expect(canTakeDiscard('7H', ['5H', '6H'])).toBe(true)
  })

  it('is false with no compatible cards', () => {
    expect(canTakeDiscard('7H', ['2C', 'KC', '9S'])).toBe(false)
  })

  it('is false with only a single rank-mate', () => {
    expect(canTakeDiscard('7H', ['7S'])).toBe(false)
  })

  it('is false with an empty hand', () => {
    expect(canTakeDiscard('7H', [])).toBe(false)
  })
})
