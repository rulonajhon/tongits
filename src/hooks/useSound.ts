import { useCallback, useRef } from 'react'

type ToneShape = 'sine' | 'triangle' | 'square'

interface Tone {
  freq: number
  duration: number
  shape?: ToneShape
  delay?: number
  gain?: number
}

/**
 * Tiny self-contained sound kit built on the Web Audio API — no external
 * audio files to license or ship. Swap for real SFX later without touching
 * call sites; the hook's surface (playDraw, playDiscard, ...) stays the same.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }, [])

  const play = useCallback(
    (tones: Tone[]) => {
      const ctx = getContext()
      if (ctx.state === 'suspended') void ctx.resume()
      const now = ctx.currentTime
      for (const tone of tones) {
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()
        osc.type = tone.shape ?? 'sine'
        osc.frequency.value = tone.freq
        const start = now + (tone.delay ?? 0)
        const end = start + tone.duration
        gainNode.gain.setValueAtTime(0, start)
        gainNode.gain.linearRampToValueAtTime(tone.gain ?? 0.15, start + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, end)
        osc.connect(gainNode)
        gainNode.connect(ctx.destination)
        osc.start(start)
        osc.stop(end + 0.02)
      }
    },
    [getContext],
  )

  const playDraw = useCallback(() => play([{ freq: 420, duration: 0.08 }]), [play])
  const playDiscard = useCallback(() => play([{ freq: 260, duration: 0.1 }]), [play])
  const playMeld = useCallback(
    () => play([{ freq: 520, duration: 0.1 }, { freq: 660, duration: 0.12, delay: 0.08 }]),
    [play],
  )
  const playTurn = useCallback(() => play([{ freq: 720, duration: 0.06, gain: 0.08 }]), [play])
  const playWin = useCallback(
    () =>
      play([
        { freq: 523, duration: 0.14 },
        { freq: 659, duration: 0.14, delay: 0.12 },
        { freq: 784, duration: 0.24, delay: 0.24 },
      ]),
    [play],
  )
  const playError = useCallback(() => play([{ freq: 180, duration: 0.15, shape: 'square', gain: 0.08 }]), [play])
  const playFight = useCallback(
    () =>
      play([
        { freq: 200, duration: 0.09, shape: 'square', gain: 0.12 },
        { freq: 150, duration: 0.14, shape: 'square', gain: 0.12, delay: 0.08 },
      ]),
    [play],
  )
  const playJackpot = useCallback(
    () =>
      play([
        { freq: 523, duration: 0.12 },
        { freq: 659, duration: 0.12, delay: 0.1 },
        { freq: 784, duration: 0.12, delay: 0.2 },
        { freq: 1047, duration: 0.32, delay: 0.3, gain: 0.18 },
      ]),
    [play],
  )

  return { playDraw, playDiscard, playMeld, playTurn, playWin, playError, playFight, playJackpot }
}
