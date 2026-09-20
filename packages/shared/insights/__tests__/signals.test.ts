import { describe, expect, it } from 'vitest'
import { Band, Direction, type Trend } from '../../schema/index.js'
import { detectSignals } from '../signals.js'

function trend(overrides: Partial<Trend>): Trend {
  return {
    metricId: 'distance',
    label: 'Distance',
    unit: 'km',
    current: 4.7,
    previous: 5.43,
    deltaPct: -13.4,
    direction: Direction.Down,
    significant: true,
    sampleDays: 20,
    series: [],
    ...overrides,
  }
}

describe('trend signals', () => {
  it('keeps fractional units precise, so a real drop never reads as "5 to 5"', () => {
    const [signal] = detectSignals([trend({})], [], 30)

    expect(signal?.detail).toContain('from 5.4 to 4.7 km')
  })

  it('rounds whole units and keeps the thousands separator readable', () => {
    const [signal] = detectSignals(
      [
        trend({
          metricId: 'steps',
          label: 'Steps',
          unit: 'steps',
          current: 5930.2,
          previous: 6736.4,
          deltaPct: -12,
        }),
      ],
      [],
      7,
    )

    expect(signal?.detail).toContain('from 6,736 to 5,930 steps')
  })

  it('names the window it compared rather than assuming a week', () => {
    const [signal] = detectSignals([trend({})], [], 30)

    expect(signal?.detail).toContain('last 30 days')
    expect(signal?.evidence).toContain('Last 30 days: 4.7 km/day')
  })

  it('ignores trends that are not significant', () => {
    expect(detectSignals([trend({ significant: false })], [], 30)).toEqual([])
  })

  it('sorts watch signals ahead of good ones', () => {
    const signals = detectSignals(
      [
        trend({ metricId: 'steps', label: 'Steps', unit: 'steps', direction: Direction.Up }),
        trend({}),
      ],
      [],
      30,
    )

    expect(signals[0]?.severity).toBe(Band.Watch)
  })
})
