import { useState } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { PlayingCard } from './Card'
import { Modal } from '@/components/ui/Modal'
import type { CardCode } from '@engine/types'

interface DiscardPileProps {
  cards: CardCode[]
  /** True when the top card can currently be taken into a new meld — see ActionBar's "Pick Up" button. */
  canTake?: boolean
}

export function DiscardPile({ cards, canTake }: DiscardPileProps) {
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
        className={clsx('relative flex flex-col items-center gap-0.5', cards.length > 0 && 'cursor-pointer')}
      >
        {top ? (
          <>
            {canTake && (
              <motion.div
                className="pointer-events-none absolute -inset-1.5 rounded-lg bg-amber-400/30"
                animate={{ opacity: [0.25, 0.55, 0.25] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <PlayingCard code={top} size="md" layoutId={`discard-${top}`} highlight={canTake ? 'discard' : null} />
          </>
        ) : (
          <div className="h-23 w-16 rounded-md border border-dashed border-white/20 landscape:h-20 landscape:w-14" />
        )}
        <span className="text-[10px] leading-none text-white/50">
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
