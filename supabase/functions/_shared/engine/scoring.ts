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

export function handValue(cards: CardCode[]): number {
  return cards.reduce((sum, code) => sum + cardValue(code), 0)
}

/**
 * Meld-out or Tongits win: the winner collects every other player's unmelded
 * hand value; a Tongits declare (zero prior discards) doubles the payout.
 */
export function computeMeldOutResults(
  winnerId: string,
  players: PlayerHandValue[],
  winType: Extract<WinType, 'meld_out' | 'tongits'>,
): PlayerResult[] {
  const multiplier = winType === 'tongits' ? 2 : 1
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
      breakdown: `Paid ${payout} (hand value ${value}${multiplier > 1 ? ' x2 Tongits' : ''})`,
    })
  }

  results.unshift({
    playerId: winnerId,
    score: winnerTotal,
    isWinner: true,
    handValue: 0,
    breakdown:
      winType === 'tongits'
        ? `Tongits! Collected ${winnerTotal} (double)`
        : `Melded out. Collected ${winnerTotal}`,
  })

  return results
}

/**
 * Fight (pile-exhaustion showdown): all hands reveal, lowest unmelded value wins.
 * A tie for lowest is a draw — no payouts.
 */
export function computeFightResults(players: PlayerHandValue[]): PlayerResult[] {
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
    winnerTotal += v.value
    results.push({
      playerId: v.playerId,
      score: -v.value,
      isWinner: false,
      handValue: v.value,
      breakdown: `Lost the fight — paid ${v.value}`,
    })
  }

  results.unshift({
    playerId: winnerId,
    score: winnerTotal,
    isWinner: true,
    handValue: min,
    breakdown: `Won the fight with lowest hand value (${min}). Collected ${winnerTotal}`,
  })

  return results
}
