// Retry re-triggers one RTK Query request, so a failing section never blanks the page.
export function ErrorCard({
  title = "Couldn't load this",
  message = 'Something went wrong fetching this section.',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry: () => void
}) {
  return (
    <div role="alert" className="rounded-card border border-watch/40 bg-surface-raised p-4">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-line/40"
      >
        Retry
      </button>
    </div>
  )
}
