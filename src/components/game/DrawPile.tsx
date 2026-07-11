import { PlayingCard } from './Card'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

interface DrawPileProps {
  count: number
  onClick?: () => void
  disabled?: boolean
}

export function DrawPile({ count, onClick, disabled }: DrawPileProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={clsx('relative', onClick && !disabled && 'transition-transform hover:-translate-y-1')}>
        <PlayingCard faceDown size="md" onClick={disabled ? undefined : onClick} />
        {count > 1 && (
          <div className="pointer-events-none absolute inset-0 -z-10 translate-x-1 translate-y-1 rounded-md border border-black/20 bg-felt-800" />
        )}
      </div>
      <Badge tone="neutral">{count} left</Badge>
    </div>
  )
}
