import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

interface PlayerSummaryProps {
  username: string
  avatarUrl?: string | null
  onlineCount: number
}

export function PlayerSummary({ username, avatarUrl, onlineCount }: PlayerSummaryProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-ink-800 p-4">
      <div className="flex items-center gap-3">
        <Avatar username={username} avatarUrl={avatarUrl} size="lg" online />
        <div>
          <p className="text-lg font-semibold text-white">{username}</p>
          <p className="text-xs text-white/40">Welcome back</p>
        </div>
      </div>
      <Badge tone="sapphire">{onlineCount} online</Badge>
    </div>
  )
}
