import type { ReactNode } from 'react'
import { clsx } from 'clsx'

type Tone = 'gold' | 'ruby' | 'sapphire' | 'neutral'

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

const toneClasses: Record<Tone, string> = {
  gold: 'bg-gold-500/15 text-gold-400 border-gold-500/30',
  ruby: 'bg-ruby-500/15 text-ruby-500 border-ruby-500/30',
  sapphire: 'bg-sapphire-500/15 text-sapphire-500 border-sapphire-500/30',
  neutral: 'bg-white/10 text-white/80 border-white/15',
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
