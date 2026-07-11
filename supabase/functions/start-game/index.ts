import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireCaller, UnauthorizedError } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { dealNewGame } from '../_shared/engine/index.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await requireCaller(req)
    const body = await req.json().catch(() => ({}))
    const roomId = String(body.roomId ?? '')
    if (!roomId) return errorResponse('roomId is required', 400)

    const admin = createAdminClient()

    const { data: room, error: roomError } = await admin
      .from('rooms')
      .select('id, host_id, status')
      .eq('id', roomId)
      .single()

    if (roomError || !room) return errorResponse('Room not found', 404)
    if (room.host_id !== userId) return errorResponse('Only the host can start the game', 403)
    if (room.status !== 'waiting') return errorResponse('Room has already started', 409)

    const { data: players, error: playersError } = await admin
      .from('room_players')
      .select('player_id, seat')
      .eq('room_id', roomId)
      .order('seat', { ascending: true })

    if (playersError) return errorResponse(playersError.message, 500)
    if (!players || players.length !== 3) {
      return errorResponse('Exactly 3 players are required to start', 400, 'not_enough_players')
    }

    const playerOrder = players.map((p) => p.player_id)
    const dealerId = playerOrder[Math.floor(Math.random() * playerOrder.length)]

    const { state } = dealNewGame(playerOrder, dealerId)

    const hands = playerOrder.map((playerId, seat) => ({
      player_id: playerId,
      seat,
      cards: state.hands.find((h) => h.playerId === playerId)!.cards,
    }))

    const { data: gameId, error: rpcError } = await admin.rpc('start_game', {
      p_room_id: roomId,
      p_dealer_id: dealerId,
      p_deck: state.deck,
      p_hands: hands,
    })

    if (rpcError) return errorResponse(rpcError.message, 500)

    return jsonResponse({ gameId })
  } catch (err) {
    if (err instanceof UnauthorizedError) return errorResponse(err.message, 401)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
