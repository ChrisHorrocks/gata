import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import { logout } from '@/api/session'
import { fetchTrips } from '@/api/trips'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TripsScreen() {
  const navigate = useNavigate()
  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Your trips</CardTitle>
          <Button type="button" asChild>
            <Link to="/trips/new">New trip</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tripsQuery.isPending && (
            <p className="text-sm text-muted-foreground" role="status">
              Loading trips…
            </p>
          )}
          {tripsQuery.isError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load trips.
            </p>
          )}
          {tripsQuery.isSuccess && tripsQuery.data.trips.length === 0 && (
            <p className="text-sm text-muted-foreground">No trips yet. Create one to start planning.</p>
          )}
          {tripsQuery.isSuccess && tripsQuery.data.trips.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {tripsQuery.data.trips.map((trip) => (
                <li key={trip.id}>
                  <Link
                    to={`/trips/${trip.id}/settings`}
                    className="flex flex-col gap-0.5 px-3 py-3 hover:bg-muted"
                  >
                    <span className="font-medium">{trip.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Starts {trip.start_date}
                      {trip.role === 'organiser' ? ' · Organiser' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
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