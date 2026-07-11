import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGameChannel } from '@/hooks/useGameChannel'
import { useGameStore } from '@/stores/gameStore'
import { GameTable } from '@/components/game/GameTable'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { OrientationGuard } from '@/components/ui/OrientationGuard'

export function GamePage() {
  const { gameId = '' } = useParams()
  const { userId } = useAuth()
  const game = useGameStore((s) => s.game)
  const reset = useGameStore((s) => s.reset)

  useGameChannel(gameId, userId)

  useEffect(() => reset, [gameId, reset])

  if (!userId || !game) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <OrientationGuard>
      <div className="h-full min-h-screen">
        <GameTable gameId={gameId} userId={userId} />
      </div>
    </OrientationGuard>
  )
}
