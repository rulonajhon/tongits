import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameActions } from '@/hooks/useGameActions'
import { canTakeDiscard, isValidNewMeld } from '@engine/melds'
import { JackpotDisplay } from '@/components/room/JackpotDisplay'
import { OpponentPanel } from './OpponentPanel'
import { DrawPile } from './DrawPile'
import { DiscardPile } from './DiscardPile'
import { MeldArea } from './MeldArea'
import { TurnIndicator } from './TurnIndicator'
import { TurnTimer } from './TurnTimer'
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
  const ownHand = useGameStore((s) => s.ownHand)
  const room = useRoomStore((s) => s.room)
  const selectedCards = useGameStore((s) => s.selectedCards)
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
  const discardTop = game.discardPile[game.discardPile.length - 1]
  const canTakeTopDiscard =
    isYourTurn && !game.hasDrawnThisTurn && Boolean(discardTop) && canTakeDiscard(discardTop, ownHand)
  const hitterUsername = players.find((p) => p.playerId === room?.currentHitterPlayerId)?.username ?? null
  // Only nag once they've actually tried a combination that doesn't work —
  // not on every pre-draw turn, which would be noisy for the common case.
  const attemptedInvalidDiscardPickup =
    isYourTurn &&
    !game.hasDrawnThisTurn &&
    Boolean(discardTop) &&
    selectedCards.length >= 2 &&
    !isValidNewMeld([...selectedCards, discardTop!]).valid

  return (
    <div className="flex h-full min-h-screen flex-col overflow-y-auto bg-ink-800 landscape:h-screen">
      <div className="flex shrink-0 items-center justify-center gap-2 py-0.5 landscape:py-0">
        {room && (
          <JackpotDisplay
            compact
            jackpotAmount={room.jackpotAmount}
            hitterUsername={hitterUsername}
            hitterWinStreak={room.hitterWinStreak}
            requiredConsecutiveWins={room.requiredConsecutiveWins}
          />
        )}
        <TurnIndicator isYourTurn={isYourTurn} currentPlayerName={currentPlayer?.username ?? '…'} />
        <TurnTimer gameId={gameId} />
      </div>

      <div className="relative mx-auto mt-0.5 w-[96%] max-w-5xl flex-1 landscape:min-h-0">
        <div className="absolute inset-0 rounded-t-[3rem] border-4 border-amber-800/80 bg-gradient-to-b from-felt-500 via-felt-600 to-felt-800 shadow-2xl [clip-path:polygon(7%_0%,93%_0%,100%_100%,0%_100%)]" />

        {/* overflow-y-auto: safety net only — spacing below is tuned so
            opponents + piles + melds fit without it in the common case. */}
        <div className="relative flex h-full flex-col justify-between gap-0.5 overflow-y-auto px-3 pb-1 pt-1.5 landscape:px-4 landscape:pt-1 landscape:pb-0.5">
          <div className="flex shrink-0 items-center justify-between landscape:items-start">
            {left && <OpponentPanel player={left} isCurrentTurn={left.playerId === game.currentTurnPlayerId} side="left" />}

            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-5 landscape:gap-4">
                <DrawPile count={game.drawPileCount} disabled={!canDrawFromPile} onClick={draw} />
                <DiscardPile cards={game.discardPile} canTake={canTakeTopDiscard} />
              </div>
              {actionError && <p className="max-w-xs text-center text-xs text-ruby-400">{actionError}</p>}
              {!actionError && attemptedInvalidDiscardPickup && (
                <p className="max-w-xs text-center text-xs text-white/40">
                  You can only take this discarded card if you immediately form a new meld with it.
                </p>
              )}
            </div>

            {right && (
              <OpponentPanel player={right} isCurrentTurn={right.playerId === game.currentTurnPlayerId} side="right" />
            )}
          </div>

          <div className="w-full shrink-0 rounded-xl bg-black/10 p-0.5">
            <MeldArea melds={melds} players={players} selectedMeldId={selectedMeldId} onSelectMeld={selectMeld} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-end gap-1 border-t border-white/5 bg-ink-900/50 px-1 pb-0.5 pt-0.5 landscape:pb-0 landscape:pt-0">
        <div className="w-12 shrink-0 landscape:w-11">
          <ActionBar gameId={gameId} userId={userId} side="left" />
        </div>
        <div className="min-w-0 flex-1">
          <Hand interactive={isYourTurn} />
        </div>
        <div className="w-12 shrink-0 landscape:w-11">
          <ActionBar gameId={gameId} userId={userId} side="right" />
        </div>
      </div>

      <WinnerModal userId={userId} />
    </div>
  )
}
