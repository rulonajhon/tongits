import { describe, expect, it } from 'vitest'
import {
  applyCallTongits,
  applyDiscard,
  applyDraw,
  applyFight,
  applyMeld,
  applyMeldFromDiscard,
  applySapaw,
  resolveFight,
} from './actions.ts'
import type { EngineGameState } from './types.ts'
import { EngineError } from './types.ts'

function makeState(overrides: Partial<EngineGameState> = {}): EngineGameState {
  return {
    deck: [],
    discardPile: [],
    melds: [],
    hands: [
      { playerId: 'p1', cards: [], hasDiscarded: false },
      { playerId: 'p2', cards: [], hasDiscarded: false },
      { playerId: 'p3', cards: [], hasDiscarded: false },
    ],
    playerOrder: ['p1', 'p2', 'p3'],
    currentTurnPlayerId: 'p1',
    hasDrawnThisTurn: false,
    status: 'playing',
    ...overrides,
  }
}

describe('applyDraw', () => {
  it('moves the top deck card into the current player hand', () => {
    const state = makeState({ deck: ['4H', '5H'] })
    const result = applyDraw(state, 'p1')
    expect(result.drawnCard).toBe('5H')
    expect(result.state.deck).toEqual(['4H'])
    expect(result.state.hands[0].cards).toEqual(['5H'])
    expect(result.state.hasDrawnThisTurn).toBe(true)
  })

  it('rejects drawing out of turn', () => {
    const state = makeState({ deck: ['5H'] })
    expect(() => applyDraw(state, 'p2')).toThrow(EngineError)
  })

  it('rejects drawing twice in one turn', () => {
    const state = makeState({ deck: ['4H', '5H'], hasDrawnThisTurn: true })
    expect(() => applyDraw(state, 'p1')).toThrow(/already drawn/)
  })

  it('rejects drawing from an empty pile', () => {
    const state = makeState({ deck: [] })
    expect(() => applyDraw(state, 'p1')).toThrow(/empty/)
  })

  it('does not mutate the original state', () => {
    const state = makeState({ deck: ['5H'] })
    applyDraw(state, 'p1')
    expect(state.deck).toEqual(['5H'])
    expect(state.hands[0].cards).toEqual([])
  })
})

