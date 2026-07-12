import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireCaller, UnauthorizedError } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await requireCaller(req)
    const body = await req.json().catch(() => ({}))
    const roomId = String(body.roomId ?? '')
    if (!roomId) return errorResponse('roomId is required', 400)

    const admin = createAdminClient()

    const { data: room, error: roomError } = await admin.from('rooms').select('id, status').eq('id', roomId).single()
    if (roomError || !room) return errorResponse('Room not found', 404)

    // 'waiting' covers both the pre-game lobby and a room between rounds
    // (the server flips a room back to 'waiting' once a round finishes) —
    // leaving mid-round ('in_progress') isn't supported yet.
    if (room.status === 'in_progress') {
      return errorResponse('Cannot leave while a round is in progress', 409, 'game_in_progress')
    }

    const { error: deleteError } = await admin
      .from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('player_id', userId)

    if (deleteError) return errorResponse(deleteError.message, 500)

    // Hitter-leave policy (Option A, the default): a departing Hitter
    // forfeits their streak, but the jackpot they were chasing stays in the
    // pot for whoever's next. The `.eq('current_hitter_player_id', userId)`
    // guard makes this a no-op when the leaving player wasn't the Hitter.
    await admin
      .from('rooms')
      .update({ current_hitter_player_id: null, hitter_win_streak: 0, hitter_updated_at: new Date().toISOString() })
      .eq('id', roomId)
      .eq('current_hitter_player_id', userId)

    return jsonResponse({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedError) return errorResponse(err.message, 401)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
