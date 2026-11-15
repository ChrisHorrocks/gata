import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { deleteTrip, fetchTrip, patchTrip, type Trip } from '@/api/trips'
import { AppShell } from '@/components/AppShell'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { VersionConflictDialog } from '@/components/VersionConflictDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentFromConflict, isVersionConflict } from '@/lib/versionConflict'

function formFromTrip(trip: Trip) {
  return {
    name: trip.name,
    startDate: trip.start_date,
    emergencyNotes: trip.emergency_notes ?? '',
    version: trip.version,
    role: trip.role,
  }
}

type TripSettingsFormProps = {
  trip: Trip
  tripId: string
  onTripReplaced: (trip: Trip) => void
}

function TripSettingsForm({ trip, tripId, onTripReplaced }: TripSettingsFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => formFromTrip(trip))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showConflict, setShowConflict] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () =>
      patchTrip(tripId, {
        version: form.version,
        name: form.name.trim(),
        start_date: form.startDate,
        emergency_notes: form.emergencyNotes.trim() || null,
      }),
    onSuccess: async (next) => {
      setForm(formFromTrip(next))
      onTripReplaced(next)
      await queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        setShowConflict(true)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteTrip(tripId, form.version),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      navigate('/trips', { replace: true })
    },
    onError: (error) => {
      setShowDeleteConfirm(false)
      if (isVersionConflict(error)) {
        setShowConflict(true)
      }
    },
  })

  const reloadFromServer = () => {
    const conflict = saveMutation.error ?? deleteMutation.error
    if (conflict && isVersionConflict(conflict)) {
      const current = currentFromConflict(conflict)
      setForm(formFromTrip(current))
      onTripReplaced(current)
    }
    setShowConflict(false)
    saveMutation.reset()
    deleteMutation.reset()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Trip settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              saveMutation.mutate()
            }}
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="settings-name">
                Trip name
              </label>
              <input
                id="settings-name"
                name="name"
                type="text"
                required
                autoComplete="off"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="settings-start">
                Start date
              </label>
              <input
                id="settings-start"
                name="start_date"
                type="date"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium" htmlFor="settings-notes">
                Emergency notes
                <span className="font-normal text-muted-foreground"> (optional)</span>
              </label>
              <textarea
                id="settings-notes"
                name="emergency_notes"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.emergencyNotes}
                onChange={(event) => setForm({ ...form, emergencyNotes: event.target.value })}
              />
            </div>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {saveMutation.isError && !isVersionConflict(saveMutation.error) && (
              <p role="alert" className="text-sm text-destructive">
                Could not save. Try again.
              </p>
            )}
          </form>

          {form.role === 'organiser' && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-sm font-medium">Danger zone</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Delete this trip and all of its data. This cannot be undone.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete trip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this trip?"
        description="The trip and everything in it will be removed permanently."
        confirmLabel="Delete trip"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <VersionConflictDialog
        open={showConflict}
        onReload={reloadFromServer}
        onDismiss={() => setShowConflict(false)}
      />
    </>
  )
}

export function TripSettingsScreen() {
  const { tripId } = useParams<{ tripId: string }>()
  const queryClient = useQueryClient()
  const [formKey, setFormKey] = useState(0)

  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTrip(tripId!),
    enabled: Boolean(tripId),
  })

  if (!tripId) {
    return null
  }

  if (tripQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground" role="status">
          Loading trip…
        </p>
      </AppShell>
    )
  }

  if (tripQuery.isError) {
    return (
      <AppShell>
        <p role="alert" className="text-sm text-destructive">
          Trip not found.
        </p>
        <Button type="button" variant="outline" className="mt-4" asChild>
          <Link to="/trips">Back to trips</Link>
        </Button>
      </AppShell>
    )
  }

  const trip = tripQuery.data

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <TripSettingsForm
          key={`${trip.id}-${trip.version}-${formKey}`}
          trip={trip}
          tripId={tripId}
          onTripReplaced={(next) => {
            void queryClient.setQueryData(['trip', tripId], next)
            setFormKey((k) => k + 1)
          }}
        />

        <Button type="button" variant="outline" asChild>
          <Link to="/trips">Back to trips</Link>
        </Button>
      </div>
    </AppShell>
  )
}