import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

export function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-ruby-500 py-1.5 text-sm font-medium text-white">
      <span className={clsx('h-2 w-2 rounded-full bg-white animate-pulse')} />
      You're offline — reconnecting will restore your game automatically.
    </div>
  )
}
