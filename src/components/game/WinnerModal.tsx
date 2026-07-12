import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/stores/gameStore'
import { useSound } from '@/hooks/useSound'
import { fetchRoomPlayers, leaveRoom } from '@/services/supabase/rooms'
import { fetchHitterHistory } from '@/services/supabase/games'
import { useRoomStore } from '@/stores/roomStore'
import type { RoomPlayer } from '@/types/room'
import type { GamePlayerPublic, HitterHistoryEntry } from '@/types/game'

const WIN_TYPE_LABEL: Record<string, string> = {
  meld_out: 'Melded Out',
  tongits: 'TONGITS!',
  fight: 'Won the Fight',
  draw: 'Draw',
}

function usernameOf(players: GamePlayerPublic[], playerId: string | null): string {
  return players.find((p) => p.playerId === playerId)?.username ?? 'Player'
}

/** Non-jackpot Hitter status messaging — the jackpot-awarded case gets its own banner instead. */
function hitterStatusMessage(
  h: HitterHistoryEntry,
  players: GamePlayerPublic[],
  requiredConsecutiveWins: number,
): { title: string; subtitle: string } | null {
  if (h.jackpotAwarded || !h.newHitterPlayerId) return null
  const username = usernameOf(players, h.newHitterPlayerId)

  if (h.previousHitterPlayerId === null) {
    return { title: `${username} is now the Hitter!`, subtitle: `Win the next hand to claim the jackpot.` }
  }
  if (h.previousHitterPlayerId !== h.newHitterPlayerId) {
    const previousUsername = usernameOf(players, h.previousHitterPlayerId)
    return {
      title: `${username} broke ${previousUsername}'s streak.`,
      subtitle: `${username} is now the Hitter with ${h.newStreak} of ${requiredConsecutiveWins} wins.`,
    }
  }
  return {
    title: `${username} is still the Hitter.`,
    subtitle: `${h.newStreak} of ${requiredConsecutiveWins} consecutive wins so far.`,
  }
}

export function WinnerModal({ userId }: { userId: string }) {
  const game = useGameStore((s) => s.game)
  const results = useGameStore((s) => s.results)
  const players = useGameStore((s) => s.players)
  const requiredConsecutiveWins = useRoomStore((s) => s.room?.requiredConsecutiveWins ?? 2)
  const navigate = useNavigate()
  const { playWin, playJackpot } = useSound()
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([])
  const [hitterHistory, setHitterHistory] = useState<HitterHistoryEntry | null>(null)
  const [leaving, setLeaving] = useState(false)

  const finished = game?.status === 'finished'

  useEffect(() => {
    if (finished) playWin()
  }, [finished, playWin])

  const roomId = game?.roomId
  const gameId = game?.id

  useEffect(() => {
    if (finished && roomId) {
      fetchRoomPlayers(roomId)
        .then(setRoomPlayers)
        .catch(() => setRoomPlayers([]))
    }
  }, [finished, roomId])

  useEffect(() => {
    if (finished && gameId) {
      fetchHitterHistory(gameId)
        .then(setHitterHistory)
        .catch(() => setHitterHistory(null))
    }
  }, [finished, gameId])

  useEffect(() => {
    if (hitterHistory?.jackpotAwarded) playJackpot()
  }, [hitterHistory?.jackpotAwarded, playJackpot])

  if (!finished || !results) return null

  const you = results.results.find((r) => r.playerId === userId)
  const label = game.winType ? WIN_TYPE_LABEL[game.winType] : 'Round Over'
  const finishedRoomId = game.roomId
  const jackpotWinnerUsername = hitterHistory?.jackpotAwarded
    ? usernameOf(players, hitterHistory.jackpotWinnerPlayerId)
    : null
  const hitterStatus = hitterHistory ? hitterStatusMessage(hitterHistory, players, requiredConsecutiveWins) : null

  function handlePlayAgain() {
    navigate(`/room/${finishedRoomId}`)
  }

  async function handleLeave() {
    setLeaving(true)
    try {
      await leaveRoom(finishedRoomId)
    } catch {
      // Best effort — still take them back to the lobby even if this fails.
    }
    navigate('/lobby')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-gold-500/30 bg-ink-800 p-6 text-center shadow-2xl"
      >
        {hitterHistory?.jackpotAwarded && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 rounded-xl border border-gold-400/50 bg-gradient-to-b from-gold-500/20 to-transparent p-4"
          >
            <p className="text-lg font-black tracking-wide text-gold-400">JACKPOT WON!</p>
            <p className="mt-0.5 text-sm text-white/70">
              {jackpotWinnerUsername} won {hitterHistory.previousStreak + 1} consecutive hands.
            </p>
            <p className="mt-1 text-2xl font-bold text-gold-400">+{hitterHistory.jackpotBefore.toLocaleString()}</p>
          </motion.div>
        )}

        <h2 className="text-2xl font-bold text-gold-400">{label}</h2>
        <p className="mt-1 text-sm text-white/60">
          {you?.isWinner ? 'You won this round!' : you ? 'Better luck next round.' : ''}
        </p>
        {hitterStatus && (
          <div className="mt-2 rounded-lg bg-ink-900/60 px-3 py-2">
            <p className="text-sm font-medium text-gold-400">{hitterStatus.title}</p>
            <p className="text-xs text-white/50">{hitterStatus.subtitle}</p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {results.results.map((r) => {
            const player = players.find((p) => p.playerId === r.playerId)
            const roomPlayer = roomPlayers.find((p) => p.playerId === r.playerId)
            return (
              <div key={r.playerId} className="rounded-lg bg-ink-700 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    {player?.username ?? 'Player'} {r.playerId === userId && '(You)'}
                  </span>
                  <span className={r.score >= 0 ? 'text-emerald-400' : 'text-ruby-500'}>
                    {r.score >= 0 ? '+' : ''}
                    {r.score}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <p className="text-left text-xs text-white/40">{r.breakdown}</p>
                  {roomPlayer && (
                    <p className="shrink-0 pl-2 text-xs text-white/50">Total: {roomPlayer.totalScore}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={leaving} onClick={handleLeave}>
            {leaving ? 'Leaving…' : 'Back to Lobby'}
          </Button>
          <Button className="flex-1" disabled={leaving} onClick={handlePlayAgain}>
            Play Again
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
