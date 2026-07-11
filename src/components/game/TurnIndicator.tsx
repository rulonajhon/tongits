import { motion } from 'framer-motion'

interface TurnIndicatorProps {
  isYourTurn: boolean
  currentPlayerName: string
}

export function TurnIndicator({ isYourTurn, currentPlayerName }: TurnIndicatorProps) {
  return (
    <motion.div
      key={currentPlayerName}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center"
    >
      <span
        className={
          isYourTurn
            ? 'rounded-full bg-gold-500 px-4 py-1 text-sm font-semibold text-ink-950 shadow'
            : 'rounded-full bg-white/10 px-4 py-1 text-sm text-white/70'
        }
      >
        {isYourTurn ? 'Your turn' : `${currentPlayerName}'s turn`}
      </span>
    </motion.div>
  )
}
