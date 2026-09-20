/** Named in the user's terms, not the tool's — the label explains a wait, it does not log one. */
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
    // Plain text beside the dots: the wait is already drawn, so a frame around the label
    // would only add a second thing to read.
    <span
      style={{ animationDelay: `${index * STAGGER_MS}ms` }}
      className="animate-message-in text-[11px] leading-none text-ink-muted"
    >
      {TOOL_LABELS[name] ?? 'Checking your data…'}
    </span>
  )
}
