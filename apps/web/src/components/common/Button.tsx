import type { ButtonHTMLAttributes } from 'react'

/**
 * The app's one button. It owns only what every button shares — the pointer cursor
 * Preflight strips off, and the not-allowed cursor while disabled — so each call site
 * still brings its own look rather than picking from a list of variants.
 */
export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    // `type` before the spread, so a caller's `type="submit"` still wins.
    <button
      type="button"
      className={`cursor-pointer disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  )
}
