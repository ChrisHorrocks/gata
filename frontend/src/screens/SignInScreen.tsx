import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { requestMagicLink } from '@/api/magicLinks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SignInScreen() {
  const [email, setEmail] = useState('')
  const requestMutation = useMutation({
    mutationFn: (address: string) => requestMagicLink(address),
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to gata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We will email you a one-time sign-in link. No password.
          </p>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              requestMutation.mutate(email)
            }}
          >
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" disabled={requestMutation.isPending}>
              {requestMutation.isPending ? 'Sending…' : 'Email me a link'}
            </Button>
          </form>
          {requestMutation.isSuccess && (
            <p role="status" className="text-sm">
              {requestMutation.data.message}
            </p>
          )}
          {requestMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              Something went wrong. Try again.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}