describe('applyDiscard', () => {
  it('moves a card from hand to the discard pile and advances the turn', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['5H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyDiscard(state, 'p1', '5H')
    expect(result.state.hands[0].cards).toEqual([])
    expect(result.state.discardPile).toEqual(['5H'])
    expect(result.state.hands[0].hasDiscarded).toBe(true)
    expect(result.state.currentTurnPlayerId).toBe('p2')
    expect(result.state.hasDrawnThisTurn).toBe(false)
  })

  it('wraps turn order from the last seat back to the first', () => {
    const state = makeState({
      currentTurnPlayerId: 'p3',
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: [], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: ['2C'], hasDiscarded: false },
      ],
    })
    const result = applyDiscard(state, 'p3', '2C')
    expect(result.state.currentTurnPlayerId).toBe('p1')
  })

  it('rejects discarding before drawing', () => {
    const state = makeState({
      hands: [
        { playerId: 'p1', cards: ['5H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyDiscard(state, 'p1', '5H')).toThrow(/draw before/)
  })

  it('rejects discarding a card not in hand', () => {
    const state = makeState({ hasDrawnThisTurn: true })
    expect(() => applyDiscard(state, 'p1', '5H')).toThrow(/not in your hand/)
  })
})

describe('applyMeld', () => {
  it('moves cards from hand onto a new table meld', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['7S', '7H', '7D', '2C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeld(state, 'p1', 'set', ['7S', '7H', '7D'], 'm1')
    expect(result.state.hands[0].cards).toEqual(['2C'])
    expect(result.state.melds).toEqual([{ id: 'm1', ownerId: 'p1', type: 'set', cards: ['7S', '7H', '7D'] }])
    expect(result.win).toBeNull()
  })

  it('declares a tongits win when melding empties a hand with zero discards', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['7S', '7H', '7D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeld(state, 'p1', 'set', ['7S', '7H', '7D'], 'm1')
    expect(result.win).toEqual(
      expect.objectContaining({ winnerId: 'p1', winType: 'tongits' }),
    )
    expect(result.state.status).toBe('finished')
  })

  it('declares a normal meld-out win when the player already discarded this round', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['7S', '7H', '7D'], hasDiscarded: true },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeld(state, 'p1', 'set', ['7S', '7H', '7D'], 'm1')
    expect(result.win?.winType).toBe('meld_out')
  })

  it('rejects an invalid meld shape', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['7S', '8H', '9D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeld(state, 'p1', 'set', ['7S', '8H', '9D'], 'm1')).toThrow(EngineError)
  })

  it('rejects melding before drawing', () => {
    const state = makeState({
      hands: [
        { playerId: 'p1', cards: ['7S', '7H', '7D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeld(state, 'p1', 'set', ['7S', '7H', '7D'], 'm1')).toThrow(/draw before/)
  })
})

describe('applyMeldFromDiscard', () => {
  it('takes the top discard card and melds it with hand cards, in place of a draw (3-card set)', () => {
    const state = makeState({
      discardPile: ['7C', '8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D', '2C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '8S', 'm1')
    expect(result.state.discardPile).toEqual(['7C'])
    expect(result.state.hands[0].cards).toEqual(['2C'])
    expect(result.state.melds).toEqual([{ id: 'm1', ownerId: 'p1', type: 'set', cards: ['8H', '8D', '8S'] }])
    expect(result.state.hasDrawnThisTurn).toBe(true)
  })

  it('takes the discard into a 4-card set', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D', '8C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D', '8C'], '8S', 'm1')
    expect(result.state.melds[0].cards).toEqual(['8H', '8D', '8C', '8S'])
  })

  it('takes the discard into a 3-card run', () => {
    const state = makeState({
      discardPile: ['7H'],
      hands: [
        { playerId: 'p1', cards: ['5H', '6H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeldFromDiscard(state, 'p1', 'run', ['5H', '6H'], '7H', 'm1')
    expect(result.state.melds[0]).toEqual({ id: 'm1', ownerId: 'p1', type: 'run', cards: ['5H', '6H', '7H'] })
  })

  it('takes the discard into a run longer than 3 cards', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['5S', '6S', '7S'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeldFromDiscard(state, 'p1', 'run', ['5S', '6S', '7S'], '8S', 'm1')
    expect(result.state.melds[0].cards).toEqual(['5S', '6S', '7S', '8S'])
  })

  it('wins with tongits when taking the discard empties the hand with zero prior discards', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '8S', 'm1')
    expect(result.win).toEqual(expect.objectContaining({ winnerId: 'p1', winType: 'tongits' }))
    expect(result.state.status).toBe('finished')
  })

  it('requires the discard afterward — hasDrawnThisTurn is true so a further meld/sapaw/discard can follow', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D', '2C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '8S', 'm1')
    expect(() => applyMeld(result.state, 'p2', 'set', [], 'm2')).toThrow(/not your turn/)
    expect(result.state.currentTurnPlayerId).toBe('p1')
    expect(result.state.hasDrawnThisTurn).toBe(true)
  })

  it('rejects it once the player has already drawn this turn', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '8S', 'm1')).toThrow(/already drawn/)
  })

  it('rejects it when the discard pile is empty', () => {
    const state = makeState({
      discardPile: [],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '8S', 'm1')).toThrow(/discard pile is empty/)
  })

  it('rejects a stale top-card claim (someone else already changed the pile)', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '9C', 'm1')).toThrow(/discard pile has changed/)
  })

  it('rejects mixed-suit cards that cannot form a run with the discard', () => {
    const state = makeState({
      discardPile: ['7H'],
      hands: [
        { playerId: 'p1', cards: ['5H', '6S'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'run', ['5H', '6S'], '7H', 'm1')).toThrow(EngineError)
  })

  it('rejects a non-consecutive run selection', () => {
    const state = makeState({
      discardPile: ['7H'],
      hands: [
        { playerId: 'p1', cards: ['4H', '5H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'run', ['4H', '5H'], '7H', 'm1')).toThrow(EngineError)
  })

  it('rejects a single supporting card — a meld needs at least three cards total', () => {
    const state = makeState({
      discardPile: ['7H'],
      hands: [
        { playerId: 'p1', cards: ['7C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'set', ['7C'], '7H', 'm1')).toThrow(EngineError)
  })

  it('rejects a hand selection that does not combine with the discard into a valid meld', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '2C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'set', ['8H', '2C'], '8S', 'm1')).toThrow(EngineError)
  })

  it('rejects it out of turn', () => {
    const state = makeState({ discardPile: ['8S'] })
    expect(() => applyMeldFromDiscard(state, 'p2', 'set', ['8H', '8D'], '8S', 'm1')).toThrow(EngineError)
  })

  it('rejects a card not actually in the player hand', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '8S', 'm1')).toThrow(/not in your hand/)
  })

  it('only removes the selected hand cards, leaving the discard-sourced card out of the hand entirely', () => {
    const state = makeState({
      discardPile: ['4H', '5H'],
      hands: [
        { playerId: 'p1', cards: ['3H', '4H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applyMeldFromDiscard(state, 'p1', 'run', ['3H', '4H'], '5H', 'm1')
    expect(result.state.discardPile).toEqual(['4H'])
    expect(result.state.melds[0].cards).toEqual(['3H', '4H', '5H'])
    expect(result.state.hands[0].cards).toEqual([])
  })

  it('does not mutate the original state', () => {
    const state = makeState({
      discardPile: ['8S'],
      hands: [
        { playerId: 'p1', cards: ['8H', '8D'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    applyMeldFromDiscard(state, 'p1', 'set', ['8H', '8D'], '8S', 'm1')
    expect(state.discardPile).toEqual(['8S'])
    expect(state.hands[0].cards).toEqual(['8H', '8D'])
    expect(state.melds).toEqual([])
  })
})

describe('applySapaw', () => {
  it('attaches cards from hand to an existing meld, including an opponent’s', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      melds: [{ id: 'm1', ownerId: 'p2', type: 'set', cards: ['7S', '7H', '7D'] }],
      hands: [
        { playerId: 'p1', cards: ['7C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    const result = applySapaw(state, 'p1', 'm1', ['7C'])
    expect(result.state.melds[0].cards).toEqual(['7S', '7H', '7D', '7C'])
    expect(result.win).toEqual(expect.objectContaining({ winnerId: 'p1', winType: 'tongits' }))
  })

  it('rejects a sapaw that does not form a valid meld', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      melds: [{ id: 'm1', ownerId: 'p2', type: 'run', cards: ['4H', '5H', '6H'] }],
      hands: [
        { playerId: 'p1', cards: ['9H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applySapaw(state, 'p1', 'm1', ['9H'])).toThrow(EngineError)
  })

  it('rejects a sapaw targeting a nonexistent meld', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['7C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() => applySapaw(state, 'p1', 'missing', ['7C'])).toThrow(/not found/)
  })
})

describe('applyCallTongits', () => {
  it('applies a batch of melds that empties the hand and wins', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['7S', '7H', '7D', '4H', '5H', '6H'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    let counter = 0
    const result = applyCallTongits(
      state,
      'p1',
      [
        { type: 'set', cards: ['7S', '7H', '7D'] },
        { type: 'run', cards: ['4H', '5H', '6H'] },
      ],
      () => `m${++counter}`,
    )
    expect(result.win?.winnerId).toBe('p1')
    expect(result.win?.winType).toBe('tongits')
    expect(result.state.hands[0].cards).toEqual([])
    expect(result.state.melds).toHaveLength(2)
  })

  it('rejects a declare that leaves cards over', () => {
    const state = makeState({
      hasDrawnThisTurn: true,
      hands: [
        { playerId: 'p1', cards: ['7S', '7H', '7D', '2C'], hasDiscarded: false },
        { playerId: 'p2', cards: [], hasDiscarded: false },
        { playerId: 'p3', cards: [], hasDiscarded: false },
      ],
    })
    expect(() =>
      applyCallTongits(state, 'p1', [{ type: 'set', cards: ['7S', '7H', '7D'] }], () => 'm1'),
    ).toThrow(/entire hand/)
  })
})

describe('resolveFight', () => {
  it('gathers final hands for scoring without picking a winner itself', () => {
    const state = makeState({
      hands: [
        { playerId: 'p1', cards: ['AS'], hasDiscarded: false },
        { playerId: 'p2', cards: ['KD'], hasDiscarded: false },
        { playerId: 'p3', cards: ['5H'], hasDiscarded: false },
      ],
    })
    const win = resolveFight(state)
    expect(win.winnerId).toBeNull()
    expect(win.winType).toBe('fight')
    expect(win.finalHands).toEqual([
      { playerId: 'p1', cards: ['AS'] },
      { playerId: 'p2', cards: ['KD'] },
      { playerId: 'p3', cards: ['5H'] },
    ])
  })
})

describe('applyFight', () => {
  it('ends the game and tags the result with who called it', () => {
    const state = makeState({
      hasDrawnThisTurn: false,
      hands: [
        { playerId: 'p1', cards: ['AS'], hasDiscarded: false },
        { playerId: 'p2', cards: ['KD'], hasDiscarded: false },
        { playerId: 'p3', cards: ['5H'], hasDiscarded: false },
      ],
    })
    const result = applyFight(state, 'p1')
    expect(result.state.status).toBe('finished')
    expect(result.win?.winType).toBe('fight')
    expect(result.win?.fightInitiatorId).toBe('p1')
    expect(result.win?.finalHands).toHaveLength(3)
  })

  it('rejects calling a fight out of turn', () => {
    const state = makeState({ hasDrawnThisTurn: false })
    expect(() => applyFight(state, 'p2')).toThrow(EngineError)
  })

  it('rejects calling a fight after already drawing this turn', () => {
    const state = makeState({ hasDrawnThisTurn: true })
    expect(() => applyFight(state, 'p1')).toThrow(/before drawing/)
  })

  it('does not mutate the original state', () => {
    const state = makeState({ hasDrawnThisTurn: false })
    applyFight(state, 'p1')
    expect(state.status).toBe('playing')
  })
})
