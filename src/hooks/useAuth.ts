import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

/** Initializes the Supabase auth listener once and exposes the current auth state. */
export function useAuth() {
  const initialize = useAuthStore((s) => s.initialize)
  const userId = useAuthStore((s) => s.userId)
  const email = useAuthStore((s) => s.email)
  const profile = useAuthStore((s) => s.profile)
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    initialize()
  }, [initialize])

  return { userId, email, profile, status, error, login, register, logout }
}
