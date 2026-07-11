import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Rounds the button into a full pill shape instead of the size's default corner radius. */
  pill?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600 shadow-[0_2px_0_0_var(--color-gold-600)] active:shadow-none active:translate-y-[2px]',
  secondary: 'bg-ink-700 text-white hover:bg-ink-600 border border-ink-600',
  danger: 'bg-ruby-500 text-white hover:brightness-110',
  warning: 'bg-amber-600 text-white hover:bg-amber-500 active:bg-amber-700',
  ghost: 'bg-transparent text-white hover:bg-white/10',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-md',
  md: 'text-base px-4 py-2 rounded-lg',
  lg: 'text-lg px-6 py-3 rounded-xl font-semibold',
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
