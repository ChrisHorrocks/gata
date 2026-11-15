import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'

import { consumeMagicLink, inspectMagicLink } from '@/api/magicLinks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MagicLinkConfirmScreen() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const queryClient = useQueryClient()

  const inspectQuery = useQuery({
    queryKey: ['magic-link', 'inspect', token],
    queryFn: () => inspectMagicLink(token),
    enabled: token.length > 0,
    retry: false,
  })

  const consumeMutation = useMutation({
    mutationFn: () => consumeMagicLink(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  if (!token) {
    return (
      <main className="p-6">
        <p role="alert">This sign-in link is missing its token.</p>
        <Link className="text-sm underline" to="/sign-in">
          Request a new link
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign in as …?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {inspectQuery.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              Checking link…
            </p>
          )}
          {inspectQuery.isError && (
            <p role="alert" className="text-sm text-destructive">
              This link is invalid or has expired.
            </p>
          )}
          {inspectQuery.isSuccess && (
            <>
              <p className="text-sm">
                Sign in as <strong>{inspectQuery.data.email}</strong>?
              </p>
              <Button
                type="button"
                disabled={consumeMutation.isPending || consumeMutation.isSuccess}
                onClick={() => consumeMutation.mutate()}
              >
                {consumeMutation.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </>
          )}
          {consumeMutation.isSuccess && (
            <p role="status" className="text-sm">
              Signed in. You can close this tab or{' '}
              <Link className="underline" to="/trips">
                open your trips
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}