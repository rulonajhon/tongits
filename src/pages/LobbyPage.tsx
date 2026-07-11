import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLobbyPresence } from '@/hooks/usePresence'
import { useLobbyStore } from '@/stores/lobbyStore'
import { PlayerSummary } from '@/components/lobby/PlayerSummary'
import { JoinRoomModal } from '@/components/lobby/JoinRoomModal'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { createRoom } from '@/services/supabase/rooms'

export function LobbyPage() {
  const { userId, profile, logout } = useAuth()
  const onlinePlayers = useLobbyStore((s) => s.onlinePlayers)
  useLobbyPresence(userId, profile?.username ?? null)

  const navigate = useNavigate()
  const [joinOpen, setJoinOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateRoom() {
    setCreating(true)
    setError(null)
    try {
      const { roomId } = await createRoom()
      navigate(`/room/${roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create room')
    } finally {
      setCreating(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-4">
      <PlayerSummary username={profile.username} avatarUrl={profile.avatarUrl} onlineCount={onlinePlayers.length} />

      <div className="flex flex-col gap-3 rounded-2xl bg-ink-800 p-6">
        <Button size="lg" disabled={creating} onClick={handleCreateRoom}>
          {creating ? 'Creating…' : 'Create Room'}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => setJoinOpen(true)}>
          Join Room
        </Button>
        {error && <p className="text-sm text-ruby-500">{error}</p>}
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="self-center text-sm text-white/40 hover:text-white/70"
      >
        Sign out
      </button>

      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  )
}
