import { cn } from '@/lib/utils'

type LogoVariant = 'onLight' | 'onDark'

interface LogoProps {
  /**
   * onDark sits the mark on a light plate. The wordmark is near-black, so on a
   * dark surface it would otherwise disappear.
   */
  variant?: LogoVariant
  className?: string
  /** Height of the mark in pixels. Width follows the logo's 300x125 ratio. */
  height?: number
}

/**
 * The Evinki brand mark.
 *
 * Served from /public rather than imported, so the same file backs both the
 * favicon in index.html and every in-app placement -- one asset to replace
 * when the brand changes.
 */
export function Logo({ variant = 'onLight', className, height = 40 }: LogoProps) {
  const img = (
    <img
      src="/evinki-logo.png"
      alt="Evinki"
      height={height}
      style={{ height }}
      className="w-auto select-none"
      draggable={false}
    />
  )

  if (variant === 'onDark') {
    return (
      <div className={cn('inline-flex items-center rounded-lg bg-white px-3 py-2', className)}>
        {img}
      </div>
    )
  }

  return <div className={cn('inline-flex items-center', className)}>{img}</div>
}
