import { isValidMeld, isValidSapaw } from './melds.ts'
import type { CardCode, EngineGameState, EngineHand, MeldType, TableMeld, WinResult } from './types.ts'
import { EngineError } from './types.ts'

export interface ActionResult {
  state: EngineGameState
  win: WinResult | null
  /** Only set for a 'draw' action — the card the acting player just drew. */
  drawnCard?: CardCode
}

function cloneState(state: EngineGameState): EngineGameState {
  return {
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    melds: state.melds.map((m) => ({ ...m, cards: [...m.cards] })),
    hands: state.hands.map((h) => ({ ...h, cards: [...h.cards] })),
    playerOrder: [...state.playerOrder],
    currentTurnPlayerId: state.currentTurnPlayerId,
    hasDrawnThisTurn: state.hasDrawnThisTurn,
    status: state.status,
  }
}

function requireHand(state: EngineGameState, playerId: string): EngineHand {
  const hand = state.hands.find((h) => h.playerId === playerId)
  if (!hand) throw new EngineError('Player is not in this game', 'not_a_player')
  return hand
}

function requireTurn(state: EngineGameState, playerId: string) {
  if (state.status !== 'playing') {
    throw new EngineError('Game is not in a playable state', 'not_playing')
  }
  if (state.currentTurnPlayerId !== playerId) {
    throw new EngineError('It is not your turn', 'not_your_turn')
  }
}

function removeCardsFromHand(hand: EngineHand, cards: CardCode[]) {
  for (const card of cards) {
    const idx = hand.cards.indexOf(card)
    if (idx === -1) {
      throw new EngineError(`Card ${card} is not in your hand`, 'card_not_in_hand')
    }
    hand.cards.splice(idx, 1)
  }
}

function nextPlayerId(state: EngineGameState, currentPlayerId: string): string {
  const idx = state.playerOrder.indexOf(currentPlayerId)
  const nextIdx = (idx + 1) % state.playerOrder.length
  return state.playerOrder[nextIdx]
}

function handEmptyWin(state: EngineGameState, playerId: string, hand: EngineHand): WinResult | null {
  if (hand.cards.length > 0) return null
  return {
    winnerId: playerId,
    winType: hand.hasDiscarded ? 'meld_out' : 'tongits',
    finalHands: state.hands.map((h) => ({ playerId: h.playerId, cards: h.cards })),
  }
}

export function applyDraw(state: EngineGameState, playerId: string): ActionResult {
  requireTurn(state, playerId)
  if (state.hasDrawnThisTurn) {
    throw new EngineError('You have already drawn this turn', 'already_drawn')
  }
  if (state.deck.length === 0) {
    throw new EngineError('Draw pile is empty — the round should already have ended in a fight', 'deck_empty')
  }
  const next = cloneState(state)
  const hand = requireHand(next, playerId)
  const card = next.deck.pop()!
  hand.cards.push(card)
  next.hasDrawnThisTurn = true
  return { state: next, win: null, drawnCard: card }
}

export function applyDiscard(state: EngineGameState, playerId: string, card: CardCode): ActionResult {
  requireTurn(state, playerId)
  if (!state.hasDrawnThisTurn) {
    throw new EngineError('You must draw before discarding', 'must_draw_first')
  }
  const next = cloneState(state)
  const hand = requireHand(next, playerId)
  removeCardsFromHand(hand, [card])
  next.discardPile.push(card)
  hand.hasDiscarded = true
  next.hasDrawnThisTurn = false
  next.currentTurnPlayerId = nextPlayerId(next, playerId)
  return { state: next, win: null }
}

export function applyMeld(
  state: EngineGameState,
  playerId: string,
  type: MeldType,
  cards: CardCode[],
  meldId: string,
): ActionResult {
  requireTurn(state, playerId)
  if (!state.hasDrawnThisTurn) {
    throw new EngineError('You must draw before melding', 'must_draw_first')
  }
  const validation = isValidMeld(type, cards)
  if (!validation.valid) {
    throw new EngineError(validation.reason ?? 'Invalid meld', 'invalid_meld')
  }
  const next = cloneState(state)
  const hand = requireHand(next, playerId)
  removeCardsFromHand(hand, cards)
  const meld: TableMeld = { id: meldId, ownerId: playerId, type, cards: [...cards] }
  next.melds.push(meld)
  const win = handEmptyWin(next, playerId, hand)
  if (win) next.status = 'finished'
  return { state: next, win }
}

export function applySapaw(
  state: EngineGameState,
  playerId: string,
  meldId: string,
  cards: CardCode[],
): ActionResult {
  requireTurn(state, playerId)
  if (!state.hasDrawnThisTurn) {
    throw new EngineError('You must draw before playing a sapaw', 'must_draw_first')
  }
  const targetMeld = state.melds.find((m) => m.id === meldId)
  if (!targetMeld) {
    throw new EngineError('Meld not found', 'meld_not_found')
  }
  const validation = isValidSapaw(targetMeld.type, targetMeld.cards, cards)
  if (!validation.valid) {
    throw new EngineError(validation.reason ?? 'Invalid sapaw', 'invalid_sapaw')
  }
  const next = cloneState(state)
  const hand = requireHand(next, playerId)
  removeCardsFromHand(hand, cards)
  const meld = next.melds.find((m) => m.id === meldId)!
  meld.cards.push(...cards)
  const win = handEmptyWin(next, playerId, hand)
  if (win) next.status = 'finished'
  return { state: next, win }
}

export type CallTongitsMeldOp =
  | { type: MeldType; cards: CardCode[] }
  | { meldId: string; cards: CardCode[] }

/**
 * Batched shortcut: apply a sequence of new melds and/or sapaws in one atomic
 * action. Must consume the player's entire hand (leave zero cards) or the
 * whole batch is rejected and the state is unchanged.
 */
export function applyCallTongits(
  state: EngineGameState,
  playerId: string,
  ops: CallTongitsMeldOp[],
  nextMeldId: () => string,
): ActionResult {
  requireTurn(state, playerId)
  if (!state.hasDrawnThisTurn) {
    throw new EngineError('You must draw before declaring Tongits', 'must_draw_first')
  }
  if (ops.length === 0) {
    throw new EngineError('No melds provided', 'invalid_declare')
  }

  let working = cloneState(state)
  for (const op of ops) {
    if ('meldId' in op) {
      const res = applySapaw(working, playerId, op.meldId, op.cards)
      working = res.state
    } else {
      const res = applyMeld(working, playerId, op.type, op.cards, nextMeldId())
      working = res.state
    }
  }

  const hand = requireHand(working, playerId)
  if (hand.cards.length > 0) {
    throw new EngineError('Declaring Tongits requires melding your entire hand', 'incomplete_declare')
  }

  const win: WinResult = {
    winnerId: playerId,
    winType: hand.hasDiscarded ? 'meld_out' : 'tongits',
    finalHands: working.hands.map((h) => ({ playerId: h.playerId, cards: h.cards })),
  }
  working.status = 'finished'
  return { state: working, win }
}

/**
 * Called when a player's turn is about to start and the draw pile is empty —
 * ends the round in a showdown instead of offering a draw. This only gathers
 * final hands; the caller must run scoring.computeFightResults(finalHands) to
 * determine the actual winnerId (or a tie, in which case winType becomes 'draw').
 */
export function resolveFight(state: EngineGameState): WinResult {
  const values = state.hands.map((h) => ({ playerId: h.playerId, cards: h.cards }))
  return {
    winnerId: null,
    winType: 'fight',
    finalHands: values,
  }
}
