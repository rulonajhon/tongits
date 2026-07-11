import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/stores/gameStore'
import { useSound } from '@/hooks/useSound'

const WIN_TYPE_LABEL: Record<string, string> = {
  meld_out: 'Melded Out',
  tongits: 'TONGITS!',
  fight: 'Won the Fight',
  draw: 'Draw',
}

export function WinnerModal({ userId }: { userId: string }) {
  const game = useGameStore((s) => s.game)
  const results = useGameStore((s) => s.results)
  const players = useGameStore((s) => s.players)
  const navigate = useNavigate()
  const { playWin } = useSound()

  const finished = game?.status === 'finished'

  useEffect(() => {
    if (finished) playWin()
  }, [finished, playWin])

  if (!finished || !results) return null

  const you = results.results.find((r) => r.playerId === userId)
  const label = game.winType ? WIN_TYPE_LABEL[game.winType] : 'Round Over'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-gold-500/30 bg-ink-800 p-6 text-center shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-gold-400">{label}</h2>
        <p className="mt-1 text-sm text-white/60">
          {you?.isWinner ? 'You won this round!' : you ? 'Better luck next round.' : ''}
        </p>

        <div className="mt-4 space-y-2">
          {results.results.map((r) => {
            const player = players.find((p) => p.playerId === r.playerId)
            return (
              <div
                key={r.playerId}
                className="flex items-center justify-between rounded-lg bg-ink-700 px-3 py-2 text-sm"
              >
                <span className="font-medium text-white">
                  {player?.username ?? 'Player'} {r.playerId === userId && '(You)'}
                </span>
                <span className={r.score >= 0 ? 'text-emerald-400' : 'text-ruby-500'}>
                  {r.score >= 0 ? '+' : ''}
                  {r.score}
                </span>
              </div>
            )
          })}
        </div>

        <Button className="mt-6 w-full" onClick={() => navigate('/lobby')}>
          Back to Lobby
        </Button>
      </motion.div>
    </div>
  )
}
