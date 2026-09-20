import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { authApi } from '../../store/api/authApi'
import { reducer as ui } from '../../store/uiSlice'
import { RequireAuth } from '../RequireAuth'

function renderWith(fetchImpl: typeof fetch) {
  vi.stubGlobal('fetch', fetchImpl)
  const store = configureStore({
    reducer: { ui, [authApi.reducerPath]: authApi.reducer },
    middleware: (d) => d().concat(authApi.middleware),
  })
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>dashboard</p>} />
          </Route>
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

const ok = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        id: 'u1',
        email: 'a@b.c',
        name: 'A',
        picture: null,
        authMode: 'sso',
        devBypass: false,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  )
const unauthorised = () =>
  Promise.resolve(
    new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } }),
  )
const pending = () => new Promise<Response>(() => {})

describe('RequireAuth', () => {
  it('shows a bare spinner while the session is unknown', () => {
    renderWith(pending as unknown as typeof fetch)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveAccessibleName(/checking your session/i)
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })

  it('renders the protected route once authenticated', async () => {
    renderWith(ok as unknown as typeof fetch)
    expect(await screen.findByText('dashboard')).toBeInTheDocument()
  })

  it('redirects to /login on 401', async () => {
    renderWith(unauthorised as unknown as typeof fetch)
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })
})
