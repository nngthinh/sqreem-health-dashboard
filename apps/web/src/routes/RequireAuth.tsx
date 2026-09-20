import { Navigate, Outlet, useLocation } from 'react-router'
import { useGetMeQuery } from '../store/api/authApi'

export function RequireAuth() {
  const { data, isLoading, isError } = useGetMeQuery()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-ink-muted">
        Checking your session…
      </div>
    )
  }
  if (isError || !data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
