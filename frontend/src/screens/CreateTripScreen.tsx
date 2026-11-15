import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { createTrip } from '@/api/trips'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CreateTripScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [nameInvalid, setNameInvalid] = useState(false)
  const [dateInvalid, setDateInvalid] = useState(false)

  const createMutation = useMutation({
    mutationFn: () => createTrip({ name: name.trim(), start_date: startDate }),
    onSuccess: async (trip) => {
      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      navigate(`/trips/${trip.id}/settings`, { replace: true })
    },
  })

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>New trip</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const trimmed = name.trim()
              const badName = trimmed.length === 0
              const badDate = startDate.length === 0
              setNameInvalid(badName)
              setDateInvalid(badDate)
              if (badName || badDate) {
                return
              }
              createMutation.mutate()
            }}
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="trip-name">
                Trip name
              </label>
              <input
                id="trip-name"
                name="name"
                type="text"
                required
                autoComplete="off"
                aria-invalid={nameInvalid || undefined}
                aria-describedby={nameInvalid ? 'trip-name-error' : undefined}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm user-invalid:border-destructive"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameInvalid(false)
                }}
              />
              {nameInvalid && (
                <p id="trip-name-error" className="text-sm text-destructive" role="alert">
                  Enter a trip name.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="trip-start">
                Start date
              </label>
              <input
                id="trip-start"
                name="start_date"
                type="date"
                required
                aria-invalid={dateInvalid || undefined}
                aria-describedby={dateInvalid ? 'trip-start-error' : undefined}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm user-invalid:border-destructive"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  setDateInvalid(false)
                }}
              />
              {dateInvalid && (
                <p id="trip-start-error" className="text-sm text-destructive" role="alert">
                  Choose a start date.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create trip'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/trips">Cancel</Link>
              </Button>
            </div>
            {createMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                Could not create the trip. Try again.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </AppShell>
  )
}