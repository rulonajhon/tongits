import { useMemo, useState, type ReactNode } from 'react'
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

interface ActionButtonProps {
  icon: ReactNode
  label: string
  variant: 'success' | 'info' | 'warning' | 'danger'
  disabled: boolean
  onClick: () => void
}

// Fixed circle size with `!` overrides so the button can never balloon from
// its own content (e.g. text wrapping) — the label lives outside the button
// as plain text, not inside it, so it can't affect the button's dimensions.
function ActionButton({ icon, label, variant, disabled, onClick }: ActionButtonProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        pill
        variant={variant}
        disabled={disabled}
        onClick={onClick}
        className="!size-11 !p-0 landscape:!size-10"
      >
        <span aria-hidden className="text-lg leading-none landscape:text-base">
          {icon}
        </span>
      </Button>
      <span className="text-[9px] leading-none text-white/60">{label}</span>
    </div>
  )
}

export function ActionBar({ gameId, userId, side }: ActionBarProps) {
  const game = useGameStore((s) => s.game)
  const melds = useGameStore((s) => s.melds)
  const selectedCards = useGameStore((s) => s.selectedCards)
  const selectedMeldId = useGameStore((s) => s.selectedMeldId)
  const { discard, meld, meldFromDiscard, sapaw, fight, pendingAction } = useGameActions(gameId)
  const [confirmFight, setConfirmFight] = useState(false)

  const isYourTurn = game?.status === 'playing' && game.currentTurnPlayerId === userId
  const hasDrawn = Boolean(game?.hasDrawnThisTurn)
  const discardTop = game?.discardPile[game.discardPile.length - 1]

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

  const meldFromDiscardCandidate = useMemo(() => {
    if (!discardTop || selectedCards.length < 2) return null
    const combined = [...selectedCards, discardTop]
    if (isValidSet(combined).valid) return 'set' as const
    if (isValidRun(combined).valid) return 'run' as const
    return null
  }, [selectedCards, discardTop])

  const canDiscard = isYourTurn && hasDrawn && selectedCards.length === 1 && !pendingAction
  const canMeld = isYourTurn && hasDrawn && meldCandidate !== null && !pendingAction
  const canSapaw = isYourTurn && hasDrawn && sapawCandidate && !pendingAction
  const canFight = isYourTurn && hasDrawn && !pendingAction
  const canPickUpMeld = isYourTurn && !hasDrawn && meldFromDiscardCandidate !== null && !pendingAction

  if (side === 'left') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <ActionButton
          icon="✓"
          label="Meld"
          variant="success"
          disabled={!canMeld}
          onClick={() => meld(meldCandidate!, selectedCards)}
        />
        <ActionButton
          icon="+"
          label="Sapaw"
          variant="info"
          disabled={!canSapaw}
          onClick={() => sapaw(selectedMeldId!, selectedCards)}
        />
        <ActionButton
          icon="⇩"
          label="Pick Up"
          variant="success"
          disabled={!canPickUpMeld}
          onClick={() => meldFromDiscard(meldFromDiscardCandidate!, selectedCards, discardTop!)}
        />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col items-center gap-1.5">
        <ActionButton icon="⚔" label="Fight" variant="warning" disabled={!canFight} onClick={() => setConfirmFight(true)} />
        <ActionButton
          icon="↑"
          label="Discard"
          variant="danger"
          disabled={!canDiscard}
          onClick={() => discard(selectedCards[0])}
        />
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
