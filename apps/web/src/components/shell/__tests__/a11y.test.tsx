import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'
import { reducer as ui } from '../../../store/uiSlice'
import { RangeTabs } from '../../dashboard/RangeTabs'
import { SkipLink } from '../SkipLink'

const withStore = (node: ReactNode) =>
  render(<Provider store={configureStore({ reducer: { ui } })}>{node}</Provider>)

describe('SkipLink', () => {
  it('points at the main landmark', () => {
    render(<SkipLink />)

    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
  })
})

describe('RangeTabs', () => {
  it('exposes the selected range to assistive technology', () => {
    withStore(<RangeTabs />)

    expect(screen.getByRole('tab', { name: '30d' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '7d' })).toHaveAttribute('aria-selected', 'false')
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    withStore(<RangeTabs />)

    await user.tab()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('tab', { name: '7d' })).toHaveAttribute('aria-selected', 'true')
  })
})
