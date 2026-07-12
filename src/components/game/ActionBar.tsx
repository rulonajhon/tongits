import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

interface ActionButtonConfig {
  id: string
  icon: ReactNode
  label: string
  variant: 'success' | 'info' | 'warning' | 'danger'
  disabled: boolean
  onClick: () => void
}

// Fixed circle size with `!` overrides so the button can never balloon from
// its own content (e.g. text wrapping) — the label lives outside the button
// as plain text, not inside it, so it can't affect the button's dimensions.
// `offset` staggers each button diagonally toward the hand as more stack up,
// and the enter/exit animation is what makes buttons pop in only once
// they're actually usable, instead of sitting there greyed out.
function ActionButton({ icon, label, variant, disabled, onClick, offset }: ActionButtonConfig & { offset: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6, x: offset }}
      animate={{ opacity: 1, scale: 1, x: offset }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex flex-col items-center gap-0.5"
    >
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
    </motion.div>
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

  // A button only shows up once it's actually something you could do right
  // now — e.g. selecting exactly one card surfaces Discard (and Sapaw too,
  // if you've also picked a target meld it can join) instead of a
  // permanently-visible row of greyed-out icons.
  const meldVisible = isYourTurn && hasDrawn && meldCandidate !== null
  const sapawVisible = isYourTurn && hasDrawn && sapawCandidate
  const pickUpVisible = isYourTurn && !hasDrawn && meldFromDiscardCandidate !== null
  const discardVisible = isYourTurn && hasDrawn && selectedCards.length === 1
  // Fight is only callable at the very start of your turn, before you've
  // drawn — once you draw, that window is closed until your next turn.
  const fightVisible = isYourTurn && !hasDrawn

  if (side === 'left') {
    const buttons: ActionButtonConfig[] = []
    if (meldVisible) {
      buttons.push({
        id: 'meld',
        icon: '✓',
        label: 'Meld',
        variant: 'success',
        disabled: pendingAction,
        onClick: () => meld(meldCandidate!, selectedCards),
      })
    }
    if (sapawVisible) {
      buttons.push({
        id: 'sapaw',
        icon: '+',
        label: 'Sapaw',
        variant: 'info',
        disabled: pendingAction,
        onClick: () => sapaw(selectedMeldId!, selectedCards),
      })
    }
    if (pickUpVisible) {
      buttons.push({
        id: 'pickup',
        icon: '⇩',
        label: 'Pick Up',
        variant: 'success',
        disabled: pendingAction,
        onClick: () => meldFromDiscard(meldFromDiscardCandidate!, selectedCards, discardTop!),
      })
    }
    return (
      <div className="flex flex-col items-start gap-1.5">
        <AnimatePresence>
          {buttons.map((btn, i) => (
            <ActionButton key={btn.id} {...btn} offset={i * 16} />
          ))}
        </AnimatePresence>
      </div>
    )
  }

  const rightButtons: ActionButtonConfig[] = []
  if (fightVisible) {
    rightButtons.push({
      id: 'fight',
      icon: '⚔',
      label: 'Fight',
      variant: 'warning',
      disabled: pendingAction,
      onClick: () => setConfirmFight(true),
    })
  }
  if (discardVisible) {
    rightButtons.push({
      id: 'discard',
      icon: '↑',
      label: 'Discard',
      variant: 'danger',
      disabled: pendingAction,
      onClick: () => discard(selectedCards[0]),
    })
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <AnimatePresence>
          {rightButtons.map((btn, i) => (
            <ActionButton key={btn.id} {...btn} offset={-i * 16} />
          ))}
        </AnimatePresence>
      </div>

      <Modal open={confirmFight} onClose={() => setConfirmFight(false)} title="Call a fight?">
        <p className="text-sm text-white/70">
          All hands reveal now, using your hand exactly as it stands. Lowest unmelded value wins. If you're not
          the lowest, you'll pay double for calling it.
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
