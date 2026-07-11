import { clsx } from 'clsx'
import { Avatar } from '@/components/ui/Avatar'
import type { GamePlayerPublic } from '@/types/game'

interface OpponentPanelProps {
  player: GamePlayerPublic
  isCurrentTurn: boolean
  side: 'left' | 'right'
}

export function OpponentPanel({ player, isCurrentTurn, side }: OpponentPanelProps) {
  return (
    <div className={clsx('flex flex-col items-center gap-0.5', side === 'left' ? 'items-start' : 'items-end')}>
      <div className="relative">
        <Avatar username={player.username} avatarUrl={player.avatarUrl} size="md" online={player.isConnected} />
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink-900 bg-sapphire-500 px-1 text-[10px] font-bold text-white">
          {player.handCount}
        </span>
        {isCurrentTurn && (
          <span className="absolute inset-0 -m-1 rounded-full ring-2 ring-gold-400 animate-pulse" />
        )}
      </div>
      <span className="max-w-[6.5rem] truncate text-xs font-medium text-white">{player.username}</span>
      <span
        className={clsx(
          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
          player.score >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-ruby-500/20 text-ruby-400',
        )}
      >
        {player.score >= 0 ? '+' : ''}
        {player.score}
      </span>
    </div>
  )
}
