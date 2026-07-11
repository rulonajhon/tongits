import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * Tongits plays best in landscape (room for opponents + a wide table).
 * On small screens held in portrait, this hides the wrapped content behind
 * a "rotate your device" prompt instead of squeezing the table vertically.
 * Tablets/desktops (md+) are unaffected even in portrait.
 */
export function OrientationGuard({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[200] hidden flex-col items-center justify-center gap-4 bg-ink-950 p-6 text-center portrait:flex md:portrait:hidden">
        <motion.svg
          viewBox="0 0 24 24"
          className="h-16 w-16 text-gold-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          animate={{ rotate: [0, -90, -90, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, times: [0, 0.5, 0.85, 1], ease: 'easeInOut' }}
        >
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <line x1="10" y1="19" x2="14" y2="19" />
        </motion.svg>
        <p className="text-lg font-semibold text-white">Rotate your device</p>
        <p className="max-w-xs text-sm text-white/50">
          Tongits plays best in landscape — turn your phone sideways to continue.
        </p>
      </div>
      <div className="h-full portrait:hidden md:portrait:block">{children}</div>
    </>
  )
}
