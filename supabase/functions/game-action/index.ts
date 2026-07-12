import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireCaller, UnauthorizedError } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import {
  applyCallTongits,
  applyDiscard,
  applyDraw,
  applyFight,
  applyMeld,
  applyMeldFromDiscard,
  applySapaw,
  computeFightResults,
  computeHitterTransition,
  computeMeldOutResults,
  EngineError,
  MAX_STREAK_MULTIPLIER,
  pickAutoDiscard,
  resolveFight,
  type CallTongitsMeldOp,
  type CardCode,
  type EngineGameState,
  type JackpotResetMode,
  type MeldType,
  type TableMeld,
  type WinResult,
} from '../_shared/engine/index.ts'

const TURN_SECONDS = 30

type AdminClient = ReturnType<typeof createAdminClient>

interface RequestBody {
  gameId: string
  action: 'draw' | 'discard' | 'meld' | 'meld_from_discard' | 'sapaw' | 'call_tongits' | 'call_fight' | 'claim_timeout'
  card?: CardCode
  type?: MeldType
  cards?: CardCode[]
  meldId?: string
  melds?: CallTongitsMeldOp[]
  /** For 'meld_from_discard' — the card the client believes is on top of the discard pile. */
  discardCard?: CardCode
}

function meldPatch(before: TableMeld[], after: TableMeld[]) {
  const beforeIds = new Set(before.map((m) => m.id))
  const melds_insert = after
    .filter((m) => !beforeIds.has(m.id))
    .map((m) => ({ id: m.id, owner_id: m.ownerId, type: m.type, cards: m.cards }))
  const melds_update = after
    .filter((m) => {
      if (!beforeIds.has(m.id)) return false
      const orig = before.find((o) => o.id === m.id)!
      return orig.cards.length !== m.cards.length
    })
    .map((m) => ({ id: m.id, cards: m.cards }))
  return { melds_insert, melds_update }
}

function handCountsPatch(state: EngineGameState) {
  return state.hands.map((h) => ({ player_id: h.playerId, hand_count: h.cards.length }))
}

function nextDeadline(): string {
  return new Date(Date.now() + TURN_SECONDS * 1000).toISOString()
}

/**
 * Looks up the would-be winner's current win streak (from room_players,
 * which persists across rematches in the same room) and returns the
 * multiplier for THIS win (streak length, capped) plus the new streak value
 * to persist. A null winnerId (draw) always yields a 1x multiplier.
 */
async function computeStreakMultiplier(admin: AdminClient, roomId: string, winnerId: string | null) {
  if (!winnerId) return { multiplier: 1, newStreak: 0 }
  const { data } = await admin
    .from('room_players')
    .select('win_streak')
    .eq('room_id', roomId)
    .eq('player_id', winnerId)
    .maybeSingle()
  const newStreak = (data?.win_streak ?? 0) + 1
  return { multiplier: Math.min(newStreak, MAX_STREAK_MULTIPLIER), newStreak }
}

function resultsPatch(win: WinResult, streakMultiplier: number) {
  const players = win.finalHands.map((h) => ({ playerId: h.playerId, unmeldedCards: h.cards }))
  if (win.winType === 'fight') {
    const results = computeFightResults(players, win.fightInitiatorId, streakMultiplier)
    const winner = results.find((r) => r.isWinner)
    return {
      results: results.map((r) => ({
        player_id: r.playerId,
        score: r.score,
        is_winner: r.isWinner,
        hand_value: r.handValue,
        breakdown: r.breakdown,
      })),
      winnerId: winner?.playerId ?? null,
      winType: (winner ? 'fight' : 'draw') as 'fight' | 'draw',
    }
  }
  const results = computeMeldOutResults(
    win.winnerId!,
    players,
    win.winType as 'meld_out' | 'tongits',
    streakMultiplier,
  )
  return {
    results: results.map((r) => ({
      player_id: r.playerId,
      score: r.score,
      is_winner: r.isWinner,
      hand_value: r.handValue,
      breakdown: r.breakdown,
    })),
    winnerId: win.winnerId,
    winType: win.winType,
  }
}

interface RoomPatchFragment {
  current_hitter_player_id: string | null
  hitter_win_streak: number
  jackpot_amount: number
  hitter_updated_at: string
}

interface HitterHistoryPatchFragment {
  hand_winner_player_id: string | null
  previous_hitter_player_id: string | null
  new_hitter_player_id: string | null
  previous_streak: number
  new_streak: number
  jackpot_before: number
  jackpot_after: number
  jackpot_awarded: boolean
  jackpot_winner_player_id: string | null
}

interface WinPatchResult {
  game: Record<string, unknown>
  results: unknown
  room_player_updates: unknown
  room?: RoomPatchFragment
  hitter_history?: HitterHistoryPatchFragment
}

