import { useGameStore } from '@/stores/gameStore'
import { useGameActions } from '@/hooks/useGameActions'
import { OpponentPanel } from './OpponentPanel'
import { DrawPile } from './DrawPile'
import { DiscardPile } from './DiscardPile'
import { MeldArea } from './MeldArea'
import { TurnIndicator } from './TurnIndicator'
import { Hand } from './Hand'
import { ActionBar } from './ActionBar'
import { WinnerModal } from './WinnerModal'

interface GameTableProps {
  gameId: string
  userId: string
}

export function GameTable({ gameId, userId }: GameTableProps) {
  const game = useGameStore((s) => s.game)
  const players = useGameStore((s) => s.players)
  const melds = useGameStore((s) => s.melds)
  const selectedMeldId = useGameStore((s) => s.selectedMeldId)
  const selectMeld = useGameStore((s) => s.selectMeld)
  const actionError = useGameStore((s) => s.actionError)
  const { draw, pendingAction } = useGameActions(gameId)

  if (!game) return null

  const opponents = players.filter((p) => p.playerId !== userId)
  const left = opponents[0]
  const right = opponents[1]
  const currentPlayer = players.find((p) => p.playerId === game.currentTurnPlayerId)
  const isYourTurn = game.currentTurnPlayerId === userId
  const canDrawFromPile = isYourTurn && !game.hasDrawnThisTurn && !pendingAction

  return (
    <div className="flex h-full min-h-screen flex-col overflow-y-auto bg-ink-950 landscape:h-screen">
      <div className="flex shrink-0 items-center justify-center px-3 py-1 landscape:py-0.5">
        <TurnIndicator isYourTurn={isYourTurn} currentPlayerName={currentPlayer?.username ?? '…'} />
      </div>

      <div className="relative mx-auto mt-1 w-[96%] max-w-5xl flex-1 landscape:min-h-0">
        <div className="absolute inset-0 rounded-t-[3rem] border-4 border-amber-800/80 bg-gradient-to-b from-felt-600 via-felt-700 to-felt-900 shadow-2xl [clip-path:polygon(7%_0%,93%_0%,100%_100%,0%_100%)]" />

        <div className="relative flex h-full flex-col justify-between gap-1 px-4 pb-2 pt-3 landscape:gap-0.5 landscape:px-6 landscape:pt-2">
          <div className="flex flex-1 items-center justify-between landscape:items-start">
            {left && <OpponentPanel player={left} isCurrentTurn={left.playerId === game.currentTurnPlayerId} side="left" />}

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-5 landscape:gap-4">
                <DrawPile count={game.drawPileCount} disabled={!canDrawFromPile} onClick={draw} />
                <DiscardPile cards={game.discardPile} />
              </div>
              {actionError && <p className="max-w-xs text-center text-xs text-ruby-400">{actionError}</p>}
            </div>

            {right && (
              <OpponentPanel player={right} isCurrentTurn={right.playerId === game.currentTurnPlayerId} side="right" />
            )}
          </div>

          <div className="w-full rounded-xl bg-black/15 p-1">
            <MeldArea melds={melds} players={players} selectedMeldId={selectedMeldId} onSelectMeld={selectMeld} />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/5 bg-black/30 pb-1.5 pt-1 landscape:pb-1 landscape:pt-0.5">
        <Hand interactive={isYourTurn} />
        <ActionBar gameId={gameId} userId={userId} />
      </div>

      <WinnerModal userId={userId} />
    </div>
  )
}
