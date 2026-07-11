import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { CardCode } from '@engine/types'
import { isRedSuit, parseCardCode, suitSymbol } from '@/utils/cardUtils'

interface CardProps {
  code?: CardCode
  faceDown?: boolean
  selected?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  layoutId?: string
}

const sizeClasses = {
  sm: 'w-8 h-11 text-[10px]',
  md: 'w-12 h-17 text-sm',
  lg: 'w-16 h-23 text-base',
}

export function PlayingCard({ code, faceDown, selected, size = 'md', onClick, layoutId }: CardProps) {
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
        'relative select-none rounded-md border shadow-md',
        sizeClasses[size],
        onClick ? 'cursor-pointer' : 'cursor-default',
        selected ? 'ring-2 ring-gold-400 border-gold-400' : 'border-black/20',
        faceDown || !parsed ? 'bg-gradient-to-br from-felt-700 to-felt-900' : 'bg-white',
      )}
    >
      {faceDown || !parsed ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-md">
          <div className="h-[70%] w-[70%] rounded-sm border border-gold-500/40 bg-[repeating-linear-gradient(45deg,rgba(244,201,93,0.08)_0,rgba(244,201,93,0.08)_4px,transparent_4px,transparent_8px)]" />
        </div>
      ) : (
        <div
          className={clsx(
            'flex h-full w-full flex-col items-center justify-between p-1 font-semibold',
            red ? 'text-ruby-500' : 'text-ink-900',
          )}
        >
          <span className="self-start leading-none">{parsed.rank}</span>
          <span className="text-lg leading-none">{suitSymbol(parsed.suit)}</span>
          <span className="self-end rotate-180 leading-none">{parsed.rank}</span>
        </div>
      )}
    </motion.button>
  )
}
