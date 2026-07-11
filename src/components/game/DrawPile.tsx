import { motion } from 'framer-motion'
import { PlayingCard } from './Card'
import { clsx } from 'clsx'

interface DrawPileProps {
  count: number
  onClick?: () => void
  disabled?: boolean
}

export function DrawPile({ count, onClick, disabled }: DrawPileProps) {
  const interactive = Boolean(onClick) && !disabled

  return (
    <div className={clsx('relative', interactive && 'transition-transform hover:-translate-y-1')}>
      {interactive && (
        <motion.div
          className="pointer-events-none absolute -inset-1.5 rounded-lg bg-gold-400/30"
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {count > 1 && (
        <div className="pointer-events-none absolute inset-0 -z-10 translate-x-1 translate-y-1 rounded-md border border-black/20 bg-felt-800" />
      )}
      <PlayingCard faceDown size="md" onClick={disabled ? undefined : onClick} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="rounded-md bg-ink-950/70 px-2 py-0.5 text-lg font-bold text-gold-400">{count}</span>
      </div>
    </div>
  )
}
