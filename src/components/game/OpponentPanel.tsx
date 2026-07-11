import { clsx } from 'clsx'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PlayingCard } from './Card'
import type { GamePlayerPublic } from '@/types/game'

interface OpponentPanelProps {
  player: GamePlayerPublic
  isCurrentTurn: boolean
}

export function OpponentPanel({ player, isCurrentTurn }: OpponentPanelProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors',
        isCurrentTurn && 'bg-gold-500/10 ring-1 ring-gold-400/50',
      )}
    >
      <Avatar username={player.username} avatarUrl={player.avatarUrl} size="md" online={player.isConnected} />
      <span className="max-w-[7rem] truncate text-sm font-medium text-white">{player.username}</span>
      <div className="flex items-center gap-1.5">
        <Badge tone="gold">{player.score} pts</Badge>
        {isCurrentTurn && <Badge tone="sapphire">Turn</Badge>}
      </div>
      <div className="flex -space-x-6">
        {Array.from({ length: Math.min(player.handCount, 6) }).map((_, i) => (
          <PlayingCard key={i} faceDown size="sm" />
        ))}
      </div>
    </div>
  )
}
