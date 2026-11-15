import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'

import {
  createDay,
  deleteDay,
  fetchDays,
  patchDay,
  reorderDays,
  type Day,
  type DayKind,
  type DayListResponse,
} from '@/api/days'
import { fetchTrip } from '@/api/trips'
import { AppShell } from '@/components/AppShell'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { VersionConflictDialog } from '@/components/VersionConflictDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/api/client'
import { isVersionConflict } from '@/lib/versionConflict'

type RowDraft = {
  kind: DayKind
  distanceKm: string
  ascentM: string
  descentM: string
  version: number
}

function rowFromDay(day: Day): RowDraft {
  return {
    kind: day.kind,
    distanceKm: day.distance_km ?? '',
    ascentM: day.ascent_m === null ? '' : String(day.ascent_m),
    descentM: day.descent_m === null ? '' : String(day.descent_m),
    version: day.version,
  }
}

function formatDistance(total: string): string {
  return `${Number.parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })} km`
}

function parseNonNegativeDecimal(value: string): string | null {
  if (value.trim() === '') {
    return '0'
  }
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return String(parsed)
}

function parseNonNegativeInt(value: string): number | null {
  if (value.trim() === '') {
    return 0
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

type DayRowProps = {
  day: Day
  draft: RowDraft
  tripId: string
  index: number
  dayCount: number
  pending: boolean
  onDraftChange: (next: RowDraft) => void
  onSaved: (dayId: string) => void
  onDeleted: () => void
  onReordered: (list: DayListResponse) => void
  onConflict: (error: unknown) => void
}

function DayRow({
  day,
  draft,
  tripId,
  index,
  dayCount,
  pending,
  onDraftChange,
  onSaved,
  onDeleted,
  onReordered,
  onConflict,
}: DayRowProps) {
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (draft.kind === 'rest') {
        return patchDay(tripId, day.id, { version: draft.version, kind: 'rest' })
      }
      const distance = parseNonNegativeDecimal(draft.distanceKm)
      const ascent = parseNonNegativeInt(draft.ascentM)
      const descent =
        draft.descentM.trim() === '' ? null : parseNonNegativeInt(draft.descentM)
      if (distance === null || ascent === null || (draft.descentM.trim() !== '' && descent === null)) {
        throw new Error('invalid')
      }
      return patchDay(tripId, day.id, {
        version: draft.version,
        kind: 'walking',
        distance_km: distance,
        ascent_m: ascent,
        descent_m: descent,
      })
    },
    onSuccess: async (saved) => {
      setFieldError(null)
      onSaved(saved.id)
      await queryClient.invalidateQueries({ queryKey: ['days', tripId] })
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'invalid') {
        setFieldError('Distance and ascent must be zero or more.')
        return
      }
      if (isVersionConflict(error)) {
        onConflict(error)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteDay(tripId, day.id, draft.version),
    onSuccess: async () => {
      setShowDelete(false)
      onDeleted()
      await queryClient.invalidateQueries({ queryKey: ['days', tripId] })
    },
    onError: (error) => {
      setShowDelete(false)
      if (isVersionConflict(error)) {
        onConflict(error)
      }
    },
  })

  const moveMutation = useMutation({
    mutationFn: async (direction: -1 | 1) => {
      const list = queryClient.getQueryData<DayListResponse>(['days', tripId])
      if (!list) {
        throw new Error('missing list')
      }
      const target = index + direction
      if (target < 0 || target >= list.days.length) {
        return list
      }
      const order = [...list.days]
      const [moved] = order.splice(index, 1)
      order.splice(target, 0, moved)
      return reorderDays(
        tripId,
        order.map((entry) => ({ id: entry.id, version: entry.version })),
      )
    },
    onSuccess: (list) => {
      if (list) {
        onReordered(list)
        queryClient.setQueryData(['days', tripId], list)
      }
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        onConflict(error)
      }
    },
  })

  const metricsDisabled = draft.kind === 'rest'
  const errorId = fieldError ? `day-${day.id}-error` : undefined

  return (
    <>
      <tr className="border-b border-border align-top">
        <th scope="row" className="px-2 py-3 text-left font-medium sm:px-3">
          <span className="block text-xs text-muted-foreground">Day {index + 1}</span>
          <time dateTime={day.date}>{day.date}</time>
        </th>
        <td className="px-2 py-3 sm:px-3">
          <label className="sr-only" htmlFor={`kind-${day.id}`}>
            Day type
          </label>
          <select
            id={`kind-${day.id}`}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={draft.kind}
            onChange={(event) => {
              const kind = event.target.value as DayKind
              onDraftChange({
                ...draft,
                kind,
                ...(kind === 'rest'
                  ? { distanceKm: '', ascentM: '', descentM: '' }
                  : {
                      distanceKm: draft.distanceKm || '0',
                      ascentM: draft.ascentM || '0',
                    }),
              })
              setFieldError(null)
            }}
          >
            <option value="walking">Walking</option>
            <option value="rest">Rest</option>
          </select>
        </td>
        <td className="hidden px-2 py-3 sm:table-cell sm:px-3">
          <label className="sr-only" htmlFor={`distance-${day.id}`}>
            Distance (km)
          </label>
          <input
            id={`distance-${day.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            disabled={metricsDisabled}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm user-invalid:border-destructive disabled:opacity-50"
            value={metricsDisabled ? '' : draft.distanceKm}
            onChange={(event) => {
              onDraftChange({ ...draft, distanceKm: event.target.value })
              setFieldError(null)
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={errorId}
          />
        </td>
        <td className="hidden px-2 py-3 md:table-cell md:px-3">
          <label className="sr-only" htmlFor={`ascent-${day.id}`}>
            Ascent (m)
          </label>
          <input
            id={`ascent-${day.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            disabled={metricsDisabled}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm user-invalid:border-destructive disabled:opacity-50"
            value={metricsDisabled ? '' : draft.ascentM}
            onChange={(event) => {
              onDraftChange({ ...draft, ascentM: event.target.value })
              setFieldError(null)
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={errorId}
          />
        </td>
        <td className="hidden px-2 py-3 lg:table-cell lg:px-3">
          <label className="sr-only" htmlFor={`descent-${day.id}`}>
            Descent (m, optional)
          </label>
          <input
            id={`descent-${day.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            disabled={metricsDisabled}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm user-invalid:border-destructive disabled:opacity-50"
            value={metricsDisabled ? '' : draft.descentM}
            onChange={(event) => {
              onDraftChange({ ...draft, descentM: event.target.value })
              setFieldError(null)
            }}
          />
        </td>
        <td className="px-2 py-3 sm:px-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              disabled={pending || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save
            </Button>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={index === 0 || moveMutation.isPending}
                onClick={() => moveMutation.mutate(-1)}
                aria-label={`Move day ${index + 1} up`}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={index >= dayCount - 1 || moveMutation.isPending}
                onClick={() => moveMutation.mutate(1)}
                aria-label={`Move day ${index + 1} down`}
              >
                ↓
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => setShowDelete(true)}
            >
              Delete
            </Button>
          </div>
          <h4 className="mt-2 text-xs font-medium text-muted-foreground sm:hidden">Walking stats</h4>
          <div className="mt-1 grid gap-2 sm:hidden">
            <input
              aria-label={`Distance in km for day ${index + 1}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={metricsDisabled}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm disabled:opacity-50"
              value={metricsDisabled ? '' : draft.distanceKm}
              onChange={(event) => onDraftChange({ ...draft, distanceKm: event.target.value })}
            />
            <input
              aria-label={`Ascent in metres for day ${index + 1}`}
              type="number"
              inputMode="numeric"
              min={0}
              disabled={metricsDisabled}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm disabled:opacity-50"
              value={metricsDisabled ? '' : draft.ascentM}
              onChange={(event) => onDraftChange({ ...draft, ascentM: event.target.value })}
            />
          </div>
          {fieldError && (
            <p id={errorId} className="mt-2 text-sm text-destructive" role="alert">
              {fieldError}
            </p>
          )}
        </td>
      </tr>
      {showDelete &&
        createPortal(
          <ConfirmDialog
            open={showDelete}
            title="Delete this day?"
            description="This removes the day from the itinerary. Other days will move up."
            confirmLabel="Delete day"
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDelete(false)}
          />,
          document.body,
        )}
    </>
  )
}

export function ItineraryScreen() {
  const { tripId = '' } = useParams()
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})
  const [showConflict, setShowConflict] = useState(false)
  const [conflictError, setConflictError] = useState<ApiError | null>(null)

  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: tripId.length > 0,
  })

  const daysQuery = useQuery({
    queryKey: ['days', tripId],
    queryFn: () => fetchDays(tripId),
    enabled: tripId.length > 0,
  })

  const clearDraft = useCallback((dayId: string) => {
    setDrafts((previous) => {
      if (!(dayId in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[dayId]
      return next
    })
  }, [])

  const applyList = useCallback(
    (list: DayListResponse) => {
      queryClient.setQueryData(['days', tripId], list)
      setDrafts({})
    },
    [queryClient, tripId],
  )

  const addMutation = useMutation({
    mutationFn: async (kind: DayKind) => createDay(tripId, { kind }),
    onSuccess: async () => {
      await daysQuery.refetch()
    },
  })

  const handleConflict = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      setConflictError(error)
    }
    setShowConflict(true)
  }, [])

  const reloadFromServer = async () => {
    setShowConflict(false)
    const error = conflictError
    setConflictError(null)
    if (error?.body && typeof error.body === 'object' && error.body !== null) {
      const detail = (error.body as { detail?: { current?: DayListResponse | Day } }).detail
      const current = detail?.current
      if (current && 'days' in current) {
        applyList(current)
        return
      }
    }
    setDrafts({})
    await daysQuery.refetch()
  }

  const pending = addMutation.isPending

  return (
    <AppShell layout="wide">
      <Card className="mb-4">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{tripQuery.data?.name ?? 'Itinerary'}</CardTitle>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/trips/${tripId}/settings`}>Trip settings</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(tripQuery.isError || daysQuery.isError) && (
            <p role="alert" className="text-sm text-destructive">
              Could not load this trip.
            </p>
          )}
          {(tripQuery.isPending || daysQuery.isPending) && (
            <p className="text-sm text-muted-foreground" role="status">
              Loading itinerary…
            </p>
          )}
          {tripQuery.isSuccess && daysQuery.isSuccess && (
            <p className="text-sm font-medium" role="status">
              Trip totals: {formatDistance(daysQuery.data.total_distance_km)} ·{' '}
              {daysQuery.data.total_ascent_m.toLocaleString()} m ascent
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section
          aria-label="Trip map"
          className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
        >
          Map will sit here in a later ticket. Plan days in the list on the right.
        </section>

        <section aria-label="Itinerary days" className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => addMutation.mutate('walking')}
            >
              Add walking day
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => addMutation.mutate('rest')}
            >
              Add rest day
            </Button>
          </div>

          {daysQuery.isSuccess && daysQuery.data.days.length === 0 && (
            <p className="text-sm text-muted-foreground">No days yet. Add a walking or rest day.</p>
          )}

          {daysQuery.isSuccess && daysQuery.data.days.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2 font-medium">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Type
                    </th>
                    <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                      Distance (km)
                    </th>
                    <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">
                      Ascent (m)
                    </th>
                    <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">
                      Descent (m)
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="motion-safe:transition-[transform] motion-reduce:transition-none">
                  {daysQuery.data.days.map((day, index) => {
                    const draft = drafts[day.id] ?? rowFromDay(day)
                    return (
                      <DayRow
                        key={day.id}
                        day={day}
                        draft={draft}
                        tripId={tripId}
                        index={index}
                        dayCount={daysQuery.data.days.length}
                        pending={pending}
                        onDraftChange={(next) =>
                          setDrafts((previous) => ({ ...previous, [day.id]: next }))
                        }
                        onSaved={clearDraft}
                        onDeleted={() => clearDraft(day.id)}
                        onReordered={applyList}
                        onConflict={handleConflict}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <VersionConflictDialog
        open={showConflict}
        onReload={() => {
          void reloadFromServer()
        }}
        onDismiss={() => setShowConflict(false)}
      />
    </AppShell>
  )
}