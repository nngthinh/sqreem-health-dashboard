/**
 * The gap between sending and the first word of the answer. An assistant turn is plain
 * prose rather than a bubble, so the wait is drawn the same way: left-aligned, no frame.
 */
export function ThinkingDots() {
  return (
    <p className="flex animate-message-in items-center gap-1.5 text-ink-muted">
      <span className="sr-only">The assistant is writing a reply</span>

      <span aria-hidden="true" className="h-1.5 w-1.5 animate-thinking rounded-full bg-ink-muted" />
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 animate-thinking rounded-full bg-ink-muted [animation-delay:160ms]"
      />
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 animate-thinking rounded-full bg-ink-muted [animation-delay:320ms]"
      />
    </p>
  )
}
