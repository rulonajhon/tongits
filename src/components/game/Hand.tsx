import { AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { PlayingCard } from './Card'
import { useGameStore } from '@/stores/gameStore'
import { groupHandForDisplay, sapawEligibleCards } from '@/utils/handGrouping'

interface HandProps {
  interactive: boolean
}

export function Hand({ interactive }: HandProps) {
  const ownHand = useGameStore((s) => s.ownHand)
  const selectedCards = useGameStore((s) => s.selectedCards)
  const selectedMeldId = useGameStore((s) => s.selectedMeldId)
  const melds = useGameStore((s) => s.melds)
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection)

  const { groups, deadwood } = groupHandForDisplay(ownHand)

  const selectedMeld = selectedMeldId ? melds.find((m) => m.id === selectedMeldId) : null
  const sapawTargets = selectedMeld ? sapawEligibleCards(ownHand, selectedMeld.type, selectedMeld.cards) : null

  function renderCard(code: string, indexInGroup: number) {
    return (
      // Overlap cards within a group (skip the first) — the rank is anchored
      // to each card's upper-left corner specifically so it stays readable
      // even with its right edge covered by the next card.
      <div key={code} className={clsx(indexInGroup > 0 && '-ml-12 landscape:-ml-8')}>
        <PlayingCard
          code={code}
          layoutId={`hand-${code}`}
          size="lg"
          selected={selectedCards.includes(code)}
          highlight={sapawTargets?.has(code) ? 'sapaw' : null}
          onClick={interactive ? () => toggleCardSelection(code) : undefined}
        />
      </div>
    )
  }

  return (
    // Deliberately left-aligned, not centered: `justify-center` anywhere in this
    // scroll chain pushes the start of overflowing content into negative
    // (unreachable) scroll space, permanently hiding the first card(s).
    <div className="overflow-x-auto overflow-y-hidden px-2 py-1 landscape:py-0.5">
      <div className="flex items-end gap-x-3 landscape:gap-x-2">
        <AnimatePresence initial={false}>
          {groups.map((group) => (
            <div key={group.id} className="flex shrink-0 items-end rounded-lg">
              {group.cards.map((code, i) => renderCard(code, i))}
            </div>
          ))}
          {deadwood.length > 0 && (
            <div className="flex shrink-0 items-end border-l border-white/10 pl-3">
              {deadwood.map((code, i) => renderCard(code, i))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
