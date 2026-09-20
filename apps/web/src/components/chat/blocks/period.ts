import type { Period } from '@health/shared/schema'
import { format, parseISO } from 'date-fns'

/** "2 – 9 Sep" — short enough to sit in a block caption without wrapping. */
export function formatPeriod(period: Period): string {
  return `${format(parseISO(period.from), 'd MMM')} – ${format(parseISO(period.to), 'd MMM')}`
}
