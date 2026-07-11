import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireCaller, UnauthorizedError } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import {
  applyCallTongits,
  applyDiscard,
  applyDraw,
  applyFight,
  applyMeld,
  applySapaw,
  computeFightResults,
  computeMeldOutResults,
  EngineError,
  resolveFight,
  type CallTongitsMeldOp,
  type CardCode,
  type EngineGameState,
  type MeldType,
  type TableMeld,
  type WinResult,
} from '../_shared/engine/index.ts'

interface RequestBody {
  gameId: string
  action: 'draw' | 'discard' | 'meld' | 'sapaw' | 'call_tongits' | 'call_fight'
  card?: CardCode
  type?: MeldType
  cards?: CardCode[]
  meldId?: string
  melds?: CallTongitsMeldOp[]
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

/** Builds the `game` + `results` patch fragments for an action that just produced a win. */
function winPatch(win: WinResult) {
  const { results, winnerId, winType } = resultsPatch(win)
  return {
    game: {
      status: 'finished' as const,
      ended_at: new Date().toISOString(),
      winner_id: winnerId,
      win_type: winType,
    },
    results,
  }
}

function resultsPatch(win: WinResult) {
  const players = win.finalHands.map((h) => ({ playerId: h.playerId, unmeldedCards: h.cards }))
  if (win.winType === 'fight') {
    const results = computeFightResults(players, win.fightInitiatorId)
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
  const results = computeMeldOutResults(win.winnerId!, players, win.winType as 'meld_out' | 'tongits')
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
          const result = applyDraw(state, userId)
          patch = {
            game: {
              deck: result.state.deck,
              has_drawn_this_turn: true,
            },
            hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
            hand_counts: handCountsPatch(result.state),
            move: { player_id: userId, action: 'draw', payload: {} },
          }
          responseExtra = { drawnCard: result.drawnCard }
          break
        }

        case 'discard': {
          if (!body.card) return errorResponse('card is required', 400)
          const result = applyDiscard(state, userId, body.card)

          if (result.state.deck.length === 0) {
            const fightWin = resolveFight(result.state)
            const { results, winnerId, winType } = resultsPatch(fightWin)
            patch = {
              game: {
                status: 'finished',
                discard_pile: result.state.discardPile,
                has_drawn_this_turn: false,
                winner_id: winnerId,
                win_type: winType,
                ended_at: new Date().toISOString(),
              },
              hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
              hand_counts: handCountsPatch(result.state),
              discarded_players: [userId],
              move: { player_id: userId, action: 'discard', payload: { card: body.card } },
              results,
            }
          } else {
            patch = {
              game: {
                current_turn_player_id: result.state.currentTurnPlayerId,
                turn_number: game.turn_number + 1,
                discard_pile: result.state.discardPile,
                has_drawn_this_turn: false,
              },
              hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
              hand_counts: handCountsPatch(result.state),
              discarded_players: [userId],
              move: { player_id: userId, action: 'discard', payload: { card: body.card } },
            }
          }
          break
        }

        case 'meld': {
          if (!body.type || !body.cards) return errorResponse('type and cards are required', 400)
          const meldId = crypto.randomUUID()
          const result = applyMeld(state, userId, body.type, body.cards, meldId)
          const { melds_insert, melds_update } = meldPatch(state.melds, result.state.melds)
          const win = result.win ? winPatch(result.win) : null
          patch = {
            game: win?.game ?? {},
            hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
            hand_counts: handCountsPatch(result.state),
            melds_insert,
            melds_update,
            move: { player_id: userId, action: 'meld', payload: { type: body.type, cards: body.cards } },
            ...(win ? { results: win.results } : {}),
          }
          break
        }

        case 'sapaw': {
          if (!body.meldId || !body.cards) return errorResponse('meldId and cards are required', 400)
          const result = applySapaw(state, userId, body.meldId, body.cards)
          const { melds_insert, melds_update } = meldPatch(state.melds, result.state.melds)
          const win = result.win ? winPatch(result.win) : null
          patch = {
            game: win?.game ?? {},
            hands: [{ player_id: userId, cards: result.state.hands.find((h) => h.playerId === userId)!.cards }],
            hand_counts: handCountsPatch(result.state),
            melds_insert,
            melds_update,
            move: { player_id: userId, action: 'sapaw', payload: { meldId: body.meldId, cards: body.cards } },
            ...(win ? { results: win.results } : {}),
          }
          break
        }

        case 'call_tongits': {
          if (!body.melds || body.melds.length === 0) return errorResponse('melds are required', 400)
          const result = applyCallTongits(state, userId, body.melds, () => crypto.randomUUID())
          const { melds_insert, melds_update } = meldPatch(state.melds, result.state.melds)
          const win = winPatch(result.win!)
          patch = {
            game: win.game,
            hands: [{ player_id: userId, cards: [] }],
            hand_counts: handCountsPatch(result.state),
            melds_insert,
            melds_update,
            move: { player_id: userId, action: 'call_tongits', payload: { melds: body.melds } },
            results: win.results,
          }
          break
        }

        case 'call_fight': {
          const result = applyFight(state, userId)
          const win = winPatch(result.win!)
          patch = {
            game: win.game,
            hand_counts: handCountsPatch(result.state),
            move: { player_id: userId, action: 'call_fight', payload: {} },
            results: win.results,
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
