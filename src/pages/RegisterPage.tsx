import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(email, password, username)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-ink-800 p-8 text-center">
          <h1 className="text-xl font-bold text-gold-400">Check your email</h1>
          <p className="text-sm text-white/60">
            We sent a confirmation link to <span className="text-white">{email}</span>. Confirm it, then sign in.
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Back to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-ink-800 p-8">
        <h1 className="text-center text-2xl font-bold text-gold-400">Create Account</h1>
        <div>
          <label className="mb-1 block text-sm text-white/60" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            required
            minLength={3}
            maxLength={20}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-white outline-none focus:border-gold-500"
          />
        </div>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-white outline-none focus:border-gold-500"
          />
        </div>
        {error && <p className="text-sm text-ruby-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Register'}
        </Button>
        <p className="text-center text-sm text-white/50">
          Already have an account?{' '}
          <Link to="/login" className="text-gold-400 hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  )
}
