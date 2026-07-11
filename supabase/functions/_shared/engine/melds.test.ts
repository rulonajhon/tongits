import { describe, expect, it } from 'vitest'
import { isValidRun, isValidSapaw, isValidSet } from './melds.ts'

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
