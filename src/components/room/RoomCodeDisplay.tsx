import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'

interface RoomCodeDisplayProps {
  roomNumber: string
}

export function RoomCodeDisplay({ roomNumber }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(roomNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-ink-800 p-6">
      <span className="text-xs uppercase tracking-widest text-white/40">Room Number</span>
      <button
        type="button"
        onClick={copy}
        className="text-4xl font-bold tracking-[0.3em] text-gold-400 transition-opacity hover:opacity-80"
        title="Click to copy"
      >
        {roomNumber}
      </button>
      {copied && <Badge tone="gold">Copied!</Badge>}
      <p className="text-xs text-white/40">Share this number with friends so they can join</p>
    </div>
  )
}
