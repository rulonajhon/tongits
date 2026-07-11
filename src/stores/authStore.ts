import { create } from 'zustand'
import { supabase } from '@/services/supabase/client'
import { fetchProfile, signIn, signOut, signUp, type Profile } from '@/services/supabase/auth'

interface AuthState {
  userId: string | null
  email: string | null
  profile: Profile | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null
  initialize: () => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => Promise<void>
}

let initialized = false

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  profile: null,
  status: 'loading',
  error: null,

  initialize: () => {
    if (initialized) return
    initialized = true

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        set({ userId: null, email: null, profile: null, status: 'unauthenticated' })
        return
      }
      set({ userId: session.user.id, email: session.user.email ?? null, status: 'authenticated' })
      try {
        const profile = await fetchProfile(session.user.id)
        set({ profile })
      } catch {
        // Profile row is created by a DB trigger on signup; a fresh session may briefly race it.
        set({ profile: null })
      }
    })
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      await signIn(email, password)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed' })
      throw err
    }
  },

  register: async (email, password, username) => {
    set({ error: null })
    try {
      await signUp(email, password, username)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Registration failed' })
      throw err
    }
  },

  logout: async () => {
    await signOut()
  },
}))
