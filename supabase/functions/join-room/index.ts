import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireCaller, UnauthorizedError } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await requireCaller(req)
    const body = await req.json().catch(() => ({}))
    const roomNumber = String(body.roomNumber ?? '').trim()

    if (!/^\d{6}$/.test(roomNumber)) {
      return errorResponse('Room number must be 6 digits', 400)
    }

    const admin = createAdminClient()

    const { data: room, error: roomError } = await admin
      .from('rooms')
      .select('id, status, max_players')
      .eq('room_number', roomNumber)
      .neq('status', 'completed')
      .maybeSingle()

    if (roomError) return errorResponse(roomError.message, 500)
    if (!room) return errorResponse('Room not found', 404, 'room_not_found')
    if (room.status !== 'waiting') {
      return errorResponse('Room has already started', 409, 'room_started')
    }

    const { data: existingPlayers, error: playersError } = await admin
      .from('room_players')
      .select('player_id, seat')
      .eq('room_id', room.id)

    if (playersError) return errorResponse(playersError.message, 500)

    const alreadyIn = existingPlayers.find((p) => p.player_id === userId)
    if (alreadyIn) {
      return jsonResponse({ roomId: room.id })
    }

    if (existingPlayers.length >= room.max_players) {
      return errorResponse('Room is full', 409, 'room_full')
    }

    const takenSeats = new Set(existingPlayers.map((p) => p.seat))
    let seat = 0
    while (takenSeats.has(seat)) seat++

    const { error: insertError } = await admin
      .from('room_players')
      .insert({ room_id: room.id, player_id: userId, seat, is_host: false })

    if (insertError) {
      if (insertError.code === '23505') {
        // Lost a race to fill the last seat — report as full rather than a generic 500.
        return errorResponse('Room is full', 409, 'room_full')
      }
      return errorResponse(insertError.message, 500)
    }

    return jsonResponse({ roomId: room.id })
  } catch (err) {
    if (err instanceof UnauthorizedError) return errorResponse(err.message, 401)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
