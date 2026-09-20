import { Band } from '@health/shared/schema'

// Tailwind scans source for literal class strings, so an interpolated `bg-${band}`
// would compile to no CSS at all. Every semantic accent goes through these lookups.
export const TONE_BG: Record<Band, string> = {
  [Band.Good]: 'bg-good',
  [Band.Steady]: 'bg-steady',
  [Band.Watch]: 'bg-watch',
}

export const TONE_TEXT: Record<Band, string> = {
  [Band.Good]: 'text-good',
  [Band.Steady]: 'text-steady',
  [Band.Watch]: 'text-watch',
}
