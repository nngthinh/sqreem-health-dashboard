/** Named in the user's terms, not the tool's — the label explains a wait, it does not log one. */
const TOOL_LABELS: Record<string, string> = {
  get_metric_series: 'Checking your data…',
  compare_periods: 'Comparing periods…',
  get_recent_workouts: 'Looking at your workouts…',
  get_goal_progress: 'Checking your goals…',
}

/** Plain text beside the dots: the wait is already drawn, so a frame would only add a
 *  second thing to read. */
export function ToolLabel({ name }: { name: string }) {
  return (
    <span className="animate-message-in text-[11px] leading-none text-ink-muted">
      {TOOL_LABELS[name] ?? 'Checking your data…'}
    </span>
  )
}
