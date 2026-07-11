import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { joinRoomByNumber } from '@/services/supabase/rooms'

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
}

export function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
  const [roomNumber, setRoomNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleJoin() {
    setLoading(true)
    setError(null)
    try {
      const { roomId } = await joinRoomByNumber(roomNumber)
      onClose()
      navigate(`/room/${roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a Room">
      <label className="mb-1 block text-sm text-white/60" htmlFor="room-number">
        Room number
      </label>
      <input
        id="room-number"
        inputMode="numeric"
        maxLength={6}
        placeholder="481952"
        value={roomNumber}
        onChange={(e) => setRoomNumber(e.target.value.replace(/\D/g, ''))}
        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-center text-2xl tracking-[0.3em] text-white outline-none focus:border-gold-500"
      />
      {error && <p className="mt-2 text-sm text-ruby-500">{error}</p>}
      <Button
        className="mt-4 w-full"
        disabled={roomNumber.length !== 6 || loading}
        onClick={handleJoin}
      >
        {loading ? 'Joining…' : 'Join'}
      </Button>
    </Modal>
  )
}
