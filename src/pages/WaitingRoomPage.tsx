import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRoomChannel } from '@/hooks/useRoomChannel'
import { useRoomPresence } from '@/hooks/usePresence'
import { useRoomStore } from '@/stores/roomStore'
import { RoomCodeDisplay } from '@/components/room/RoomCodeDisplay'
import { WaitingRoomPlayerList } from '@/components/room/WaitingRoomPlayerList'
import { JackpotDisplay } from '@/components/room/JackpotDisplay'
import { StartButton } from '@/components/room/StartButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { fetchLatestGameIdForRoom } from '@/services/supabase/games'

export function WaitingRoomPage() {
  const { roomId = '' } = useParams()
  const { userId } = useAuth()
  const navigate = useNavigate()

  const room = useRoomStore((s) => s.room)
  const players = useRoomStore((s) => s.players)
  const loading = useRoomStore((s) => s.loading)
  const error = useRoomStore((s) => s.error)
  const reset = useRoomStore((s) => s.reset)

  useRoomChannel(roomId)
  useRoomPresence(roomId, userId)

  useEffect(() => reset, [roomId, reset])

  useEffect(() => {
    if (room?.status !== 'in_progress') return
    let cancelled = false
    fetchLatestGameIdForRoom(roomId).then((gameId) => {
      if (!cancelled && gameId) navigate(`/room/${roomId}/game/${gameId}`, { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [room?.status, roomId, navigate])

  if (loading || !room) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-full items-center justify-center p-4 text-center text-ruby-500">{error}</div>
    )
  }

  const isHost = room.hostId === userId
  const hitterUsername = players.find((p) => p.playerId === room.currentHitterPlayerId)?.username ?? null

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-4">
      <RoomCodeDisplay roomNumber={room.roomNumber} />
      <JackpotDisplay
        jackpotAmount={room.jackpotAmount}
        hitterUsername={hitterUsername}
        hitterWinStreak={room.hitterWinStreak}
        requiredConsecutiveWins={room.requiredConsecutiveWins}
      />
      <div className="rounded-2xl bg-ink-800 p-4">
        <h2 className="mb-2 text-sm font-medium text-white/60">Players</h2>
        <WaitingRoomPlayerList players={players} maxPlayers={room.maxPlayers} />
      </div>
      <StartButton roomId={room.id} isHost={isHost} playerCount={players.length} />
    </div>
  )
}
