import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/lobby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-ink-800 p-8">
        <h1 className="text-center text-2xl font-bold text-gold-400">Tongits</h1>
        <div>
          <label className="mb-1 block text-sm text-white/60" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-white outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/60" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-white outline-none focus:border-gold-500"
          />
        </div>
        {error && <p className="text-sm text-ruby-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
        <p className="text-center text-sm text-white/50">
          No account?{' '}
          <Link to="/register" className="text-gold-400 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}