/** Spreadable into a case's patch object — omits both keys when there was no Hitter transition to persist. */
function hitterRoomPatch(win: WinPatchResult): { room?: RoomPatchFragment; hitter_history?: HitterHistoryPatchFragment } {
  return win.room ? { room: win.room, hitter_history: win.hitter_history } : {}
}

/**
 * Looks up the room's current Hitter/jackpot state and runs it through the
 * pure `computeHitterTransition`. A null winnerId (void/drawn/tied hand)
 * short-circuits to no change at all, per the Hitter rules.
 */
async function computeHitterPatch(admin: AdminClient, roomId: string, winnerId: string | null) {
  if (!winnerId) return null
  const { data: room } = await admin
    .from('rooms')
    .select(
      'current_hitter_player_id, hitter_win_streak, jackpot_amount, required_consecutive_wins, jackpot_starting_amount, jackpot_reset_mode',
    )
    .eq('id', roomId)
    .single()
  if (!room) return null

  return computeHitterTransition({
    currentHitterPlayerId: room.current_hitter_player_id,
    hitterWinStreak: room.hitter_win_streak,
    jackpotAmount: room.jackpot_amount,
    handWinnerPlayerId: winnerId,
    requiredConsecutiveWins: room.required_consecutive_wins,
    jackpotStartingAmount: room.jackpot_starting_amount,
    jackpotResetMode: room.jackpot_reset_mode as JackpotResetMode,
  })
}

/** Builds the `game` + `results` + `room_player_updates` + `room`/`hitter_history` patch fragments for an action that just ended the round. */
async function winPatch(admin: AdminClient, roomId: string, gameId: string, win: WinResult): Promise<WinPatchResult> {
  const { multiplier, newStreak } = await computeStreakMultiplier(admin, roomId, win.winnerId)
  const { results, winnerId, winType } = resultsPatch(win, multiplier)
  const hitter = await computeHitterPatch(admin, roomId, winnerId)

  const room_player_updates = win.finalHands.map((h) => ({
    player_id: h.playerId,
    win_streak: h.playerId === winnerId ? newStreak : 0,
    score_delta: results.find((r) => r.player_id === h.playerId)?.score ?? 0,
    jackpot_delta: hitter?.jackpotAwarded && h.playerId === hitter.jackpotWinnerPlayerId ? hitter.jackpotAwardAmount : 0,
  }))

  return {
    game: {
      status: 'finished' as const,
      ended_at: new Date().toISOString(),
      winner_id: winnerId,
      win_type: winType,
      turn_deadline: null,
    },
    results,
    room_player_updates,
    ...(hitter?.changed
      ? {
          room: {
            current_hitter_player_id: hitter.newHitterPlayerId,
            hitter_win_streak: hitter.newWinStreak,
            jackpot_amount: hitter.jackpotAfter,
            hitter_updated_at: new Date().toISOString(),
          },
          hitter_history: {
            hand_winner_player_id: winnerId,
            previous_hitter_player_id: hitter.previousHitterPlayerId,
            new_hitter_player_id: hitter.newHitterPlayerId,
            previous_streak: hitter.previousWinStreak,
            new_streak: hitter.newWinStreak,
            jackpot_before: hitter.jackpotBefore,
            jackpot_after: hitter.jackpotAfter,
            jackpot_awarded: hitter.jackpotAwarded,
            jackpot_winner_player_id: hitter.jackpotWinnerPlayerId,
          },
        }
      : {}),
  }
}

/** Shared by the manual 'draw' action and the auto-draw path of 'claim_timeout'. */
function buildDrawPatch(state: EngineGameState, playerId: string) {
  const result = applyDraw(state, playerId)
  return {
    patch: {
      game: {
        deck: result.state.deck,
        has_drawn_this_turn: true,
        turn_deadline: nextDeadline(),
      },
      hands: [{ player_id: playerId, cards: result.state.hands.find((h) => h.playerId === playerId)!.cards }],
      hand_counts: handCountsPatch(result.state),
      move: { player_id: playerId, action: 'draw', payload: {} },
    },
    drawnCard: result.drawnCard,
  }
}

