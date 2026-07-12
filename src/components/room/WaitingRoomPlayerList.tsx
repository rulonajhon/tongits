import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { RoomPlayer } from '@/types/room'

interface WaitingRoomPlayerListProps {
  players: RoomPlayer[]
  maxPlayers: number
}

export function WaitingRoomPlayerList({ players, maxPlayers }: WaitingRoomPlayerListProps) {
  const slots = Array.from({ length: maxPlayers })

  return (
    <div className="space-y-2">
      {slots.map((_, seat) => {
        const player = players.find((p) => p.seat === seat)
        return (
          <div
            key={seat}
            className="flex items-center gap-3 rounded-lg bg-ink-800 px-3 py-2.5"
          >
            {player ? (
              <>
                <Avatar username={player.username} avatarUrl={player.avatarUrl} size="sm" online={player.isConnected} />
                <span className="flex-1 text-sm font-medium text-white">{player.username}</span>
                {player.winStreak >= 2 && <Badge tone="ruby">🔥 x{Math.min(player.winStreak, 4)}</Badge>}
                {player.totalScore !== 0 && (
                  <span className={player.totalScore > 0 ? 'text-xs text-emerald-400' : 'text-xs text-ruby-400'}>
                    {player.totalScore > 0 ? '+' : ''}
                    {player.totalScore}
                  </span>
                )}
                {player.isHost && <Badge tone="gold">Host</Badge>}
                <span className="text-emerald-400">✅</span>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full border border-dashed border-white/20" />
                <span className="flex-1 text-sm text-white/30">Waiting…</span>
                <span className="text-white/20">⏳</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
