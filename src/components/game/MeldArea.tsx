import { clsx } from 'clsx'
import { PlayingCard } from './Card'
import type { GamePlayerPublic, Meld } from '@/types/game'

interface MeldAreaProps {
  melds: Meld[]
  players: GamePlayerPublic[]
  selectedMeldId?: string | null
  onSelectMeld?: (meldId: string) => void
}

export function MeldArea({ melds, players, selectedMeldId, onSelectMeld }: MeldAreaProps) {
  if (melds.length === 0) {
    return <p className="py-4 text-center text-sm text-white/40">No melds on the table yet</p>
  }

  const byOwner = new Map<string, Meld[]>()
  for (const meld of melds) {
    byOwner.set(meld.ownerId, [...(byOwner.get(meld.ownerId) ?? []), meld])
  }

  return (
    <div className="flex flex-wrap justify-center gap-4 py-2">
      {[...byOwner.entries()].map(([ownerId, ownerMelds]) => {
        const owner = players.find((p) => p.playerId === ownerId)
        return (
          <div key={ownerId} className="flex flex-col items-center gap-1">
            <span className="text-xs text-white/50">{owner?.username ?? 'Player'}</span>
            <div className="flex gap-2">
              {ownerMelds.map((meld) => (
                <button
                  key={meld.id}
                  type="button"
                  onClick={onSelectMeld ? () => onSelectMeld(meld.id) : undefined}
                  className={clsx(
                    'flex gap-0.5 rounded-md p-1 transition-colors',
                    onSelectMeld && 'cursor-pointer hover:bg-white/5',
                    selectedMeldId === meld.id && 'bg-gold-500/15 ring-1 ring-gold-400',
                  )}
                >
                  {meld.cards.map((code) => (
                    <PlayingCard key={code} code={code} size="sm" />
                  ))}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
