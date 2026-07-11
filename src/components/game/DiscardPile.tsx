import { useState } from 'react'
import { clsx } from 'clsx'
import { PlayingCard } from './Card'
import { Modal } from '@/components/ui/Modal'
import type { CardCode } from '@engine/types'

interface DiscardPileProps {
  cards: CardCode[]
}

export function DiscardPile({ cards }: DiscardPileProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const top = cards[cards.length - 1]

  return (
    <>
      <div
        role="button"
        tabIndex={cards.length > 0 ? 0 : -1}
        onClick={cards.length > 0 ? () => setHistoryOpen(true) : undefined}
        onKeyDown={
          cards.length > 0
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setHistoryOpen(true)
                }
              }
            : undefined
        }
        className={clsx('flex flex-col items-center gap-1.5', cards.length > 0 && 'cursor-pointer')}
      >
        {top ? (
          <PlayingCard code={top} size="md" layoutId={`discard-${top}`} />
        ) : (
          <div className="h-23 w-16 rounded-md border border-dashed border-white/20 landscape:h-20 landscape:w-14" />
        )}
        <span className="text-xs text-white/50">
          Discard{cards.length > 0 ? ` (${cards.length}) — tap to view` : ''}
        </span>
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={`Discard pile (${cards.length})`}>
        <div className="flex max-h-80 flex-wrap justify-center gap-2 overflow-y-auto">
          {[...cards].reverse().map((code, i) => (
            <div key={`${code}-${i}`} className="flex flex-col items-center gap-1">
              <PlayingCard code={code} size="sm" />
              {i === 0 && <span className="text-[10px] text-gold-400">Latest</span>}
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
