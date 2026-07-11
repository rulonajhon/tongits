import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { startGame } from '@/services/supabase/rooms'

interface StartButtonProps {
  roomId: string
  isHost: boolean
  playerCount: number
}

export function StartButton({ roomId, isHost, playerCount }: StartButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isHost) return null

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      await startGame(roomId)
      // Every client (including this one) navigates once the room's realtime
      // status flips to 'in_progress' — see WaitingRoomPage.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the game')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" disabled={playerCount !== 3 || loading} onClick={handleStart}>
        {loading ? 'Starting…' : 'Start Game'}
      </Button>
      {playerCount !== 3 && <p className="text-xs text-white/40">Waiting for 3 players to start</p>}
      {error && <p className="text-sm text-ruby-500">{error}</p>}
    </div>
  )
}
