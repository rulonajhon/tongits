import { useGameStore } from '@/stores/gameStore'
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

  if (!game) return null

  const opponents = players.filter((p) => p.playerId !== userId)
  const currentPlayer = players.find((p) => p.playerId === game.currentTurnPlayerId)
  const isYourTurn = game.currentTurnPlayerId === userId

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-felt-800 to-felt-900">
      <div className="grid grid-cols-2 gap-2 p-3 sm:flex sm:justify-center sm:gap-8">
        {opponents.map((opponent) => (
          <OpponentPanel
            key={opponent.playerId}
            player={opponent}
            isCurrentTurn={opponent.playerId === game.currentTurnPlayerId}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <TurnIndicator isYourTurn={isYourTurn} currentPlayerName={currentPlayer?.username ?? '…'} />

        <div className="flex items-center gap-8">
          <DrawPile count={game.drawPileCount} />
          <DiscardPile cards={game.discardPile} />
        </div>

        <div className="w-full max-w-2xl rounded-xl bg-black/15 p-2">
          <MeldArea melds={melds} players={players} selectedMeldId={selectedMeldId} onSelectMeld={selectMeld} />
        </div>
      </div>

      {actionError && (
        <p className="px-4 text-center text-sm text-ruby-500">{actionError}</p>
      )}

      <div className="border-t border-white/5 bg-black/20 pb-2 pt-1">
        <Hand interactive={isYourTurn} />
        <ActionBar gameId={gameId} userId={userId} />
      </div>

      <WinnerModal userId={userId} />
    </div>
  )
}
