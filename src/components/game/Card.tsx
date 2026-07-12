import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { CardCode, Rank } from '@engine/types'
import { isRedSuit, parseCardCode, suitSymbol } from '@/utils/cardUtils'

export type CardHighlight = 'meld' | 'sapaw' | 'discard' | null

interface CardProps {
  code?: CardCode
  faceDown?: boolean
  selected?: boolean
  highlight?: CardHighlight
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  layoutId?: string
}

const sizeClasses = {
  sm: 'w-10 h-14 text-base',
  md: 'w-16 h-23 text-xl landscape:w-14 landscape:h-20 landscape:text-lg',
  lg: 'w-24 h-34 text-2xl landscape:w-16 landscape:h-20 landscape:text-lg',
}

const highlightRing: Record<Exclude<CardHighlight, null>, string> = {
  meld: 'ring-2 ring-emerald-400/80',
  sapaw: 'ring-2 ring-sapphire-500/80',
  discard: 'ring-2 ring-amber-400/80',
}

function FaceIcon({ rank, colorClass }: { rank: 'J' | 'Q' | 'K'; colorClass: string }) {
  if (rank === 'K') {
    return (
      <svg viewBox="0 0 24 16" className={clsx('h-[0.6em] w-[1.1em]', colorClass)} fill="currentColor">
        <path d="M2 15V6l4 3 6-7 6 7 4-3v9z" />
        <circle cx="2" cy="4.5" r="1.4" />
        <circle cx="12" cy="1.6" r="1.4" />
        <circle cx="22" cy="4.5" r="1.4" />
      </svg>
    )
  }
  if (rank === 'Q') {
    return (
      <svg viewBox="0 0 24 16" className={clsx('h-[0.55em] w-[1.05em]', colorClass)} fill="currentColor">
        <path d="M12 1 15 8 21 4 18.5 15h-13L3 4 9 8z" />
        <circle cx="12" cy="1" r="1.3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 16" className={clsx('h-[0.5em] w-[0.85em]', colorClass)} fill="currentColor">
      <path d="M12 0 15.5 6 12 9 8.5 6z" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  )
}

// Deliberately minimal: one big rank + one suit symbol, nothing else — no
// pip grids, no corner indices. Anchored to the upper-left corner (rather
// than centered) so the rank stays readable even when the hand overlaps
// cards — only the right edge of each card gets covered by its neighbor.
function CardFace({ rank, suit, red }: { rank: Rank; suit: ReturnType<typeof parseCardCode>['suit']; red: boolean }) {
  const colorClass = red ? 'text-ruby-500' : 'text-ink-900'
  const symbol = suitSymbol(suit)
  const isFace = rank === 'J' || rank === 'Q' || rank === 'K'

  return (
    <div className={clsx('absolute inset-0 flex flex-col items-start gap-0.5 p-1.5', colorClass)}>
      <span className="text-[1.6em] font-black leading-none">{rank}</span>
      <span className="text-[1em] leading-none">{symbol}</span>
      {isFace && <FaceIcon rank={rank} colorClass={colorClass} />}
    </div>
  )
}

export function PlayingCard({ code, faceDown, selected, highlight = null, size = 'md', onClick, layoutId }: CardProps) {
  const parsed = code ? parseCardCode(code) : null
  const red = parsed ? isRedSuit(parsed.suit) : false

  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      onClick={onClick}
      whileHover={onClick ? { y: -6, zIndex: 30 } : undefined}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      animate={{ y: selected ? -10 : 0, zIndex: selected ? 20 : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={clsx(
        'relative select-none rounded-md border-2 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)]',
        sizeClasses[size],
        onClick ? 'cursor-pointer' : 'cursor-default',
        selected ? 'ring-2 ring-gold-400 border-gold-400' : 'border-ink-900/70',
        !selected && highlight && highlightRing[highlight],
        (faceDown || !parsed) && 'bg-gradient-to-br from-felt-700 to-felt-900',
      )}
    >
      {faceDown || !parsed ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-md">
          <div className="h-[70%] w-[70%] rounded-sm border border-gold-500/40 bg-[repeating-linear-gradient(45deg,rgba(244,201,93,0.08)_0,rgba(244,201,93,0.08)_4px,transparent_4px,transparent_8px)]" />
        </div>
      ) : (
        <CardFace rank={parsed.rank} suit={parsed.suit} red={red} />
      )}
    </motion.button>
  )
}
