import type { DailyRecord } from '@health/shared/schema'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CorrelationCallout } from '../CorrelationCallout'

const day = (date: string, sleepHours: number | null, steps: number | null): DailyRecord => ({
  date,
  steps,
  distanceKm: null,
  calories: 400,
  sleepHours,
  workouts: [],
})

describe('CorrelationCallout', () => {
  it('names the direction and the sample sizes behind the number', () => {
    const records = [
      day('2026-09-01', 8, 5000),
      day('2026-09-02', 8, 9000),
      day('2026-09-03', 8, 9000),
      day('2026-09-04', 5, 9000),
      day('2026-09-05', 5, 6000),
      day('2026-09-06', 5, 6000),
      day('2026-09-07', 5, 6000),
    ]

    render(<CorrelationCallout records={records} />)

    expect(screen.getByText(/50%/)).toBeInTheDocument()
    expect(screen.getByText(/higher/)).toBeInTheDocument()
    expect(screen.getByText(/3 such nights against 3 shorter ones/)).toBeInTheDocument()
  })

  it('renders nothing when there is not enough data to correlate', () => {
    const { container } = render(<CorrelationCallout records={[day('2026-09-01', 8, 9000)]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
