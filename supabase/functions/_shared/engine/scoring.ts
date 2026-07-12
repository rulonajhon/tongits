import { cardValue } from './deck.ts'
import type { CardCode, WinType } from './types.ts'

export interface PlayerHandValue {
  playerId: string
  /** Cards remaining in hand that were never melded away. */
  unmeldedCards: CardCode[]
}

export interface PlayerResult {
  playerId: string
  score: number
  isWinner: boolean
  handValue: number
  breakdown: string
}

/** A player's Nth consecutive win multiplies that win's payout by min(N, this cap). */
export const MAX_STREAK_MULTIPLIER = 4

export function handValue(cards: CardCode[]): number {
  return cards.reduce((sum, code) => sum + cardValue(code), 0)
}

function streakSuffix(streakMultiplier: number): string {
  return streakMultiplier > 1 ? ` (🔥 x${streakMultiplier} streak)` : ''
}

/**
 * Meld-out or Tongits win: the winner collects every other player's unmelded
 * hand value; a Tongits declare (zero prior discards) doubles the payout.
 * `streakMultiplier` (from the winner's consecutive-win streak) stacks on
 * top of that — see actions the caller took to compute it.
 */
export function computeMeldOutResults(
  winnerId: string,
  players: PlayerHandValue[],
  winType: Extract<WinType, 'meld_out' | 'tongits'>,
  streakMultiplier = 1,
): PlayerResult[] {
  const multiplier = (winType === 'tongits' ? 2 : 1) * streakMultiplier
  let winnerTotal = 0
  const results: PlayerResult[] = []

  for (const p of players) {
    if (p.playerId === winnerId) continue
    const value = handValue(p.unmeldedCards)
    const payout = value * multiplier
    winnerTotal += payout
    results.push({
      playerId: p.playerId,
      score: -payout,
      isWinner: false,
      handValue: value,
      breakdown: `Paid ${payout} (hand value ${value}${winType === 'tongits' ? ' x2 Tongits' : ''}${streakSuffix(streakMultiplier)})`,
    })
  }

  results.unshift({
    playerId: winnerId,
    score: winnerTotal,
    isWinner: true,
    handValue: 0,
    breakdown:
      (winType === 'tongits' ? `Tongits! Collected ${winnerTotal}` : `Melded out. Collected ${winnerTotal}`) +
      streakSuffix(streakMultiplier),
  })

  return results
}

/**
 * Fight (pile-exhaustion showdown, or a player-called challenge): all hands
 * reveal, lowest unmelded value wins. A tie for lowest is a draw — no payouts.
 *
 * If `initiatorId` is set (a player called this fight themselves rather than
 * the pile running out), and that player did NOT turn out to have the lowest
 * hand, their payout is doubled — the real cost of a wrong call, which is
 * what makes calling a fight a genuine gamble rather than a free action.
 * `streakMultiplier` stacks on top of that doubling too.
 */
export function computeFightResults(
  players: PlayerHandValue[],
  initiatorId?: string,
  streakMultiplier = 1,
): PlayerResult[] {
  const values = players.map((p) => ({ playerId: p.playerId, value: handValue(p.unmeldedCards) }))
  const min = Math.min(...values.map((v) => v.value))
  const lowest = values.filter((v) => v.value === min)

  if (lowest.length !== 1) {
    return values.map((v) => ({
      playerId: v.playerId,
      score: 0,
      isWinner: false,
      handValue: v.value,
      breakdown: `Draw — tied for lowest hand value (${v.value})`,
    }))
  }

  const winnerId = lowest[0].playerId
  let winnerTotal = 0
  const results: PlayerResult[] = []

  for (const v of values) {
    if (v.playerId === winnerId) continue
    const isFailedCaller = v.playerId === initiatorId
    const payout = v.value * (isFailedCaller ? 2 : 1) * streakMultiplier
    winnerTotal += payout
    results.push({
      playerId: v.playerId,
      score: -payout,
      isWinner: false,
      handValue: v.value,
      breakdown:
        (isFailedCaller ? `Called a fight and lost — paid double (${payout})` : `Lost the fight — paid ${payout}`) +
        streakSuffix(streakMultiplier),
    })
  }

  results.unshift({
    playerId: winnerId,
    score: winnerTotal,
    isWinner: true,
    handValue: min,
    breakdown:
      (initiatorId === winnerId
        ? `Called the fight and won! Collected ${winnerTotal}`
        : `Won the fight with lowest hand value (${min}). Collected ${winnerTotal}`) + streakSuffix(streakMultiplier),
  })

  return results
}
