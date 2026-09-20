/** The keyboard's way past the sidebar: hidden until it takes focus, first in tab order. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-surface"
    >
      Skip to content
    </a>
  )
}
