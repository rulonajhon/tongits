import { PlayingCard } from './Card'
import type { CardCode } from '@engine/types'

interface DiscardPileProps {
  cards: CardCode[]
}

export function DiscardPile({ cards }: DiscardPileProps) {
  const top = cards[cards.length - 1]

  return (
    <div className="flex flex-col items-center gap-1.5">
      {top ? (
        <PlayingCard code={top} size="md" layoutId={`discard-${top}`} />
      ) : (
        <div className="w-12 h-17 rounded-md border border-dashed border-white/20" />
      )}
      <span className="text-xs text-white/50">Discard</span>
    </div>
  )
}
