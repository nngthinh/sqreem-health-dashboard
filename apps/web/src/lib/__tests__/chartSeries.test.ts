import { describe, expect, it } from 'vitest'
import { toChartPoints } from '../chartSeries'

describe('toChartPoints', () => {
  it('plots a missing day as 0 while flagging it as a gap', () => {
    const points = toChartPoints([
      { date: '2026-09-19', value: 6120 },
      { date: '2026-09-20', value: null },
    ])

    expect(points).toEqual([
      { date: '2026-09-19', value: 6120, isGap: false },
      { date: '2026-09-20', value: 0, isGap: true },
    ])
  })

  it('leaves a recorded 0 indistinguishable in value but not in origin', () => {
    const [point] = toChartPoints([{ date: '2026-09-20', value: 0 }])

    expect(point).toEqual({ date: '2026-09-20', value: 0, isGap: false })
  })
})
