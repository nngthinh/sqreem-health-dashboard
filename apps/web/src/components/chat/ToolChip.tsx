/** Named in the user's terms, not the tool's — the chip explains a wait, it does not log one. */
const TOOL_LABELS: Record<string, string> = {
  get_metric_series: 'Checking your data…',
  compare_periods: 'Comparing periods…',
  get_recent_workouts: 'Looking at your workouts…',
  get_goal_progress: 'Checking your goals…',
}

/** Tools often start together; a staggered entrance reads as a list rather than a flash. */
const STAGGER_MS = 200

export function ToolChip({ name, index }: { name: string; index: number }) {
  return (
    <span
      style={{ animationDelay: `${index * STAGGER_MS}ms` }}
      className="inline-flex animate-message-in items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-steady" aria-hidden="true" />
      {TOOL_LABELS[name] ?? 'Checking your data…'}
    </span>
  )
}
