import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useGameStore } from '@/stores/gameStore'
import { useGameActions } from '@/hooks/useGameActions'
import { isValidSapaw, isValidSet, isValidRun } from '@engine/melds'

interface ActionBarProps {
  gameId: string
  userId: string
  /** Draw happens by tapping the deck now — this renders the remaining
   *  actions split across the two sides flanking the hand. */
  side: 'left' | 'right'
}

export function ActionBar({ gameId, userId, side }: ActionBarProps) {
  const game = useGameStore((s) => s.game)
  const melds = useGameStore((s) => s.melds)
  const selectedCards = useGameStore((s) => s.selectedCards)
  const selectedMeldId = useGameStore((s) => s.selectedMeldId)
  const { discard, meld, sapaw, fight, pendingAction } = useGameActions(gameId)
  const [confirmFight, setConfirmFight] = useState(false)

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

  const canDiscard = isYourTurn && hasDrawn && selectedCards.length === 1 && !pendingAction
  const canMeld = isYourTurn && hasDrawn && meldCandidate !== null && !pendingAction
  const canSapaw = isYourTurn && hasDrawn && sapawCandidate && !pendingAction
  const canFight = isYourTurn && hasDrawn && !pendingAction

  const buttonClass = 'landscape:px-3 landscape:py-1.5 landscape:text-sm w-full'

  if (side === 'left') {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button pill size="md" variant="secondary" className={buttonClass} disabled={!canMeld} onClick={() => meld(meldCandidate!, selectedCards)}>
          <span aria-hidden>✓</span> Meld
        </Button>
        <Button pill size="md" variant="secondary" className={buttonClass} disabled={!canSapaw} onClick={() => sapaw(selectedMeldId!, selectedCards)}>
          <span aria-hidden>+</span> Sapaw
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <Button pill size="md" variant="warning" className={buttonClass} disabled={!canFight} onClick={() => setConfirmFight(true)}>
          <span aria-hidden>⚔</span> Fight
        </Button>
        <Button pill size="md" variant="danger" className={buttonClass} disabled={!canDiscard} onClick={() => discard(selectedCards[0])}>
          <span aria-hidden>↑</span> Discard
        </Button>
      </div>

      <Modal open={confirmFight} onClose={() => setConfirmFight(false)} title="Call a fight?">
        <p className="text-sm text-white/70">
          All hands reveal now. Lowest unmelded value wins. If you're not the lowest, you'll pay double for
          calling it.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmFight(false)}>
            Cancel
          </Button>
          <Button
            variant="warning"
            className="flex-1"
            onClick={() => {
              setConfirmFight(false)
              fight()
            }}
          >
            Fight!
          </Button>
        </div>
      </Modal>
    </>
  )
}
