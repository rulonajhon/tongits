import { useCallback } from 'react'
import type { CardCode, MeldType } from '@engine/types'
import { sendGameAction } from '@/services/supabase/games'
import type { GameActionPayload } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSound } from './useSound'

/**
 * Single guarded entry point for every turn action. Shared by the ActionBar
 * buttons and the tap-to-draw pile so both funnel through the same
 * pending/error state — no duplicate in-flight requests no matter which UI
 * element triggered the action.
 */
export function useGameActions(gameId: string) {
  const pendingAction = useGameStore((s) => s.pendingAction)
  const { playDraw, playDiscard, playMeld, playError, playFight } = useSound()

  const run = useCallback(
    async (payload: GameActionPayload, onSuccess?: () => void) => {
      const store = useGameStore.getState()
      if (store.pendingAction) return
      store.setPendingAction(true)
      store.setActionError(null)
      try {
        await sendGameAction(gameId, payload)
        onSuccess?.()
        store.clearSelection()
      } catch (err) {
        playError()
        store.setActionError(err instanceof Error ? err.message : 'Action failed')
      } finally {
        store.setPendingAction(false)
      }
    },
    [gameId, playError],
  )

  const draw = useCallback(() => run({ action: 'draw' }, playDraw), [run, playDraw])
  const discard = useCallback((card: CardCode) => run({ action: 'discard', card }, playDiscard), [run, playDiscard])
  const meld = useCallback(
    (type: MeldType, cards: CardCode[]) => run({ action: 'meld', type, cards }, playMeld),
    [run, playMeld],
  )
  const meldFromDiscard = useCallback(
    (type: MeldType, cards: CardCode[], discardCard: CardCode) =>
      run({ action: 'meld_from_discard', type, cards, discardCard }, playMeld),
    [run, playMeld],
  )
  const sapaw = useCallback(
    (meldId: string, cards: CardCode[]) => run({ action: 'sapaw', meldId, cards }, playMeld),
    [run, playMeld],
  )
  const fight = useCallback(() => run({ action: 'call_fight' }, playFight), [run, playFight])

  return { draw, discard, meld, meldFromDiscard, sapaw, fight, pendingAction }
}
