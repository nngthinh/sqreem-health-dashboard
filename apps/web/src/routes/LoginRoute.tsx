import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { notify } from '../lib/notify'
import { useDemoLoginMutation, useDevLoginMutation, useGetMeQuery } from '../store/api/authApi'

export function LoginRoute() {
  const { data: me } = useGetMeQuery()
  const [devLogin] = useDevLoginMutation()
  const [demoLogin] = useDemoLoginMutation()
  const [code, setCode] = useState('')
  const location = useLocation() as { state?: { from?: string } }

  if (me) return <Navigate to={location.state?.from ?? '/'} replace />

  const isDemo = import.meta.env.VITE_AUTH_HINT === 'demo'

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface-raised p-6">
        <p className="mb-1 text-lg font-semibold">◈ Vitals</p>
        <p className="mb-6 text-sm text-ink-muted">Your health data, answered.</p>

        {isDemo ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const res = await demoLogin({ code })
              if ('error' in res) notify.error('That access code is not right.')
            }}
          >
            <label className="block text-sm" htmlFor="code">
              Access code
            </label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
            />
            <button type="submit" className="mt-4 w-full rounded-md bg-ink px-3 py-2 text-surface">
              Continue
            </button>
          </form>
        ) : (
          <a
            href="/api/auth/login"
            className="block w-full rounded-md bg-ink px-3 py-2 text-center text-surface"
          >
            Continue with Google
          </a>
        )}

        {/* The dev bypass is shown in the UI rather than left an invisible state. */}
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => devLogin()}
            className="mt-3 w-full rounded-md border border-line px-3 py-2 text-sm text-ink-muted"
          >
            Continue as dev user
          </button>
        )}
      </div>
    </main>
  )
}
