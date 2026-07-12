interface JackpotDisplayProps {
  jackpotAmount: number
  hitterUsername: string | null
  hitterWinStreak: number
  requiredConsecutiveWins: number
  /** Small pill for tight spaces (the in-game header) instead of the full card. */
  compact?: boolean
}

function hitterMessage(hitterUsername: string | null, hitterWinStreak: number, requiredConsecutiveWins: number): string {
  if (!hitterUsername) return 'The next hand winner becomes the Hitter.'
  const remaining = requiredConsecutiveWins - hitterWinStreak
  if (remaining <= 1) return `${hitterUsername} must win the next hand to claim the jackpot.`
  return `${hitterUsername} needs ${remaining} more wins to claim the jackpot.`
}

export function JackpotDisplay({
  jackpotAmount,
  hitterUsername,
  hitterWinStreak,
  requiredConsecutiveWins,
  compact,
}: JackpotDisplayProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-ink-900/60 px-2.5 py-1">
        <span aria-hidden className="text-sm leading-none">
          🎰
        </span>
        <span className="text-xs font-bold leading-none text-gold-400">{jackpotAmount.toLocaleString()}</span>
        {hitterUsername && (
          <span className="text-[10px] leading-none text-white/50">
            {hitterUsername} {hitterWinStreak}/{requiredConsecutiveWins}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-ink-800 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-white/50">Jackpot</p>
      <p className="text-3xl font-bold text-gold-400">{jackpotAmount.toLocaleString()}</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-sm text-white/60">Current Hitter:</span>
        <span className="text-sm font-semibold text-white">{hitterUsername ?? 'None'}</span>
        {hitterUsername && (
          <span className="rounded-full bg-ruby-500/20 px-2 py-0.5 text-xs font-bold text-ruby-400">
            {hitterWinStreak} / {requiredConsecutiveWins}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-white/40">{hitterMessage(hitterUsername, hitterWinStreak, requiredConsecutiveWins)}</p>
    </div>
  )
}
