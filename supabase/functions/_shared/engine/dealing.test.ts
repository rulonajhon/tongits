import { describe, expect, it } from 'vitest'
import { dealNewGame } from './dealing.ts'

describe('dealNewGame', () => {
  const players = ['p1', 'p2', 'p3']

  it('deals 12 cards to non-dealers and 13 to the dealer', () => {
    const { state } = dealNewGame(players, 'p2')
    const byId = Object.fromEntries(state.hands.map((h) => [h.playerId, h]))
    expect(byId.p1.cards).toHaveLength(12)
    expect(byId.p3.cards).toHaveLength(12)
    expect(byId.p2.cards).toHaveLength(13)
  })

  it('leaves 52 - 37 = 15 cards in the draw pile', () => {
    const { state } = dealNewGame(players, 'p1')
    expect(state.deck).toHaveLength(52 - 37)
  })

  it('deals no duplicate cards across hands and deck', () => {
    const { state } = dealNewGame(players, 'p3')
    const all = [...state.deck, ...state.hands.flatMap((h) => h.cards)]
    expect(all).toHaveLength(52)
    expect(new Set(all).size).toBe(52)
  })

  it('sets the dealer as the current turn player, already drawn', () => {
    const { state } = dealNewGame(players, 'p2')
    expect(state.currentTurnPlayerId).toBe('p2')
    expect(state.hasDrawnThisTurn).toBe(true)
    expect(state.status).toBe('playing')
  })

  it('rejects a dealer not in the player list', () => {
    expect(() => dealNewGame(players, 'nobody')).toThrow()
  })
})
