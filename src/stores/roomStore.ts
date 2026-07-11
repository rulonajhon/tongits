import { create } from 'zustand'
import type { Room, RoomPlayer } from '@/types/room'

interface RoomState {
  room: Room | null
  players: RoomPlayer[]
  loading: boolean
  error: string | null
  setRoom: (room: Room | null) => void
  setPlayers: (players: RoomPlayer[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  players: [],
  loading: false,
  error: null,
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ room: null, players: [], loading: false, error: null }),
}))
