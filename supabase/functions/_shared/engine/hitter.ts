/**
 * The "Hitter" jackpot: a separate pooled pot that only pays out when the
 * same player wins `requiredConsecutiveWins` hands in a row (default 2).
 * This is independent of the per-hand win-streak multiplier in scoring.ts
 * (which multiplies a player's own hand payout) — the jackpot is a shared
 * pool funded by ante/house contributions, paid out as a lump sum on top.
 */

export type JackpotResetMode = 'reset_to_zero' | 'reset_to_base'

export interface HitterState {
  currentHitterPlayerId: string | null
  hitterWinStreak: number
  jackpotAmount: number
}

export interface HitterTransitionInput extends HitterState {
  /** null means the hand was void/drawn/tied — no official winner. */
  handWinnerPlayerId: string | null
  requiredConsecutiveWins: number
  jackpotStartingAmount: number
  jackpotResetMode: JackpotResetMode
}

export interface HitterTransitionResult {
  /** False for a void/tied hand — nothing about the Hitter or jackpot changes. */
  changed: boolean
  previousHitterPlayerId: string | null
  previousWinStreak: number
  newHitterPlayerId: string | null
  newWinStreak: number
  jackpotBefore: number
  jackpotAfter: number
  jackpotAwarded: boolean
  /** The amount paid out — equal to jackpotBefore when awarded, 0 otherwise. */
  jackpotAwardAmount: number
  jackpotWinnerPlayerId: string | null
}

export function computeHitterTransition(input: HitterTransitionInput): HitterTransitionResult {
  const {
    currentHitterPlayerId,
    hitterWinStreak,
    jackpotAmount,
    handWinnerPlayerId,
    requiredConsecutiveWins,
    jackpotStartingAmount,
    jackpotResetMode,
  } = input

  if (!handWinnerPlayerId) {
    return {
      changed: false,
      previousHitterPlayerId: currentHitterPlayerId,
      previousWinStreak: hitterWinStreak,
      newHitterPlayerId: currentHitterPlayerId,
      newWinStreak: hitterWinStreak,
      jackpotBefore: jackpotAmount,
      jackpotAfter: jackpotAmount,
      jackpotAwarded: false,
      jackpotAwardAmount: 0,
      jackpotWinnerPlayerId: null,
    }
  }

  const isSameHitter = currentHitterPlayerId === handWinnerPlayerId
  const streakAfterThisWin = isSameHitter ? hitterWinStreak + 1 : 1
  const jackpotAwarded = streakAfterThisWin >= requiredConsecutiveWins

  if (jackpotAwarded) {
    return {
      changed: true,
      previousHitterPlayerId: currentHitterPlayerId,
      previousWinStreak: hitterWinStreak,
      newHitterPlayerId: null,
      newWinStreak: 0,
      jackpotBefore: jackpotAmount,
      jackpotAfter: jackpotResetMode === 'reset_to_base' ? jackpotStartingAmount : 0,
      jackpotAwarded: true,
      jackpotAwardAmount: jackpotAmount,
      jackpotWinnerPlayerId: handWinnerPlayerId,
    }
  }

  return {
    changed: true,
    previousHitterPlayerId: currentHitterPlayerId,
    previousWinStreak: hitterWinStreak,
    newHitterPlayerId: handWinnerPlayerId,
    newWinStreak: streakAfterThisWin,
    jackpotBefore: jackpotAmount,
    jackpotAfter: jackpotAmount,
    jackpotAwarded: false,
    jackpotAwardAmount: 0,
    jackpotWinnerPlayerId: null,
  }
}
