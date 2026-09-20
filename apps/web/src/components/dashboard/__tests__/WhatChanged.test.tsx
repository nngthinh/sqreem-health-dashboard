import type { Insights, MetricId, Trend } from '@health/shared/schema'
import { Direction } from '@health/shared/schema'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { WhatChanged } from '../WhatChanged'

const trend = (metricId: MetricId, deltaPct: number, significant: boolean): Trend => ({
  metricId,
  label: metricId,
  unit: '',
  current: 6120,
  previous: 7200,
  deltaPct,
  direction: significant && deltaPct < 0 ? Direction.Down : Direction.Flat,
  significant,
  sampleDays: 7,
  series: [{ date: '2026-09-20', value: 6120 }],
})

const insights = {
  range: 7,
  movers: ['steps'],
  steady: ['calories', 'sleep'],
  trends: [trend('steps', -15, true), trend('calories', -3, false), trend('sleep', 1, false)],
} as unknown as Insights

const renderWhatChanged = (data: Insights = insights) =>
  render(
    <MemoryRouter>
      <WhatChanged insights={data} />
    </MemoryRouter>,
  )

describe('WhatChanged', () => {
  it('gives a card only to metrics that actually moved', () => {
    renderWhatChanged()

    expect(screen.getByTestId('mover-steps')).toBeInTheDocument()
    expect(screen.queryByTestId('mover-calories')).not.toBeInTheDocument()
  })

  it('collapses everything else into one steady line', () => {
    renderWhatChanged()

    expect(screen.getByText(/steady: active calories, sleep/i)).toBeInTheDocument()
  })

  it('links each mover to its drill-down', () => {
    renderWhatChanged()

    expect(screen.getByTestId('mover-steps').closest('a')).toHaveAttribute('href', '/metric/steps')
  })

  it('says so plainly when nothing moved', () => {
    const flat = {
      range: 7,
      movers: [],
      steady: ['steps'],
      trends: [trend('steps', 1, false)],
    } as unknown as Insights

    renderWhatChanged(flat)

    expect(screen.getByText(/nothing moved much/i)).toBeInTheDocument()
  })
})
