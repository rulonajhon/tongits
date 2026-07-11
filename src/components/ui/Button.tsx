import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info' | 'ghost'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Rounds the button into a full pill shape instead of the size's default corner radius. */
  pill?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600 shadow-[0_3px_0_0_var(--color-gold-600)] active:shadow-none active:translate-y-[3px]',
  secondary:
    'bg-ink-600 text-white border border-white/10 hover:bg-ink-500 shadow-[0_3px_0_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-[3px]',
  danger:
    'bg-ruby-500 text-white hover:brightness-110 shadow-[0_3px_0_0_var(--color-red-800)] active:shadow-none active:translate-y-[3px]',
  warning:
    'bg-amber-500 text-white hover:bg-amber-400 shadow-[0_3px_0_0_var(--color-amber-700)] active:shadow-none active:translate-y-[3px]',
  success:
    'bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_3px_0_0_var(--color-emerald-700)] active:shadow-none active:translate-y-[3px]',
  info: 'bg-sapphire-500 text-white hover:brightness-110 shadow-[0_3px_0_0_var(--color-blue-800)] active:shadow-none active:translate-y-[3px]',
  ghost: 'bg-transparent text-white hover:bg-white/10',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-md',
  md: 'text-base px-4 py-2 rounded-lg',
  lg: 'text-lg px-6 py-3 rounded-xl font-semibold',
  xl: 'text-xl px-7 py-4 rounded-2xl font-bold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  pill = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0',
        variantClasses[variant],
        sizeClasses[size],
        pill && 'rounded-full',
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}
