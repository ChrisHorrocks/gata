import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { fetchSession, logout } from '@/api/session'
import { Button } from '@/components/ui/button'

type AppShellProps = {
  children: ReactNode
  layout?: 'default' | 'wide'
}

export function AppShell({ children, layout = 'default' }: AppShellProps) {
  const shellWidth = layout === 'wide' ? 'max-w-6xl' : 'max-w-2xl'
  const navigate = useNavigate()
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
  })

  const user = sessionQuery.data?.user
  const shellLabel =
    user?.display_name?.trim() || user?.email || (sessionQuery.isPending ? '…' : '')

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className={`mx-auto flex ${shellWidth} items-center justify-between gap-4 p-4`}>
          <p className="text-sm">
            Signed in as{' '}
            <Link to="/profile" className="font-medium underline-offset-4 hover:underline">
              {shellLabel}
            </Link>
          </p>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/trips" className="text-muted-foreground hover:text-foreground">
              Trips
            </Link>
            <Link to="/gear" className="text-muted-foreground hover:text-foreground">
              Gear
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout()
                navigate('/sign-in', { replace: true })
              }}
            >
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <div className={`mx-auto ${shellWidth} p-6`}>{children}</div>
    </div>
  )
}