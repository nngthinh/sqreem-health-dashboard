/** Named in the user's terms, not the tool's — the chip explains a wait, it does not log one. */
const TOOL_LABELS: Record<string, string> = {
  get_metric_series: 'Checking your data…',
  compare_periods: 'Comparing periods…',
  get_recent_workouts: 'Looking at your workouts…',
  get_goal_progress: 'Checking your goals…',
}

export function ToolChip({ name }: { name: string }) {
  return (
    <span className="inline-flex animate-message-in items-center gap-2 self-start rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-steady" aria-hidden="true" />
      {TOOL_LABELS[name] ?? 'Checking your data…'}
    </span>
  )
}
