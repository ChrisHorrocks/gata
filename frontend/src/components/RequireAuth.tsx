import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'

import { fetchSession } from '@/api/session'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    retry: false,
  })

  if (sessionQuery.isPending) {
    return (
      <p className="p-6 text-sm text-muted-foreground" role="status">
        Checking sign-in…
      </p>
    )
  }

  if (sessionQuery.isError) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}