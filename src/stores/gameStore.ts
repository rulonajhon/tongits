import { create } from 'zustand'
import type { CardCode } from '@engine/types'
import type { GamePlayerPublic, GameResults, GameStateRow, Meld } from '@/types/game'

interface GameState {
  game: GameStateRow | null
  players: GamePlayerPublic[]
  melds: Meld[]
  ownHand: CardCode[]
  results: GameResults | null
  selectedCards: CardCode[]
  selectedMeldId: string | null
  pendingAction: boolean
  actionError: string | null
  setGame: (game: GameStateRow | null) => void
  setPlayers: (players: GamePlayerPublic[]) => void
  setMelds: (melds: Meld[]) => void
  setOwnHand: (cards: CardCode[]) => void
  setResults: (results: GameResults | null) => void
  toggleCardSelection: (card: CardCode) => void
  selectMeld: (meldId: string) => void
  clearSelection: () => void
  setPendingAction: (pending: boolean) => void
  setActionError: (error: string | null) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  game: null,
  players: [],
  melds: [],
  ownHand: [],
  results: null,
  selectedCards: [],
  selectedMeldId: null,
  pendingAction: false,
  actionError: null,

  setGame: (game) => set({ game }),
  setPlayers: (players) => set({ players }),
  setMelds: (melds) => set({ melds }),
  setOwnHand: (ownHand) => set({ ownHand }),
  setResults: (results) => set({ results }),

  toggleCardSelection: (card) =>
    set((state) => ({
      selectedCards: state.selectedCards.includes(card)
        ? state.selectedCards.filter((c) => c !== card)
        : [...state.selectedCards, card],
    })),
  selectMeld: (meldId) =>
    set((state) => ({ selectedMeldId: state.selectedMeldId === meldId ? null : meldId })),
  clearSelection: () => set({ selectedCards: [], selectedMeldId: null }),

  setPendingAction: (pendingAction) => set({ pendingAction }),
  setActionError: (actionError) => set({ actionError }),

  reset: () =>
    set({
      game: null,
      players: [],
      melds: [],
      ownHand: [],
      results: null,
      selectedCards: [],
      selectedMeldId: null,
      pendingAction: false,
      actionError: null,
    }),
}))
