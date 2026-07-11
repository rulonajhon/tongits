import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/stores/gameStore'
import { sendGameAction } from '@/services/supabase/games'
import { isValidSapaw, isValidSet, isValidRun } from '@engine/melds'
import { useSound } from '@/hooks/useSound'

interface ActionBarProps {
  gameId: string
  userId: string
}

export function ActionBar({ gameId, userId }: ActionBarProps) {
  const game = useGameStore((s) => s.game)
  const melds = useGameStore((s) => s.melds)
  const selectedCards = useGameStore((s) => s.selectedCards)
  const selectedMeldId = useGameStore((s) => s.selectedMeldId)
  const pendingAction = useGameStore((s) => s.pendingAction)
  const setPendingAction = useGameStore((s) => s.setPendingAction)
  const setActionError = useGameStore((s) => s.setActionError)
  const clearSelection = useGameStore((s) => s.clearSelection)
  const { playDraw, playDiscard, playMeld, playError } = useSound()

  const isYourTurn = game?.status === 'playing' && game.currentTurnPlayerId === userId
  const hasDrawn = Boolean(game?.hasDrawnThisTurn)

  const meldCandidate = useMemo(() => {
    if (selectedCards.length < 3) return null
    if (isValidSet(selectedCards).valid) return 'set' as const
    if (isValidRun(selectedCards).valid) return 'run' as const
    return null
  }, [selectedCards])

  const sapawCandidate = useMemo(() => {
    if (!selectedMeldId || selectedCards.length === 0) return false
    const target = melds.find((m) => m.id === selectedMeldId)
    if (!target) return false
    return isValidSapaw(target.type, target.cards, selectedCards).valid
  }, [selectedMeldId, selectedCards, melds])

  async function run(action: () => Promise<unknown>, onSuccess?: () => void) {
    setPendingAction(true)
    setActionError(null)
    try {
      await action()
      onSuccess?.()
      clearSelection()
    } catch (err) {
      playError()
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setPendingAction(false)
    }
  }

  const canDraw = isYourTurn && !hasDrawn && !pendingAction
  const canDiscard = isYourTurn && hasDrawn && selectedCards.length === 1 && !pendingAction
  const canMeld = isYourTurn && hasDrawn && meldCandidate !== null && !pendingAction
  const canSapaw = isYourTurn && hasDrawn && sapawCandidate && !pendingAction

  return (
    <div className="flex flex-col items-center gap-2">
      {!isYourTurn && <p className="text-xs text-white/40">Waiting for your turn…</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="primary"
          disabled={!canDraw}
          onClick={() => run(() => sendGameAction(gameId, { action: 'draw' }), playDraw)}
        >
          Draw
        </Button>
        <Button
          variant="secondary"
          disabled={!canMeld}
          onClick={() =>
            run(
              () => sendGameAction(gameId, { action: 'meld', type: meldCandidate!, cards: selectedCards }),
              playMeld,
            )
          }
        >
          Meld
        </Button>
        <Button
          variant="secondary"
          disabled={!canSapaw}
          onClick={() =>
            run(
              () => sendGameAction(gameId, { action: 'sapaw', meldId: selectedMeldId!, cards: selectedCards }),
              playMeld,
            )
          }
        >
          Sapaw
        </Button>
        <Button
          variant="danger"
          disabled={!canDiscard}
          onClick={() =>
            run(() => sendGameAction(gameId, { action: 'discard', card: selectedCards[0] }), playDiscard)
          }
        >
          Discard
        </Button>
      </div>
      <p className="max-w-xs text-center text-[11px] text-white/35">
        Select 3+ cards of the same rank (set) or a same-suit run to Meld. Select a table meld, then hand cards
        that extend it, to Sapaw. Select exactly one card to Discard. Emptying your hand wins automatically.
      </p>
    </div>
  )
}
