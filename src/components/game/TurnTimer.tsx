import { clsx } from 'clsx'
import { TURN_SECONDS, useTurnTimer } from '@/hooks/useTurnTimer'

interface TurnTimerProps {
  gameId: string
}

const RADIUS = 15
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function TurnTimer({ gameId }: TurnTimerProps) {
  const remaining = useTurnTimer(gameId)
  if (remaining === null) return null

  const fraction = remaining / TURN_SECONDS
  const offset = CIRCUMFERENCE * (1 - fraction)
  const low = remaining <= 10

  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center landscape:h-7 landscape:w-7">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          stroke={low ? 'var(--color-ruby-500)' : 'var(--color-gold-400)'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={clsx('transition-[stroke-dashoffset] duration-300 ease-linear', low && 'animate-pulse')}
        />
      </svg>
      <span className={clsx('text-[11px] font-bold leading-none', low ? 'text-ruby-500' : 'text-gold-400')}>
        {remaining}
      </span>
    </div>
  )
}
