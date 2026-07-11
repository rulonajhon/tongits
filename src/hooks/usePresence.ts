import { useEffect } from 'react'
import { supabase } from '@/services/supabase/client'
import { useLobbyStore, type OnlinePlayer } from '@/stores/lobbyStore'

/** Tracks the caller's presence on a shared "lobby" channel and mirrors who else is online. */
export function useLobbyPresence(userId: string | null, username: string | null) {
  const setOnlinePlayers = useLobbyStore((s) => s.setOnlinePlayers)

  useEffect(() => {
    if (!userId || !username) return

    const channel = supabase.channel('lobby', { config: { presence: { key: userId } } })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlinePlayer>()
        const players = Object.values(state).flatMap((entries) =>
          entries.map((e) => ({ userId: e.userId, username: e.username })),
        )
        setOnlinePlayers(players)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, username, online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, username, setOnlinePlayers])
}

/** Tracks the caller's presence in a specific room, used for connection-status badges. */
export function useRoomPresence(roomId: string | null, userId: string | null) {
  useEffect(() => {
    if (!roomId || !userId) return

    const channel = supabase.channel(`room-presence:${roomId}`, { config: { presence: { key: userId } } })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, online_at: new Date().toISOString() })
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, userId])
}
