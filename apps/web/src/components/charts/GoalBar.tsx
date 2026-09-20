import type { Band } from '@health/shared/schema'
import { TONE_BG } from '../../lib/tone'

export function GoalBar({ attainment, tone }: { attainment: number; tone: Band }) {
  const filled = Math.min(100, Math.round(attainment * 100))

  return (
    // The bar restates a figure the row already spells out in text, so it stays
    // decorative rather than announcing the same number twice.
    <div className="h-2 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div className={`h-full rounded-full ${TONE_BG[tone]}`} style={{ width: `${filled}%` }} />
    </div>
  )
}
