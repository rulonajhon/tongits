import { create } from 'zustand'

export interface OnlinePlayer {
  userId: string
  username: string
}

interface LobbyState {
  onlinePlayers: OnlinePlayer[]
  setOnlinePlayers: (players: OnlinePlayer[]) => void
}

export const useLobbyStore = create<LobbyState>((set) => ({
  onlinePlayers: [],
  setOnlinePlayers: (onlinePlayers) => set({ onlinePlayers }),
}))