/** Shared by the manual 'discard' action and the auto-discard path of 'claim_timeout'. */
async function buildDiscardPatch(
  admin: AdminClient,
  roomId: string,
  gameId: string,
  state: EngineGameState,
  playerId: string,
  card: CardCode,
  currentTurnNumber: number,
  auto: boolean,
) {
  const result = applyDiscard(state, playerId, card)

  if (result.state.deck.length === 0) {
    const fightWin = resolveFight(result.state)
    const win = await winPatch(admin, roomId, gameId, fightWin)
    return {
      game: {
        ...win.game,
        discard_pile: result.state.discardPile,
        has_drawn_this_turn: false,
      },
      hands: [{ player_id: playerId, cards: result.state.hands.find((h) => h.playerId === playerId)!.cards }],
      hand_counts: handCountsPatch(result.state),
      discarded_players: [playerId],
      move: { player_id: playerId, action: 'discard', payload: { card, auto } },
      results: win.results,
      room_player_updates: win.room_player_updates,
      ...hitterRoomPatch(win),
    }
  }

  return {
    game: {
      current_turn_player_id: result.state.currentTurnPlayerId,
      turn_number: currentTurnNumber + 1,
      discard_pile: result.state.discardPile,
      has_drawn_this_turn: false,
      turn_deadline: nextDeadline(),
    },
    hands: [{ player_id: playerId, cards: result.state.hands.find((h) => h.playerId === playerId)!.cards }],
    hand_counts: handCountsPatch(result.state),
    discarded_players: [playerId],
    move: { player_id: playerId, action: 'discard', payload: { card, auto } },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await requireCaller(req)
    const body = (await req.json().catch(() => ({}))) as Partial<RequestBody>
    const gameId = String(body.gameId ?? '')
    if (!gameId || !body.action) return errorResponse('gameId and action are required', 400)

    const admin = createAdminClient()

    const { data: game, error: gameError } = await admin.from('games').select('*').eq('id', gameId).single()
    if (gameError || !game) return errorResponse('Game not found', 404)

    const { data: gamePlayers, error: playersError } = await admin
      .from('game_players')
      .select('player_id, seat, has_discarded')
      .eq('game_id', gameId)
      .order('seat', { ascending: true })
    if (playersError || !gamePlayers) return errorResponse('Could not load game players', 500)

    if (!gamePlayers.some((p) => p.player_id === userId)) {
      return errorResponse('You are not a participant in this game', 403)
    }

    const { data: handRows, error: handsError } = await admin
      .from('player_hands')
      .select('player_id, cards')
      .eq('game_id', gameId)
    if (handsError) return errorResponse('Could not load hands', 500)

    const { data: meldRows, error: meldsError } = await admin
      .from('melds')
      .select('id, owner_id, type, cards')
      .eq('game_id', gameId)
    if (meldsError) return errorResponse('Could not load melds', 500)

    const handsByPlayer = new Map((handRows ?? []).map((h) => [h.player_id, h.cards as unknown as CardCode[]]))

    const state: EngineGameState = {
      deck: game.deck as unknown as CardCode[],
      discardPile: game.discard_pile as unknown as CardCode[],
      melds: (meldRows ?? []).map((m) => ({
        id: m.id,
        ownerId: m.owner_id,
        type: m.type as MeldType,
        cards: m.cards as unknown as CardCode[],
      })),
      hands: gamePlayers.map((p) => ({
        playerId: p.player_id,
        cards: handsByPlayer.get(p.player_id) ?? [],
        hasDiscarded: p.has_discarded,
      })),
      playerOrder: gamePlayers.map((p) => p.player_id),
      currentTurnPlayerId: game.current_turn_player_id ?? '',
      hasDrawnThisTurn: game.has_drawn_this_turn,
      status: game.status,
    }

    let patch: Record<string, unknown>
    let responseExtra: Record<string, unknown> = {}

    try {
      switch (body.action) {
        case 'draw': {
          const { patch: drawPatch, drawnCard } = buildDrawPatch(state, userId)
          patch = drawPatch
          responseExtra = { drawnCard }
          break
        }

        case 'discard': {
          if (!body.card) return errorResponse('card is required', 400)
          patch = await buildDiscardPatch(admin, game.room_id, gameId, state, userId, body.card, game.turn_number, false)
          break
        }

        case 'meld': {
          if (!body.type || !body.cards) return errorResponse('type and cards are required', 400)
          const meldId = crypto.randomUUID()
          const result = applyMeld(state, userId, body.type, body.cards, meldId)
          const { melds_insert, melds_update } = meldPatch(state.melds, result.state.melds)
          const win = result.win ? await winPatch(admin, game.room_id, gameId, result.win) : null
          patch = {
            game: win?.game ?? {},
            hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
            hand_counts: handCountsPatch(result.state),
            melds_insert,
            melds_update,
            move: { player_id: userId, action: 'meld', payload: { type: body.type, cards: body.cards } },
            ...(win
              ? {
                  results: win.results,
                  room_player_updates: win.room_player_updates,
                  ...hitterRoomPatch(win),
                }
              : {}),
          }
          break
        }

        case 'meld_from_discard': {
          if (!body.type || !body.cards || !body.discardCard) {
            return errorResponse('type, cards, and discardCard are required', 400)
          }
          const meldId = crypto.randomUUID()
          const result = applyMeldFromDiscard(state, userId, body.type, body.cards, body.discardCard, meldId)
          const { melds_insert, melds_update } = meldPatch(state.melds, result.state.melds)
          const win = result.win ? await winPatch(admin, game.room_id, gameId, result.win) : null
          patch = {
            game: {
              ...(win?.game ?? {}),
              discard_pile: result.state.discardPile,
              has_drawn_this_turn: win ? false : true,
              turn_deadline: win ? null : nextDeadline(),
            },
            hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
            hand_counts: handCountsPatch(result.state),
            melds_insert,
            melds_update,
            move: {
              player_id: userId,
              action: 'meld_from_discard',
              payload: { type: body.type, cards: body.cards, discardCard: body.discardCard },
            },
            ...(win
              ? {
                  results: win.results,
                  room_player_updates: win.room_player_updates,
                  ...hitterRoomPatch(win),
                }
              : {}),
          }
          break
        }

        case 'sapaw': {
          if (!body.meldId || !body.cards) return errorResponse('meldId and cards are required', 400)
          const result = applySapaw(state, userId, body.meldId, body.cards)
          const { melds_insert, melds_update } = meldPatch(state.melds, result.state.melds)
          const win = result.win ? await winPatch(admin, game.room_id, gameId, result.win) : null
          patch = {
            game: win?.game ?? {},
            hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
            hand_counts: handCountsPatch(result.state),
            melds_insert,
            melds_update,
            move: { player_id: userId, action: 'sapaw', payload: { meldId: body.meldId, cards: body.cards } },
            ...(win
              ? {
                  results: win.results,
                  room_player_updates: win.room_player_updates,
                  ...hitterRoomPatch(win),
                }
              : {}),
          }
          break
        }

        case 'call_tongits': {
          if (!body.melds || body.melds.length === 0) return errorResponse('melds are required', 400)
          const result = applyCallTongits(state, userId, body.melds, () => crypto.randomUUID())
          const { melds_insert, melds_update } = meldPatch(state.melds, result.state.melds)
          const win = await winPatch(admin, game.room_id, gameId, result.win!)
          patch = {
            game: win.game,
            hands: [{ player_id: userId, cards: [] }],
            hand_counts: handCountsPatch(result.state),
            melds_insert,
            melds_update,
            move: { player_id: userId, action: 'call_tongits', payload: { melds: body.melds } },
            results: win.results,
            room_player_updates: win.room_player_updates,
            ...hitterRoomPatch(win),
          }
          break
        }

        case 'call_fight': {
          const result = applyFight(state, userId)
          const win = await winPatch(admin, game.room_id, gameId, result.win!)
          patch = {
            game: win.game,
            hand_counts: handCountsPatch(result.state),
            move: { player_id: userId, action: 'call_fight', payload: {} },
            results: win.results,
            room_player_updates: win.room_player_updates,
            ...hitterRoomPatch(win),
          }
          break
        }

        case 'claim_timeout': {
          if (state.status !== 'playing') return errorResponse('Game is not active', 400)
          if (!game.turn_deadline) return errorResponse('No deadline set for this turn', 400)
          if (new Date(game.turn_deadline).getTime() > Date.now()) {
            return errorResponse('The turn has not timed out yet', 400, 'not_timed_out')
          }

          const currentPlayerId = state.currentTurnPlayerId
          if (!state.hasDrawnThisTurn) {
            const { patch: drawPatch } = buildDrawPatch(state, currentPlayerId)
            patch = drawPatch
          } else {
            const hand = state.hands.find((h) => h.playerId === currentPlayerId)!
            const card = pickAutoDiscard(hand.cards)
            patch = await buildDiscardPatch(admin, game.room_id, gameId, state, currentPlayerId, card, game.turn_number, true)
          }
          break
        }

        default:
          return errorResponse('Unknown action', 400)
      }
    } catch (err) {
      if (err instanceof EngineError) return errorResponse(err.message, 400, err.code)
      throw err
    }

    const { data: rpcData, error: rpcError } = await admin.rpc('apply_game_action', {
      p_game_id: gameId,
      p_expected_version: game.version,
      p_patch: patch,
    })

    if (rpcError) {
      if (rpcError.message.includes('version_conflict')) {
        return errorResponse('Game state changed, please retry', 409, 'version_conflict')
      }
      return errorResponse(rpcError.message, 500)
    }

    const gameRow = (rpcData as { game?: unknown } | null)?.game ?? null
    return jsonResponse({ ok: true, game: gameRow, ...responseExtra })
  } catch (err) {
    if (err instanceof UnauthorizedError) return errorResponse(err.message, 401)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
