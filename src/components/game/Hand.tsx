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
      <div key={code} className={clsx(indexInGroup > 0 && '-ml-14 landscape:-ml-10')}>
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
    // Centering trick that can't reintroduce the negative-scroll bug: the
    // scroller is a plain block, and `w-max` + `mx-auto` on its flex child
    // uses ordinary block-level auto-margin centering (not flex
    // justify-content). When the hand fits, margins split evenly and it's
    // centered. When it doesn't, block auto-margins resolve to 0 instead of
    // negative — the hand just starts flush left, fully reachable by scroll.
    <div className="overflow-x-auto overflow-y-hidden px-2 py-0.5 landscape:py-0">
      <div className="mx-auto flex w-max items-end gap-x-3 landscape:gap-x-2">
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
