import { useQuery } from '@tanstack/react-query'

import { fetchSession, logout } from '@/api/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

export function TripsScreen() {
  const navigate = useNavigate()
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Your trips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Trip list ships in a later ticket. You are signed in.
          </p>
          {sessionQuery.isSuccess && (
            <p className="text-sm">
              Signed in as <strong>{sessionQuery.data.user.email}</strong>
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await logout()
              navigate('/sign-in', { replace: true })
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}