import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { fetchHealth } from '@/api/health'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function HealthScreen() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>gata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Walking skeleton: SPA → Vite proxy → API → Postgres.
          </p>
          {healthQuery.isPending && <p role="status">Checking health…</p>}
          {healthQuery.isError && (
            <p role="alert">Could not reach the API.</p>
          )}
          {healthQuery.isSuccess && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">status</dt>
              <dd>{healthQuery.data.status}</dd>
              <dt className="text-muted-foreground">database</dt>
              <dd>{healthQuery.data.database}</dd>
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void healthQuery.refetch()}
            >
              Refresh
            </Button>
            <Button asChild>
              <Link to="/map">Open map</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}