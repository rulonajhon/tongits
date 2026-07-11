import { useEffect } from 'react'
import { supabase } from '@/services/supabase/client'
import { fetchRoom, fetchRoomPlayers } from '@/services/supabase/rooms'
import { useRoomStore } from '@/stores/roomStore'

/**
 * Keeps the room store in sync with the DB. Room rosters are tiny (max 3),
 * so on any change we just refetch both rows wholesale rather than patching
 * state incrementally — simpler and just as fast at this scale.
 */
export function useRoomChannel(roomId: string | null) {
  const setRoom = useRoomStore((s) => s.setRoom)
  const setPlayers = useRoomStore((s) => s.setPlayers)
  const setLoading = useRoomStore((s) => s.setLoading)
  const setError = useRoomStore((s) => s.setError)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false

    async function refresh() {
      try {
        const [room, players] = await Promise.all([fetchRoom(roomId!), fetchRoomPlayers(roomId!)])
        if (!cancelled) {
          setRoom(room)
          setPlayers(players)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load room')
      }
    }

    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, refresh)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        refresh,
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [roomId, setRoom, setPlayers, setLoading, setError])
}
