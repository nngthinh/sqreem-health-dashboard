import { format, parseISO } from 'date-fns'
import type { CoverageNote, DailyRecord, Range } from '../schema/index.js'
import { METRIC_IDS, METRIC_LABELS } from '../schema/index.js'
import { metricValue, sliceRange } from './window.js'

/**
 * Turns a real gap into honest copy. A metric with missing days gets a note saying
 * so, which is what lets the rest of the dashboard omit the gaps without lying.
 */
export function computeCoverage(records: DailyRecord[], range: Range): CoverageNote[] {
  const window = sliceRange(records, range)
  const notes: CoverageNote[] = []

  for (const metricId of METRIC_IDS) {
    const missingDays = window.filter((record) => metricValue(record, metricId) === null).length
    if (missingDays === 0) continue

    const lastPresent = window.findLast((record) => metricValue(record, metricId) !== null)
    const lastRecorded = lastPresent?.date ?? null
    const label = METRIC_LABELS[metricId].toLowerCase()

    notes.push({
      metricId,
      missingDays,
      lastRecorded,
      message:
        lastRecorded === null
          ? `No ${label} recorded in the last ${range} days — wear your band to see this trend.`
          : `${missingDays} of the last ${range} days have no ${label} recorded (most recent: ${format(parseISO(lastRecorded), 'MMM d')}).`,
    })
  }

  return notes
}
