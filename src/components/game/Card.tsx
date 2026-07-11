import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { CardCode, Rank } from '@engine/types'
import { isRedSuit, parseCardCode, suitSymbol } from '@/utils/cardUtils'

export type CardHighlight = 'meld' | 'sapaw' | null

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
  sm: 'w-8 h-11 text-[9px]',
  md: 'w-13 h-18 text-[11px] landscape:w-11 landscape:h-15 landscape:text-[10px]',
  lg: 'w-20 h-28 text-sm landscape:w-14 landscape:h-20 landscape:text-xs',
}

const highlightRing: Record<Exclude<CardHighlight, null>, string> = {
  meld: 'ring-2 ring-emerald-400/80',
  sapaw: 'ring-2 ring-sapphire-500/80',
}

// Percentage-based pip positions within the card face, mirroring the classic
// French playing-card layout. Pips marked `rot` are flipped 180° so the
// bottom half of the card reads right-side-up when the card is turned around.
const L = 27
const C = 50
const R = 73
const T = 24
const UT = 38
const M = 50
const LM = 62
const B = 76

interface PipPos {
  x: number
  y: number
  rot?: boolean
}

const PIP_LAYOUTS: Record<string, PipPos[]> = {
  '2': [
    { x: C, y: T },
    { x: C, y: B, rot: true },
  ],
  '3': [
    { x: C, y: T },
    { x: C, y: M },
    { x: C, y: B, rot: true },
  ],
  '4': [
    { x: L, y: T },
    { x: R, y: T },
    { x: L, y: B, rot: true },
    { x: R, y: B, rot: true },
  ],
  '5': [
    { x: L, y: T },
    { x: R, y: T },
    { x: C, y: M },
    { x: L, y: B, rot: true },
    { x: R, y: B, rot: true },
  ],
  '6': [
    { x: L, y: T },
    { x: R, y: T },
    { x: L, y: M },
    { x: R, y: M },
    { x: L, y: B, rot: true },
    { x: R, y: B, rot: true },
  ],
  '7': [
    { x: L, y: T },
    { x: R, y: T },
    { x: C, y: UT },
    { x: L, y: M },
    { x: R, y: M },
    { x: L, y: B, rot: true },
    { x: R, y: B, rot: true },
  ],
  '8': [
    { x: L, y: T },
    { x: R, y: T },
    { x: C, y: UT },
    { x: L, y: M },
    { x: R, y: M },
    { x: C, y: LM, rot: true },
    { x: L, y: B, rot: true },
    { x: R, y: B, rot: true },
  ],
  '9': [
    { x: L, y: T },
    { x: R, y: T },
    { x: L, y: UT },
    { x: R, y: UT },
    { x: C, y: M },
    { x: L, y: LM, rot: true },
    { x: R, y: LM, rot: true },
    { x: L, y: B, rot: true },
    { x: R, y: B, rot: true },
  ],
  '10': [
    { x: L, y: T },
    { x: R, y: T },
    { x: C, y: 31 },
    { x: L, y: UT },
    { x: R, y: UT },
    { x: L, y: LM, rot: true },
    { x: R, y: LM, rot: true },
    { x: C, y: 69, rot: true },
    { x: L, y: B, rot: true },
    { x: R, y: B, rot: true },
  ],
}

function FaceIcon({ rank, colorClass }: { rank: 'J' | 'Q' | 'K'; colorClass: string }) {
  if (rank === 'K') {
    return (
      <svg viewBox="0 0 24 16" className={clsx('h-[38%] w-[60%]', colorClass)} fill="currentColor">
        <path d="M2 15V6l4 3 6-7 6 7 4-3v9z" />
        <circle cx="2" cy="4.5" r="1.4" />
        <circle cx="12" cy="1.6" r="1.4" />
        <circle cx="22" cy="4.5" r="1.4" />
      </svg>
    )
  }
  if (rank === 'Q') {
    return (
      <svg viewBox="0 0 24 16" className={clsx('h-[34%] w-[56%]', colorClass)} fill="currentColor">
        <path d="M12 1 15 8 21 4 18.5 15h-13L3 4 9 8z" />
        <circle cx="12" cy="1" r="1.3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 16" className={clsx('h-[30%] w-[44%]', colorClass)} fill="currentColor">
      <path d="M12 0 15.5 6 12 9 8.5 6z" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  )
}

function CardFace({ rank, suit, red }: { rank: Rank; suit: ReturnType<typeof parseCardCode>['suit']; red: boolean }) {
  const colorClass = red ? 'text-ruby-500' : 'text-ink-900'
  const symbol = suitSymbol(suit)

  if (rank === 'A') {
    return (
      <div className={clsx('absolute inset-0 flex items-center justify-center text-3xl', colorClass)}>{symbol}</div>
    )
  }

  if (rank === 'J' || rank === 'Q' || rank === 'K') {
    return (
      <div className={clsx('absolute inset-0 flex flex-col items-center justify-center gap-0.5', colorClass)}>
        <FaceIcon rank={rank} colorClass={colorClass} />
        <span className="text-[1.15em] font-black leading-none">{rank}</span>
        <span className="text-[0.8em] leading-none">{symbol}</span>
      </div>
    )
  }

  const layout = PIP_LAYOUTS[rank] ?? []
  return (
    <div className={clsx('absolute inset-0', colorClass)}>
      {layout.map((pip, i) => (
        <span
          key={i}
          className={clsx('absolute leading-none', pip.rot && 'rotate-180')}
          style={{ left: `${pip.x}%`, top: `${pip.y}%`, transform: `translate(-50%, -50%)${pip.rot ? ' rotate(180deg)' : ''}` }}
        >
          {symbol}
        </span>
      ))}
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
      whileHover={onClick ? { y: -6 } : undefined}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      animate={{ y: selected ? -10 : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={clsx(
        'relative select-none rounded-md border bg-white shadow-md',
        sizeClasses[size],
        onClick ? 'cursor-pointer' : 'cursor-default',
        selected ? 'ring-2 ring-gold-400 border-gold-400' : 'border-black/20',
        !selected && highlight && highlightRing[highlight],
        (faceDown || !parsed) && 'bg-gradient-to-br from-felt-700 to-felt-900',
      )}
    >
      {faceDown || !parsed ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-md">
          <div className="h-[70%] w-[70%] rounded-sm border border-gold-500/40 bg-[repeating-linear-gradient(45deg,rgba(244,201,93,0.08)_0,rgba(244,201,93,0.08)_4px,transparent_4px,transparent_8px)]" />
        </div>
      ) : (
        <>
          <div className={clsx('absolute left-1 top-0.5 flex flex-col items-center leading-none font-bold', red ? 'text-ruby-500' : 'text-ink-900')}>
            <span>{parsed.rank}</span>
            <span>{suitSymbol(parsed.suit)}</span>
          </div>
          <div
            className={clsx(
              'absolute right-1 bottom-0.5 flex rotate-180 flex-col items-center leading-none font-bold',
              red ? 'text-ruby-500' : 'text-ink-900',
            )}
          >
            <span>{parsed.rank}</span>
            <span>{suitSymbol(parsed.suit)}</span>
          </div>
          <CardFace rank={parsed.rank} suit={parsed.suit} red={red} />
        </>
      )}
    </motion.button>
  )
}
