import { describe, expect, it } from 'vitest'
import { pickAutoDiscard } from './autoPlay.ts'

describe('pickAutoDiscard', () => {
  it('picks the highest-value single (unpaired) card', () => {
    // 7S/7H are a pair (protected); AS, 5D, KC are singles — KC (10) is highest.
    expect(pickAutoDiscard(['7S', '7H', 'AS', '5D', 'KC'])).toBe('KC')
  })

  it('ignores paired ranks even if they are high value', () => {
    // KS/KH are a pair; only 2D is a single, so it must be picked despite being low value.
    expect(pickAutoDiscard(['KS', 'KH', '2D'])).toBe('2D')
  })

  it('falls back to the highest-value card when the whole hand is paired up', () => {
    expect(pickAutoDiscard(['7S', '7H', 'KS', 'KH'])).toBe('KS')
  })

  it('handles a single-card hand', () => {
    expect(pickAutoDiscard(['5D'])).toBe('5D')
  })

  it('throws on an empty hand', () => {
    expect(() => pickAutoDiscard([])).toThrow()
  })
})
