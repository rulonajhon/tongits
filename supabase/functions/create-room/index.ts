import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { requireCaller, UnauthorizedError } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

const MAX_ATTEMPTS = 8

function randomRoomNumber(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await requireCaller(req)
    const admin = createAdminClient()

    let roomId: string | null = null
    let roomNumber = ''
    let inviteCode = ''
    let lastError: { code?: string; message: string } | null = null

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !roomId; attempt++) {
      roomNumber = randomRoomNumber()
      const { data, error } = await admin
        .from('rooms')
        .insert({ room_number: roomNumber, host_id: userId })
        .select('id, room_number, invite_code')
        .single()

      if (!error && data) {
        roomId = data.id
        roomNumber = data.room_number
        inviteCode = data.invite_code
        break
      }
      lastError = error
      if (error?.code !== '23505') break
    }

    if (!roomId) {
      return errorResponse(lastError?.message ?? 'Could not allocate a room number', 500)
    }

    const { error: joinError } = await admin
      .from('room_players')
      .insert({ room_id: roomId, player_id: userId, seat: 0, is_host: true })

    if (joinError) {
      await admin.from('rooms').delete().eq('id', roomId)
      return errorResponse(joinError.message, 500)
    }

    return jsonResponse({ roomId, roomNumber, inviteCode })
  } catch (err) {
    if (err instanceof UnauthorizedError) return errorResponse(err.message, 401)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500)
  }
})
