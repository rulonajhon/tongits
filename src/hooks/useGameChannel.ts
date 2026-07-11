import { useEffect } from 'react'
import { supabase } from '@/services/supabase/client'
import { fetchGame, fetchGamePlayers, fetchGameResults, fetchMelds, fetchOwnHand } from '@/services/supabase/games'
import { useGameStore } from '@/stores/gameStore'

/**
 * Keeps the game store in sync with the DB. `player_hands` is never in the
 * realtime publication (by design — see supabase/migrations), so whenever
 * any non-sensitive table changes, this also re-fetches the caller's own
 * hand via a normal authenticated SELECT, which RLS restricts to their row.
 */
export function useGameChannel(gameId: string | null, userId: string | null) {
  const setGame = useGameStore((s) => s.setGame)
  const setPlayers = useGameStore((s) => s.setPlayers)
  const setMelds = useGameStore((s) => s.setMelds)
  const setOwnHand = useGameStore((s) => s.setOwnHand)
  const setResults = useGameStore((s) => s.setResults)

  useEffect(() => {
    if (!gameId || !userId) return
    let cancelled = false

    async function refresh() {
      const [game, players, melds, hand] = await Promise.all([
        fetchGame(gameId!),
        fetchGamePlayers(gameId!),
        fetchMelds(gameId!),
        fetchOwnHand(gameId!, userId!),
      ])
      if (cancelled) return
      setGame(game)
      setPlayers(players)
      setMelds(melds)
      setOwnHand(hand)
      if (game.status === 'finished') {
        const results = await fetchGameResults(gameId!)
        if (!cancelled) setResults(results)
      }
    }

    refresh()

    const channel = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, refresh)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        refresh,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'melds', filter: `game_id=eq.${gameId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` }, refresh)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [gameId, userId, setGame, setPlayers, setMelds, setOwnHand, setResults])
}
