import { describe, expect, it } from 'vitest'
import { computeHitterTransition, type HitterState } from './hitter.ts'

const baseInput = {
  requiredConsecutiveWins: 2,
  jackpotStartingAmount: 1000,
  jackpotResetMode: 'reset_to_base' as const,
}

describe('computeHitterTransition', () => {
  // Test 1: no current Hitter, Player A wins.
  it('makes the winner the Hitter with streak 1 when there was no current Hitter', () => {
    const result = computeHitterTransition({
      currentHitterPlayerId: null,
      hitterWinStreak: 0,
      jackpotAmount: 5000,
      handWinnerPlayerId: 'A',
      ...baseInput,
    })
    expect(result.newHitterPlayerId).toBe('A')
    expect(result.newWinStreak).toBe(1)
    expect(result.jackpotAwarded).toBe(false)
    expect(result.jackpotAfter).toBe(5000)
  })

  // Test 2: A is Hitter with streak 1, A wins again — jackpot awarded, reset_to_base.
  it('awards the jackpot when the current Hitter wins again, resetting to the base amount', () => {
    const result = computeHitterTransition({
      currentHitterPlayerId: 'A',
      hitterWinStreak: 1,
      jackpotAmount: 5000,
      handWinnerPlayerId: 'A',
      ...baseInput,
    })
    expect(result.jackpotAwarded).toBe(true)
    expect(result.jackpotWinnerPlayerId).toBe('A')
    expect(result.jackpotAwardAmount).toBe(5000)
    expect(result.newHitterPlayerId).toBeNull()
    expect(result.newWinStreak).toBe(0)
    expect(result.jackpotAfter).toBe(1000) // jackpotStartingAmount
  })

  it('resets the jackpot to zero when jackpotResetMode is reset_to_zero', () => {
    const result = computeHitterTransition({
      currentHitterPlayerId: 'A',
      hitterWinStreak: 1,
      jackpotAmount: 5000,
      handWinnerPlayerId: 'A',
      ...baseInput,
      jackpotResetMode: 'reset_to_zero',
    })
    expect(result.jackpotAwarded).toBe(true)
    expect(result.jackpotAfter).toBe(0)
  })

  // Test 3: A is Hitter with streak 1, B wins — streak breaks, jackpot untouched.
  it('replaces the Hitter and resets the streak to 1 when a different player wins', () => {
    const result = computeHitterTransition({
      currentHitterPlayerId: 'A',
      hitterWinStreak: 1,
      jackpotAmount: 5000,
      handWinnerPlayerId: 'B',
      ...baseInput,
    })
    expect(result.newHitterPlayerId).toBe('B')
    expect(result.newWinStreak).toBe(1)
    expect(result.jackpotAwarded).toBe(false)
    expect(result.jackpotAfter).toBe(5000)
    expect(result.previousHitterPlayerId).toBe('A')
  })

  // Test 4: A wins, then B wins, then B wins again — jackpot only after B's 2nd consecutive win.
  it('only pays out on the second consecutive win for a newly-broken streak, not the first', () => {
    let state: HitterState = { currentHitterPlayerId: null, hitterWinStreak: 0, jackpotAmount: 5000 }

    const roundA = computeHitterTransition({ ...state, handWinnerPlayerId: 'A', ...baseInput })
    expect(roundA.jackpotAwarded).toBe(false)
    state = { currentHitterPlayerId: roundA.newHitterPlayerId, hitterWinStreak: roundA.newWinStreak, jackpotAmount: roundA.jackpotAfter }

    const roundB1 = computeHitterTransition({ ...state, handWinnerPlayerId: 'B', ...baseInput })
    expect(roundB1.jackpotAwarded).toBe(false)
    expect(roundB1.newHitterPlayerId).toBe('B')
    expect(roundB1.newWinStreak).toBe(1)
    state = { currentHitterPlayerId: roundB1.newHitterPlayerId, hitterWinStreak: roundB1.newWinStreak, jackpotAmount: roundB1.jackpotAfter }

    const roundB2 = computeHitterTransition({ ...state, handWinnerPlayerId: 'B', ...baseInput })
    expect(roundB2.jackpotAwarded).toBe(true)
    expect(roundB2.jackpotWinnerPlayerId).toBe('B')
    expect(roundB2.jackpotAwardAmount).toBe(5000)
  })

  // Test 5: void/tied hand — nothing changes.
  it('leaves the Hitter, streak, and jackpot untouched on a void/tied hand', () => {
    const result = computeHitterTransition({
      currentHitterPlayerId: 'A',
      hitterWinStreak: 1,
      jackpotAmount: 5000,
      handWinnerPlayerId: null,
      ...baseInput,
    })
    expect(result.changed).toBe(false)
    expect(result.newHitterPlayerId).toBe('A')
    expect(result.newWinStreak).toBe(1)
    expect(result.jackpotAwarded).toBe(false)
    expect(result.jackpotAfter).toBe(5000)
  })

  it('honors a higher requiredConsecutiveWins than the default of 2', () => {
    let state: HitterState = { currentHitterPlayerId: 'A', hitterWinStreak: 2, jackpotAmount: 5000 }
    const input = { ...baseInput, requiredConsecutiveWins: 3 }

    const thirdWin = computeHitterTransition({ ...state, handWinnerPlayerId: 'A', ...input })
    expect(thirdWin.jackpotAwarded).toBe(true)
    expect(thirdWin.newWinStreak).toBe(0)

    const secondWinOnly = computeHitterTransition({
      currentHitterPlayerId: 'A',
      hitterWinStreak: 1,
      jackpotAmount: 5000,
      handWinnerPlayerId: 'A',
      ...input,
    })
    expect(secondWinOnly.jackpotAwarded).toBe(false)
    expect(secondWinOnly.newWinStreak).toBe(2)
  })

  it('awards the jackpot immediately when requiredConsecutiveWins is configured to 1', () => {
    const result = computeHitterTransition({
      currentHitterPlayerId: null,
      hitterWinStreak: 0,
      jackpotAmount: 5000,
      handWinnerPlayerId: 'A',
      ...baseInput,
      requiredConsecutiveWins: 1,
    })
    expect(result.jackpotAwarded).toBe(true)
    expect(result.jackpotWinnerPlayerId).toBe('A')
  })
})
