import { cn } from '@/lib/utils'

type LogoVariant = 'onLight' | 'onDark'

/**
 * The source file's own dimensions. Rendering taller than LOGO_HEIGHT starts
 * upscaling, so a placement that needs to be bigger than this wants a
 * higher-resolution export rather than a larger number here.
 */
const LOGO_WIDTH = 300
const LOGO_HEIGHT = 125

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
  // Width is computed rather than left to `auto`. The CSS reset gives images
  // `max-width: 100%`, and inside a shrink-to-fit wrapper that percentage
  // resolves against a width which is itself waiting on the image -- the
  // browser breaks the cycle by collapsing the image to zero, which made the
  // mark silently invisible on the public register page. Stating both
  // dimensions removes the cycle wherever the logo is placed.
  const width = Math.round(height * (LOGO_WIDTH / LOGO_HEIGHT))

  const img = (
    <img
      src="/evinki-logo.png"
      alt="Evinki"
      width={width}
      height={height}
      style={{ width, height }}
      className="max-w-none select-none"
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
