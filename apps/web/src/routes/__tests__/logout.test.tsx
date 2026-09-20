import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { authApi, useLogoutMutation } from '../../store/api/authApi'
import { reducer as ui } from '../../store/uiSlice'
import { LoginRoute } from '../LoginRoute'
import { RequireAuth } from '../RequireAuth'

const me = {
  id: 'u1',
  email: 'a@b.c',
  name: 'A',
  picture: null,
  authMode: 'sso',
  devBypass: false,
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function Dashboard() {
  const [logout] = useLogoutMutation()
  return (
    <button type="button" onClick={() => logout()}>
      Sign out
    </button>
  )
}

function renderApp() {
  let signedIn = true
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    const method = input instanceof Request ? input.method : (init?.method ?? 'GET')
    if (url.endsWith('/auth/logout') && method === 'POST') {
      signedIn = false
      return Promise.resolve(json({ ok: true }, 200))
    }
    return Promise.resolve(signedIn ? json(me, 200) : json({ error: 'unauthenticated' }, 401))
  })

  const store = configureStore({
    reducer: { ui, [authApi.reducerPath]: authApi.reducer },
    middleware: (d) => d().concat(authApi.middleware),
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Dashboard />} />
          </Route>
          <Route path="/login" element={<LoginRoute />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('signing out', () => {
  it('lands on the sign-in page instead of looping to a blank screen', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: /sign out/i }))

    // Before the fix this looped between / and /login, rendering nothing.
    expect(await screen.findByRole('link', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })
})
