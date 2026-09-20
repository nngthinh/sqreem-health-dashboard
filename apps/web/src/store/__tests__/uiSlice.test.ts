import { describe, expect, it } from 'vitest'
import { reducer, setDrawerOpen, setRange, setSidebarCollapsed } from '../uiSlice'

describe('uiSlice', () => {
  it('defaults to the 30-day range', () => {
    expect(reducer(undefined, { type: '@@init' }).range).toBe(30)
  })

  it('changes the selected range', () => {
    expect(reducer(undefined, setRange(7)).range).toBe(7)
  })

  it('toggles the sidebar and the mobile drawer independently', () => {
    const collapsed = reducer(undefined, setSidebarCollapsed(true))
    expect(collapsed.sidebarCollapsed).toBe(true)
    expect(collapsed.drawerOpen).toBe(false)
    expect(reducer(collapsed, setDrawerOpen(true)).sidebarCollapsed).toBe(true)
  })
})
