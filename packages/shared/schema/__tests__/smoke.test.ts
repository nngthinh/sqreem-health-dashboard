import { describe, expect, it } from 'vitest'
import { METRIC_IDS } from '../ids.js'

describe('workspace wiring', () => {
  it('exposes the four metric ids', () => {
    expect(METRIC_IDS).toEqual(['steps', 'distance', 'calories', 'sleep'])
  })
})
