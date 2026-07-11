import { useEffect, useRef, useState } from 'react'
import { sendGameAction } from '@/services/supabase/games'
import { useGameStore } from '@/stores/gameStore'

export const TURN_SECONDS = 30

/**
 * Ticks down the current draw/discard phase deadline. When it hits zero,
 * fires a `claim_timeout` action once per deadline — the server independently
 * re-checks the real deadline before doing anything, so this is safe to call
 * from every connected client; whichever request lands first wins (via the
 * same optimistic-concurrency version check every other action uses) and the
 * rest are harmlessly ignored.
 */
export function useTurnTimer(gameId: string) {
  const turnDeadline = useGameStore((s) => s.game?.turnDeadline)
  const status = useGameStore((s) => s.game?.status)
  const [remaining, setRemaining] = useState<number | null>(null)
  const firedForDeadline = useRef<string | null>(null)

  useEffect(() => {
    if (!turnDeadline || status !== 'playing') {
      setRemaining(null)
      return
    }

    const deadlineMs = new Date(turnDeadline).getTime()

    function tick() {
      const secondsLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))
      setRemaining(secondsLeft)
      if (secondsLeft === 0 && firedForDeadline.current !== turnDeadline) {
        firedForDeadline.current = turnDeadline!
        sendGameAction(gameId, { action: 'claim_timeout' }).catch(() => {
          // Expected whenever another client (or the player themself) already acted first.
        })
      }
    }

    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [gameId, turnDeadline, status])

  return remaining
}
