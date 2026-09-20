import type { Insights } from '@health/shared/schema'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GoalsStrip } from '../GoalsStrip'

const insights = {
  goals: [
    {
      goalId: 'sleep',
      metricId: 'sleep',
      label: 'Sleep',
      target: 7.5,
      unit: 'h',
      mean: 6.94,
      attainment: 0.925,
      met: 2,
      of: 7,
      status: 'watch',
    },
    {
      goalId: 'steps',
      metricId: 'steps',
      label: 'Steps',
      target: 8000,
      unit: 'steps',
      mean: 6120,
      attainment: 0.765,
      met: 2,
      of: 7,
      status: 'steady',
    },
  ],
  emptyGoals: ['calories'],
} as unknown as Insights

describe('GoalsStrip', () => {
  it('shows attainment and adherence side by side for every goal', () => {
    render(<GoalsStrip insights={insights} />)

    const sleepRow = within(screen.getByTestId('goal-sleep'))
    expect(sleepRow.getByText('93%')).toBeInTheDocument()
    expect(sleepRow.getByText(/met 2 of 7 nights/i)).toBeInTheDocument()

    expect(within(screen.getByTestId('goal-steps')).getByText('77%')).toBeInTheDocument()
  })

  it('flags a goal whose adherence is poor even though the average reads fine', () => {
    render(<GoalsStrip insights={insights} />)

    expect(screen.getByTestId('goal-sleep')).toHaveAttribute('data-status', 'watch')
  })

  it('renders a goal with no recorded data as an empty state, not as 0%', () => {
    render(<GoalsStrip insights={insights} />)

    expect(screen.getByText(/no active calories recorded/i)).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
})
