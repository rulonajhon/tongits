import type { CardCode, MeldType, Suit } from '@engine/types'
import { RANK_ORDER } from '@engine/deck'
import { isValidSapaw } from '@engine/melds'
import { parseCardCode, sortHand } from './cardUtils'

export type HandGroupType = 'run' | 'set' | 'pair'

export interface HandGroup {
  id: string
  type: HandGroupType
  cards: CardCode[]
}

export interface GroupedHand {
  groups: HandGroup[]
  /** Cards that don't currently contribute to any run, set, or pair. */
  deadwood: CardCode[]
}

function extractRuns(cards: CardCode[]): { runs: CardCode[][]; rest: CardCode[] } {
  const bySuit = new Map<Suit, CardCode[]>()
  for (const code of cards) {
    const { suit } = parseCardCode(code)
    bySuit.set(suit, [...(bySuit.get(suit) ?? []), code])
  }

  const runs: CardCode[][] = []
  const rest: CardCode[] = []

  for (const suitCards of bySuit.values()) {
    const sorted = [...suitCards].sort(
      (a, b) => RANK_ORDER[parseCardCode(a).rank] - RANK_ORDER[parseCardCode(b).rank],
    )
    let current: CardCode[] = []
    for (const code of sorted) {
      const last = current[current.length - 1]
      const isConsecutive =
        last !== undefined && RANK_ORDER[parseCardCode(code).rank] === RANK_ORDER[parseCardCode(last).rank] + 1
      if (!isConsecutive && current.length > 0) {
        if (current.length >= 3) runs.push(current)
        else rest.push(...current)
        current = []
      }
      current.push(code)
    }
    if (current.length >= 3) runs.push(current)
    else rest.push(...current)
  }

  return { runs, rest }
}

/**
 * Clusters a hand into runs, sets, and pairs (like Tongits Go's auto-sort),
 * leaving unmatched cards as "deadwood" so the player can see at a glance
 * what's actually useful versus what's safe to discard.
 */
export function groupHandForDisplay(cards: CardCode[]): GroupedHand {
  const { runs, rest } = extractRuns(cards)
  const groups: HandGroup[] = runs.map((run) => ({ id: `run-${run[0]}`, type: 'run', cards: run }))

  const byRank = new Map<string, CardCode[]>()
  for (const code of rest) {
    const { rank } = parseCardCode(code)
    byRank.set(rank, [...(byRank.get(rank) ?? []), code])
  }

  const deadwood: CardCode[] = []
  for (const rankCards of byRank.values()) {
    if (rankCards.length >= 2) {
      groups.push({
        id: `set-${rankCards[0]}`,
        type: rankCards.length >= 3 ? 'set' : 'pair',
        cards: rankCards,
      })
    } else {
      deadwood.push(...rankCards)
    }
  }

  groups.sort((a, b) => {
    const weight = (g: HandGroup) => (g.type === 'pair' ? 1 : 0)
    if (weight(a) !== weight(b)) return weight(a) - weight(b)
    return RANK_ORDER[parseCardCode(a.cards[0]).rank] - RANK_ORDER[parseCardCode(b.cards[0]).rank]
  })

  return { groups, deadwood: sortHand(deadwood) }
}

/** Hand cards that would individually extend the given table meld — used to highlight sapaw candidates. */
export function sapawEligibleCards(hand: CardCode[], targetType: MeldType, targetCards: CardCode[]): Set<CardCode> {
  const eligible = new Set<CardCode>()
  for (const code of hand) {
    if (isValidSapaw(targetType, targetCards, [code]).valid) eligible.add(code)
  }
  return eligible
}
