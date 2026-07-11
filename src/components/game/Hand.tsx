import { AnimatePresence } from 'framer-motion'
import { PlayingCard } from './Card'
import { useGameStore } from '@/stores/gameStore'
import { sortHand } from '@/utils/cardUtils'

interface HandProps {
  interactive: boolean
}

export function Hand({ interactive }: HandProps) {
  const ownHand = useGameStore((s) => s.ownHand)
  const selectedCards = useGameStore((s) => s.selectedCards)
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection)

  const sorted = sortHand(ownHand)

  return (
    <div className="flex flex-wrap items-end justify-center gap-1.5 py-2">
      <AnimatePresence initial={false}>
        {sorted.map((code) => (
          <PlayingCard
            key={code}
            code={code}
            layoutId={`hand-${code}`}
            size="lg"
            selected={selectedCards.includes(code)}
            onClick={interactive ? () => toggleCardSelection(code) : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
