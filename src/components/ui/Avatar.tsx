import { clsx } from 'clsx'

interface AvatarProps {
  username: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

export function Avatar({ username, avatarUrl, size = 'md', online }: AvatarProps) {
  return (
    <div className="relative inline-block">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className={clsx('rounded-full object-cover ring-2 ring-ink-600', sizeClasses[size])}
        />
      ) : (
        <div
          className={clsx(
            'flex items-center justify-center rounded-full bg-gradient-to-br from-felt-600 to-felt-900 font-bold text-gold-400 ring-2 ring-ink-600',
            sizeClasses[size],
          )}
        >
          {initials(username)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-ink-900',
            online ? 'bg-emerald-400' : 'bg-ink-600',
          )}
        />
      )}
    </div>
  )
}
